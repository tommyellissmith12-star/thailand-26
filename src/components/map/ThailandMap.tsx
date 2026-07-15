"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import MapGL, { Layer, Source, Marker, type MapRef } from "react-map-gl/maplibre";
import type { FeatureCollection } from "geojson";
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
  stampedOnly: boolean;
}

export default function ThailandMap({ pins, itinerary, activeCategories, stampedOnly }: Props) {
  const mapRef = useRef<MapRef>(null);
  const [zoom, setZoom] = useState(5.4);
  const selectPin = useUiStore((s) => s.selectPin);
  const flyTo = useUiStore((s) => s.flyTo);
  const setFlyTo = useUiStore((s) => s.setFlyTo);

  const visible = useMemo(
    () =>
      pins.filter((p) => {
        if (stampedOnly && p.status !== "stamped") return false;
        if (activeCategories && !activeCategories.includes(p.category)) return false;
        return true;
      }),
    [pins, activeCategories, stampedOnly],
  );

  // Half-zoom steps keep clusters from re-shuffling on every scroll tick.
  const clusters = useMemo(
    () => clusterPins(visible, Math.round(zoom * 2) / 2),
    [visible, zoom],
  );

  // The roadtrip line: stamped pins, ordered by itinerary day where assigned,
  // then by creation date for the rest.
  const route = useMemo<FeatureCollection>(() => {
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
    return {
      type: "FeatureCollection",
      features:
        ordered.length >= 2
          ? [
              {
                type: "Feature",
                properties: {},
                geometry: {
                  type: "LineString",
                  coordinates: ordered.map((p) => [p.lng, p.lat]),
                },
              },
            ]
          : [],
    };
  }, [pins, itinerary]);

  // "View on map" from other tabs.
  useEffect(() => {
    if (flyTo && mapRef.current) {
      mapRef.current.flyTo({ center: [flyTo.lng, flyTo.lat], zoom: 10, duration: 1400 });
      setFlyTo(null);
    }
  }, [flyTo, setFlyTo]);

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
    </MapGL>
  );
}
