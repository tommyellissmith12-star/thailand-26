"use client";

import { useRef, useState } from "react";
import Map, { type MapRef } from "react-map-gl/maplibre";
import { Search } from "lucide-react";
import { THAILAND_BOUNDS, THAILAND_CENTER } from "@/lib/constants";

interface Result {
  display_name: string;
  lat: string;
  lon: string;
}

export default function LocationPicker({
  onChange,
}: {
  onChange: (loc: { lng: number; lat: number }) => void;
}) {
  const mapRef = useRef<MapRef>(null);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Result[]>([]);
  const [searching, setSearching] = useState(false);

  async function search() {
    const q = query.trim();
    if (!q) return;
    setSearching(true);
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&countrycodes=th&limit=5&q=${encodeURIComponent(q)}`,
        { headers: { Accept: "application/json" } },
      );
      setResults(res.ok ? await res.json() : []);
    } catch {
      setResults([]);
    } finally {
      setSearching(false);
    }
  }

  function goTo(r: Result) {
    const lng = parseFloat(r.lon);
    const lat = parseFloat(r.lat);
    mapRef.current?.flyTo({ center: [lng, lat], zoom: 11, duration: 900 });
    onChange({ lng, lat });
    setResults([]);
    setQuery(r.display_name.split(",")[0]);
  }

  return (
    <div className="relative h-full w-full overflow-hidden rounded-2xl border-2 border-ink/15">
      <Map
        ref={mapRef}
        initialViewState={{ longitude: THAILAND_CENTER[0], latitude: THAILAND_CENTER[1], zoom: 5.2 }}
        mapStyle="/map-style.json"
        maxBounds={THAILAND_BOUNDS}
        minZoom={4.8}
        attributionControl={false}
        onMoveEnd={(e) =>
          onChange({ lng: e.viewState.longitude, lat: e.viewState.latitude })
        }
        style={{ width: "100%", height: "100%" }}
      />

      {/* Fixed crosshair pin: move the map under it */}
      <div className="pointer-events-none absolute left-1/2 top-1/2 z-10 -translate-x-1/2 -translate-y-full text-4xl drop-shadow-[0_3px_2px_rgba(60,42,10,0.35)]">
        📍
      </div>

      {/* Search */}
      <div className="absolute inset-x-3 top-3 z-10">
        <div className="flex gap-2">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), search())}
            placeholder="Chiang Mai, Koh Lanta, Pai..."
            className="flex-1 rounded-full border-2 border-ink/15 bg-paper px-4 py-2 text-sm shadow-paper outline-none focus:border-sea-deep"
          />
          <button
            onClick={search}
            disabled={searching}
            aria-label="Search"
            className="flex h-10 w-10 items-center justify-center rounded-full bg-sea-deep text-paper shadow-paper active:scale-90 disabled:opacity-50"
          >
            <Search size={17} />
          </button>
        </div>
        {results.length > 0 && (
          <ul className="mt-2 overflow-hidden rounded-xl border-2 border-ink/10 bg-paper shadow-lifted">
            {results.map((r, i) => (
              <li key={i}>
                <button
                  onClick={() => goTo(r)}
                  className="w-full truncate px-3 py-2.5 text-left text-sm active:bg-paper-deep"
                >
                  {r.display_name}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <p className="pointer-events-none absolute inset-x-0 bottom-3 z-10 text-center font-hand text-lg text-ink drop-shadow-[0_1px_0_rgba(250,243,227,1)]">
        drag the map until the pin sits on the spot
      </p>
    </div>
  );
}
