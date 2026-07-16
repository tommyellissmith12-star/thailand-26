"use client";

import { useMemo } from "react";
import Link from "next/link";
import { UserRound } from "lucide-react";
import { CATEGORIES } from "@/lib/constants";
import { useMembers } from "@/lib/members";
import { useMember } from "@/lib/member";
import { useCommentCounts, usePins } from "@/lib/queries";
import { publicImageUrl } from "@/lib/supabase";
import { useUiStore } from "@/lib/ui-store";
import Avatar from "@/components/ui/Avatar";

export default function BoardPage() {
  const { member } = useMember();
  const allMembers = useMembers();
  const { data: pins = [] } = usePins();
  const { data: commentCounts = {} } = useCommentCounts();
  const selectPin = useUiStore((s) => s.selectPin);

  const ranked = useMemo(
    () =>
      [...pins].sort(
        (a, b) =>
          b.reactions.length + (commentCounts[b.id] ?? 0) * 0 -
          (a.reactions.length + (commentCounts[a.id] ?? 0) * 0),
      ),
    [pins, commentCounts],
  );

  const podium = ranked.slice(0, 3);
  const rest = ranked.slice(3);

  const contributions = useMemo(
    () =>
      allMembers.map((m) => ({
        member: m,
        count: pins.filter((p) => p.created_by === m.id).length,
      })).sort((a, b) => b.count - a.count),
    [allMembers, pins],
  );

  const stampedCount = pins.filter((p) => p.status === "stamped").length;

  return (
    <main className="mx-auto min-h-dvh max-w-lg px-4 pb-28 pt-[calc(env(safe-area-inset-top)+16px)]">
      <header className="mb-4">
        <p className="font-hand text-xl leading-none text-sea-deep">the family has spoken</p>
        <h1 className="font-display text-3xl font-black">Leaderboard</h1>
        <p className="mt-1 text-sm text-ink-soft">
          {pins.length} ideas pinned &middot; {stampedCount} locked in
        </p>
      </header>

      {ranked.length === 0 && (
        <p className="mt-16 text-center font-hand text-2xl text-ink-soft">
          no votes yet. democracy needs you 🗳️
        </p>
      )}

      {/* Podium */}
      {podium.length > 0 && (
        <section className="mb-6 flex items-end justify-center gap-3">
          {[1, 0, 2].map((rank) => {
            const pin = podium[rank];
            if (!pin) return <span key={rank} className="w-24" />;
            const heights = ["h-36", "h-28", "h-24"];
            const medals = ["🥇", "🥈", "🥉"];
            const thumb = pin.pin_images[0]?.thumb_path ?? pin.pin_images[0]?.storage_path;
            return (
              <button
                key={pin.id}
                onClick={() => selectPin(pin.id)}
                className={`flex w-28 flex-col items-center justify-end gap-1 rounded-t-2xl border-2 border-b-0 border-ink/10 bg-white p-2 shadow-paper ${heights[rank]} active:scale-95`}
              >
                <span className="text-xl">{medals[rank]}</span>
                {thumb ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={publicImageUrl(thumb)}
                    alt=""
                    className="h-12 w-12 rounded-lg object-cover"
                  />
                ) : (
                  <span className="text-2xl">{CATEGORIES[pin.category].emoji}</span>
                )}
                <span className="line-clamp-2 text-center text-xs font-bold leading-tight">
                  {pin.title}
                </span>
                <span className="text-xs text-chili">
                  {pin.reactions.length} ❤️
                </span>
              </button>
            );
          })}
        </section>
      )}

      {/* Rest of the ranking */}
      {rest.length > 0 && (
        <ul className="space-y-2">
          {rest.map((pin, i) => (
            <li key={pin.id}>
              <button
                onClick={() => selectPin(pin.id)}
                className="flex w-full items-center gap-3 rounded-xl bg-white/70 px-3 py-2.5 shadow-paper active:scale-[0.98]"
              >
                <span className="w-6 font-display text-sm font-black text-ink-soft">
                  {i + 4}
                </span>
                <span className="text-lg">{CATEGORIES[pin.category].emoji}</span>
                <span className="min-w-0 flex-1 truncate text-left text-sm font-bold">
                  {pin.title}
                </span>
                {pin.status === "stamped" && <span className="stamp px-1.5 text-[8px]">In!</span>}
                {pin.status === "torched" && <span>🔥</span>}
                {pin.status === "shat" && <span>💩</span>}
                <span className="text-xs tabular-nums text-ink-soft">
                  {pin.reactions.length} ❤️
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}

      {/* Who's pulling their weight */}
      {pins.length > 0 && (
        <section className="mt-8">
          <h2 className="font-hand text-2xl text-ink-soft">who&rsquo;s pulling their weight</h2>
          <ul className="mt-3 space-y-2">
            {contributions.map(({ member, count }) => (
              <li key={member.id} className="flex items-center gap-3">
                <Avatar memberId={member.id} size={30} />
                <span className="w-14 text-sm font-bold">{member.name}</span>
                <span className="h-3 flex-1 overflow-hidden rounded-full bg-ink/10">
                  <span
                    className="block h-full rounded-full transition-all"
                    style={{
                      width: `${pins.length ? Math.max((count / Math.max(...contributions.map((c) => c.count), 1)) * 100, count ? 8 : 0) : 0}%`,
                      background: member.color,
                    }}
                  />
                </span>
                <span className="w-6 text-right text-sm tabular-nums text-ink-soft">{count}</span>
              </li>
            ))}
          </ul>
          {contributions[contributions.length - 1]?.count === 0 && (
            <p className="mt-3 text-center font-hand text-lg text-ink-soft/70">
              {contributions.filter((c) => c.count === 0).map((c) => c.member.name).join(" and ")}
              ... the map is waiting 👀
            </p>
          )}
        </section>
      )}

      <Link
        href="/enter?who=1"
        className="mt-10 flex items-center justify-center gap-2 rounded-full border-2 border-ink/15 py-3 font-bold text-ink-soft active:scale-[0.98]"
      >
        <UserRound size={17} />
        Not {member?.name ?? "you"}? Switch traveller
      </Link>
    </main>
  );
}
