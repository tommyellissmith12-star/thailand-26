"use client";

import { CATEGORIES, isRejected } from "@/lib/constants";
import { publicImageUrl } from "@/lib/supabase";
import type { Pin } from "@/lib/types";

// Deterministic scrapbook tilt so markers don't jiggle between renders.
function tilt(id: string): number {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) | 0;
  return ((h % 13) - 6) * 0.9;
}

export default function PinMarker({ pin, onTap }: { pin: Pin; onTap: () => void }) {
  const cat = CATEGORIES[pin.category];
  const thumb = pin.pin_images[0]?.thumb_path ?? pin.pin_images[0]?.storage_path;
  const stamped = pin.status === "stamped";
  const rejected = isRejected(pin.status);

  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        onTap();
      }}
      aria-label={pin.title}
      className={`group relative block cursor-pointer transition-transform active:scale-90 ${
        rejected ? "grayscale opacity-55" : ""
      }`}
      style={{ transform: `rotate(${tilt(pin.id)}deg)` }}
    >
      {thumb ? (
        <span
          className="block h-12 w-12 overflow-hidden rounded-lg border-[3px] bg-paper shadow-paper"
          style={{ borderColor: cat.color }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={publicImageUrl(thumb)}
            alt=""
            className="h-full w-full object-cover"
            loading="lazy"
            draggable={false}
          />
        </span>
      ) : (
        <span
          className="flex h-11 w-11 items-center justify-center rounded-full border-[3px] bg-paper text-xl shadow-paper"
          style={{ borderColor: cat.color }}
        >
          {cat.emoji}
        </span>
      )}
      <span
        className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full text-[11px]"
        style={{ background: rejected ? "#6b705c" : cat.color }}
      >
        {rejected ? (pin.status === "torched" ? "🔥" : "💩") : thumb ? cat.emoji : ""}
      </span>
      {stamped && (
        <span className="stamp absolute -bottom-2 -left-2 bg-paper/85 px-1 text-[8px] leading-tight">
          IN!
        </span>
      )}
    </button>
  );
}

export function ClusterMarker({
  count,
  previewThumbs,
  onTap,
}: {
  count: number;
  previewThumbs: string[];
  onTap: () => void;
}) {
  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        onTap();
      }}
      aria-label={`${count} ideas here`}
      className="relative block cursor-pointer transition-transform active:scale-90"
    >
      {previewThumbs.slice(0, 2).map((t, i) => (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          key={t}
          src={publicImageUrl(t)}
          alt=""
          draggable={false}
          className="absolute h-11 w-11 rounded-lg border-2 border-paper object-cover shadow-paper"
          style={{ transform: `rotate(${i === 0 ? -8 : 7}deg) translate(${i * 6 - 4}px, ${i * -4}px)` }}
        />
      ))}
      <span className="relative flex h-11 w-11 items-center justify-center rounded-full border-[3px] border-chili bg-paper font-display text-base font-black text-chili shadow-lifted">
        {count}
      </span>
    </button>
  );
}
