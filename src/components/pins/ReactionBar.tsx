"use client";

import { REACTION_EMOJIS } from "@/lib/constants";
import { useMember } from "@/lib/member";
import { useToggleReaction } from "@/lib/queries";
import type { Pin } from "@/lib/types";

export default function ReactionBar({ pin, compact = false }: { pin: Pin; compact?: boolean }) {
  const { member } = useMember();
  const toggle = useToggleReaction();

  return (
    <div className={`flex ${compact ? "gap-1" : "gap-2"}`}>
      {REACTION_EMOJIS.map((emoji) => {
        const count = pin.reactions.filter((r) => r.emoji === emoji).length;
        const mine = Boolean(
          member && pin.reactions.some((r) => r.emoji === emoji && r.member_id === member.id),
        );
        if (compact && count === 0) return null;
        return (
          <button
            key={emoji}
            onClick={(e) => {
              e.stopPropagation();
              if (!member) return;
              toggle.mutate({ pinId: pin.id, memberId: member.id, emoji, active: mine });
            }}
            className={`flex items-center gap-1 rounded-full border-2 px-2 py-1 text-sm transition-all active:scale-75 ${
              mine
                ? "border-chili bg-chili/15 font-bold"
                : "border-ink/10 bg-paper-deep/60"
            } ${compact ? "px-1.5 py-0.5 text-xs" : ""}`}
          >
            <span>{emoji}</span>
            {count > 0 && <span className="tabular-nums">{count}</span>}
          </button>
        );
      })}
    </div>
  );
}
