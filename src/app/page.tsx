"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { usePins, useItinerary } from "@/lib/queries";
import { supabaseConfigured } from "@/lib/supabase";
import type { Category } from "@/lib/constants";
import CategoryChips from "@/components/pins/CategoryChips";

const ThailandMap = dynamic(() => import("@/components/map/ThailandMap"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full items-center justify-center">
      <p className="font-hand animate-wobble text-3xl text-ink-soft">unfolding the map...</p>
    </div>
  ),
});

export default function MapPage() {
  const { data: pins = [] } = usePins();
  const { data: itinerary = [] } = useItinerary();
  const [activeCategories, setActiveCategories] = useState<Category[] | null>(null);
  const [stampedOnly, setStampedOnly] = useState(false);

  return (
    <main className="relative h-dvh w-full overflow-hidden" style={{ touchAction: "none" }}>
      <ThailandMap
        pins={pins}
        itinerary={itinerary}
        activeCategories={activeCategories}
        stampedOnly={stampedOnly}
      />

      {/* Floating header */}
      <div className="pointer-events-none absolute inset-x-0 top-0 z-10 pt-[env(safe-area-inset-top)]">
        <div className="flex items-start justify-between px-4 pt-3">
          <h1 className="font-display text-2xl font-black leading-none drop-shadow-[0_1px_0_rgba(250,243,227,0.9)]">
            THAILAND<span className="align-super text-sm text-chili">&rsquo;26</span>
          </h1>
          <button
            onClick={() => setStampedOnly((v) => !v)}
            className={`pointer-events-auto stamp px-3 py-1 text-[11px] transition-all active:scale-90 ${
              stampedOnly ? "bg-chili/10 opacity-100" : "bg-paper/80 opacity-60"
            }`}
          >
            The Plan
          </button>
        </div>
        <div className="pointer-events-auto mt-2">
          <CategoryChips value={activeCategories} onChange={setActiveCategories} />
        </div>
      </div>

      {!supabaseConfigured && (
        <div className="absolute inset-x-4 bottom-28 z-10 rounded-2xl border-2 border-chili/40 bg-paper p-4 shadow-lifted">
          <p className="font-display font-bold">Supabase not wired up yet</p>
          <p className="mt-1 text-sm text-ink-soft">
            Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY to .env.local,
            then run supabase/schema.sql and seed.sql. See README.md.
          </p>
        </div>
      )}

      {supabaseConfigured && pins.length === 0 && (
        <div className="pointer-events-none absolute inset-x-0 bottom-32 z-10 flex justify-center">
          <p className="font-hand rotate-[-2deg] rounded-xl bg-paper/90 px-4 py-2 text-xl text-ink-soft shadow-paper">
            empty map, full potential. hit the + and pin the first idea 👇
          </p>
        </div>
      )}
    </main>
  );
}
