"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import MapGL, { Layer, Source, Marker, type MapRef } from "react-map-gl/maplibre";
import type { FeatureCollection } from "geojson";
import { Play, Square } from "lucide-react";
import { THAILAND_BOUNDS, THAILAND_CENTER, type Category } from "@/lib/constants";
import { clusterPins } from "@/lib/cluster";
import { useUiStore } from "@/lib/ui-store";
import type { Pin } from "@/lib/types";
import type { ItineraryItem } from "@/lib/types";
import PinMarker, { ClusterMarker } from "./PinMarker";

interface Props {
  pins: Pin[];
  itinerary: ItineraryItem[];
  activeCategories: Category[] | null; // null = all
}

export default function ThailandMap({ pins, itinerary, activeCategories }: Props) {
  const mapRef = useRef<MapRef>(null);
  const [zoom, setZoom] = useState(5.4);
  const [mapReady, setMapReady] = useState(false);
  const selectPin = useUiStore((s) => s.selectPin);
  const flyTo = useUiStore((s) => s.flyTo);
  const setFlyTo = useUiStore((s) => s.setFlyTo);

  // Route tour animation state
  const [touring, setTouring] = useState(false);
  const [tourPos, setTourPos] = useState<[number, number] | null>(null);
  const tourFrame = useRef<number>(0);

  const visible = useMemo(
    () =>
      pins.filter((p) => {
        if (activeCategories && !activeCategories.includes(p.category)) return false;
        return true;
      }),
    [pins, activeCategories],
  );

  // Half-zoom steps keep clusters from re-shuffling on every scroll tick.
  const clusters = useMemo(
    () => clusterPins(visible, Math.round(zoom * 2) / 2),
    [visible, zoom],
  );

  // The roadtrip: stamped pins, ordered by itinerary day where assigned,
  // then by creation date for the rest.
  const routeStops = useMemo<[number, number][]>(() => {
    const stamped = pins.filter((p) => p.status === "stamped");
    const dayByPin = new Map<string, string>();
    for (const item of itinerary) {
      const existing = dayByPin.get(item.pin_id);
      if (!existing || item.day < existing) dayByPin.set(item.pin_id, item.day);
    }
    const ordered = [...stamped].sort((a, b) => {
      const da = dayByPin.get(a.id) ?? "9999" + a.created_at;
      const db = dayByPin.get(b.id) ?? "9999" + b.created_at;
      return da < db ? -1 : da > db ? 1 : 0;
    });
    return ordered.map((p) => [p.lng, p.lat]);
  }, [pins, itinerary]);

  const route = useMemo<FeatureCollection>(
    () => ({
      type: "FeatureCollection",
      features:
        routeStops.length >= 2
          ? [
              {
                type: "Feature",
                properties: {},
                geometry: { type: "LineString", coordinates: routeStops },
              },
            ]
          : [],
    }),
    [routeStops],
  );

  // "View on map" from other tabs; waits for the map to actually exist,
  // which is what used to eat fly-tos triggered from the feed.
  useEffect(() => {
    if (flyTo && mapReady && mapRef.current) {
      mapRef.current.flyTo({ center: [flyTo.lng, flyTo.lat], zoom: 10, duration: 1400 });
      setFlyTo(null);
    }
  }, [flyTo, mapReady, setFlyTo]);

  function stopTour() {
    cancelAnimationFrame(tourFrame.current);
    setTouring(false);
    setTourPos(null);
    if (routeStops.length >= 2 && mapRef.current) {
      const lngs = routeStops.map((c) => c[0]);
      const lats = routeStops.map((c) => c[1]);
      mapRef.current.fitBounds(
        [
          [Math.min(...lngs), Math.min(...lats)],
          [Math.max(...lngs), Math.max(...lats)],
        ],
        { padding: 70, duration: 1200 },
      );
    }
  }

  // Drive the little scooter along the route, camera in tow.
  function startTour() {
    const map = mapRef.current;
    if (!map || routeStops.length < 2) return;
    setTouring(true);

    // Segment lengths decide pacing; short hops stay watchable.
    const segs: { from: [number, number]; to: [number, number]; ms: number }[] = [];
    for (let i = 0; i < routeStops.length - 1; i++) {
      const [x1, y1] = routeStops[i];
      const [x2, y2] = routeStops[i + 1];
      const dist = Math.hypot(x2 - x1, y2 - y1);
      segs.push({ from: routeStops[i], to: routeStops[i + 1], ms: Math.max(1400, Math.min(dist * 900, 4000)) });
    }

    map.flyTo({ center: routeStops[0], zoom: 7.2, duration: 1100 });

    const startAt = performance.now() + 1300;
    let segIndex = 0;
    let segStart = startAt;

    const tick = (now: number) => {
      if (now < startAt) {
        tourFrame.current = requestAnimationFrame(tick);
        return;
      }
      const seg = segs[segIndex];
      const t = Math.min((now - segStart) / seg.ms, 1);
      // ease in-out so the scooter slows into each stop
      const e = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
      const lng = seg.from[0] + (seg.to[0] - seg.from[0]) * e;
      const lat = seg.from[1] + (seg.to[1] - seg.from[1]) * e;
      setTourPos([lng, lat]);
      mapRef.current?.jumpTo({ center: [lng, lat] });
      if (t >= 1) {
        segIndex++;
        segStart = now + 350; // breathe at each stop
        if (segIndex >= segs.length) {
          setTimeout(stopTour, 600);
          return;
        }
      }
      tourFrame.current = requestAnimationFrame(tick);
    };
    tourFrame.current = requestAnimationFrame(tick);
  }

  useEffect(() => () => cancelAnimationFrame(tourFrame.current), []);

  return (
    <MapGL
      ref={mapRef}
      initialViewState={{ longitude: THAILAND_CENTER[0], latitude: THAILAND_CENTER[1], zoom: 5.4 }}
      mapStyle="/map-style.json"
      maxBounds={THAILAND_BOUNDS}
      minZoom={4.8}
      maxZoom={15}
      attributionControl={{ compact: true }}
      onZoom={(e) => setZoom(e.viewState.zoom)}
      onLoad={() => setMapReady(true)}
      style={{ width: "100%", height: "100%" }}
    >
      <Source id="route" type="geojson" data={route}>
        <Layer
          id="route-line"
          type="line"
          layout={{ "line-cap": "round", "line-join": "round" }}
          paint={{
            "line-color": "#c74a34",
            "line-width": 3,
            "line-dasharray": [0.2, 2.2],
            "line-opacity": 0.85,
          }}
        />
      </Source>

      {clusters.map((c) =>
        c.pins.length === 1 ? (
          <Marker key={c.key} longitude={c.lng} latitude={c.lat} anchor="center">
            <PinMarker pin={c.pins[0]} onTap={() => selectPin(c.pins[0].id)} />
          </Marker>
        ) : (
          <Marker key={c.key} longitude={c.lng} latitude={c.lat} anchor="center">
            <ClusterMarker
              count={c.pins.length}
              previewThumbs={c.pins
                .flatMap((p) => (p.pin_images[0]?.thumb_path ? [p.pin_images[0].thumb_path] : []))
                .slice(0, 2)}
              onTap={() =>
                mapRef.current?.flyTo({
                  center: [c.lng, c.lat],
                  zoom: Math.min(zoom + 2.2, 14),
                  duration: 800,
                })
              }
            />
          </Marker>
        ),
      )}

      {/* The tour scooter */}
      {tourPos && (
        <Marker longitude={tourPos[0]} latitude={tourPos[1]} anchor="center">
          <span className="block text-3xl drop-shadow-[0_2px_2px_rgba(60,42,10,0.4)]">🛵</span>
        </Marker>
      )}

      {/* Route tour control: appears once there's a route worth watching */}
      {routeStops.length >= 2 && (
        <button
          onClick={touring ? stopTour : startTour}
          aria-label={touring ? "Stop the tour" : "Ride the route"}
          className="absolute bottom-28 right-4 z-10 flex items-center gap-1.5 rounded-full border-2 border-chili bg-paper/90 px-3 py-2 font-display text-sm font-bold text-chili shadow-lifted active:scale-95"
        >
          {touring ? <Square size={14} /> : <Play size={14} />}
          {touring ? "Stop" : "Ride the route"}
        </button>
      )}
    </MapGL>
  );
}
