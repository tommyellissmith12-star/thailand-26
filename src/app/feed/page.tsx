"use client";

import { useCommentCounts, usePins } from "@/lib/queries";
import PinCard from "@/components/pins/PinCard";

export default function FeedPage() {
  const { data: pins = [], isLoading } = usePins();
  const { data: commentCounts = {} } = useCommentCounts();

  return (
    <main className="mx-auto min-h-dvh max-w-lg px-4 pb-28 pt-[calc(env(safe-area-inset-top)+16px)]">
      <header className="mb-4">
        <p className="font-hand text-xl leading-none text-sea-deep">hot off the group chat</p>
        <h1 className="font-display text-3xl font-black">The Feed</h1>
      </header>

      {isLoading && (
        <p className="mt-12 text-center font-hand text-2xl text-ink-soft">rummaging...</p>
      )}

      {!isLoading && pins.length === 0 && (
        <p className="mt-16 text-center font-hand text-2xl text-ink-soft">
          nothing here yet. be the hero who pins first 🙌
        </p>
      )}

      <div className="space-y-4">
        {pins.map((pin, i) => (
          <PinCard key={pin.id} pin={pin} commentCount={commentCounts[pin.id] ?? 0} tiltIndex={i} />
        ))}
      </div>
    </main>
  );
}
