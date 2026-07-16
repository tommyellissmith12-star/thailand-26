"use client";

import { MessageCircle } from "lucide-react";
import { CATEGORIES, isRejected } from "@/lib/constants";
import { useMembersMap } from "@/lib/members";
import { publicImageUrl } from "@/lib/supabase";
import { useUiStore } from "@/lib/ui-store";
import type { Pin } from "@/lib/types";
import Avatar from "@/components/ui/Avatar";
import ReactionBar from "./ReactionBar";

export default function PinCard({
  pin,
  commentCount = 0,
  tiltIndex = 0,
}: {
  pin: Pin;
  commentCount?: number;
  tiltIndex?: number;
}) {
  const selectPin = useUiStore((s) => s.selectPin);
  const cat = CATEGORIES[pin.category];
  const author = useMembersMap().get(pin.created_by);
  const cover = pin.pin_images[0];
  const linkImage = pin.pin_links.find((l) => l.og_image)?.og_image;
  const rejected = isRejected(pin.status);
  const verdictLabel =
    pin.status === "torched" ? "🔥 torched" : pin.status === "shat" ? "💩 shat on" : null;

  return (
    <article
      onClick={() => selectPin(pin.id)}
      className="animate-rise cursor-pointer rounded-2xl bg-white p-3 shadow-paper transition-transform active:scale-[0.98]"
      style={{
        transform: `rotate(${tiltIndex % 2 === 0 ? -0.6 : 0.7}deg)`,
        animationDelay: `${Math.min(tiltIndex * 50, 400)}ms`,
      }}
    >
      {(cover || linkImage) && (
        <div className="relative -mx-1 -mt-1 mb-3 overflow-hidden rounded-xl">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={cover ? publicImageUrl(cover.storage_path) : linkImage!}
            alt=""
            className="h-44 w-full object-cover"
            loading="lazy"
          />
          {pin.status === "stamped" && (
            <span className="stamp absolute right-2 top-2 bg-paper/90 px-2 py-1 text-[10px]">
              Locked in
            </span>
          )}
          {verdictLabel && (
            <span className="stamp absolute right-2 top-2 border-[#7a4a1f] bg-paper/90 px-2 py-1 text-[10px] text-[#7a4a1f]">
              {verdictLabel}
            </span>
          )}
        </div>
      )}
      {rejected && !cover && !linkImage && (
        <span className="stamp mb-2 inline-block border-[#7a4a1f] bg-paper px-2 py-1 text-[10px] text-[#7a4a1f]">
          {verdictLabel}
        </span>
      )}
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h3 className="font-display text-lg font-black leading-snug">{pin.title}</h3>
          <p className="mt-0.5 flex items-center gap-1.5 text-xs text-ink-soft">
            <Avatar memberId={pin.created_by} size={18} />
            {author?.name} &middot;{" "}
            <span className="font-bold" style={{ color: cat.color }}>
              {cat.emoji} {cat.label}
            </span>
          </p>
        </div>
        {!cover && !linkImage && pin.status === "stamped" && (
          <span className="stamp shrink-0 px-2 py-0.5 text-[9px]">In!</span>
        )}
      </div>
      {pin.description && (
        <p className="mt-2 line-clamp-2 text-sm text-ink-soft">{pin.description}</p>
      )}
      <div className="mt-3 flex items-center justify-between">
        <ReactionBar pin={pin} compact />
        <span className="flex items-center gap-1 text-xs text-ink-soft">
          <MessageCircle size={14} />
          {commentCount}
        </span>
      </div>
    </article>
  );
}
