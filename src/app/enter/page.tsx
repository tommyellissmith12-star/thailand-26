"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { MEMBERS, type Member } from "@/lib/constants";
import { useMember } from "@/lib/member";

const PIN_LENGTH = 4;

export default function EnterPage() {
  const router = useRouter();
  const { setMember } = useMember();
  // /enter?who=1 jumps straight to the member picker (used by "switch user";
  // the PIN cookie already gates every other page, so this is safe).
  const [stage, setStage] = useState<"pin" | "who">(() =>
    typeof window !== "undefined" && window.location.search.includes("who") ? "who" : "pin",
  );
  const [digits, setDigits] = useState("");
  const [shake, setShake] = useState(false);
  const [checking, setChecking] = useState(false);

  async function submitPin(pin: string) {
    setChecking(true);
    try {
      const res = await fetch("/api/verify-pin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pin }),
      });
      if (res.ok) {
        setStage("who");
      } else {
        setShake(true);
        setTimeout(() => setShake(false), 500);
        setDigits("");
      }
    } finally {
      setChecking(false);
    }
  }

  function press(d: string) {
    if (checking) return;
    if (d === "del") {
      setDigits((v) => v.slice(0, -1));
      return;
    }
    const next = digits + d;
    setDigits(next);
    if (next.length === PIN_LENGTH) void submitPin(next);
  }

  function pick(m: Member) {
    setMember(m);
    router.replace("/");
  }

  return (
    <main className="flex h-dvh flex-col items-center justify-center gap-8 overflow-hidden px-6">
      {/* Boarding pass header */}
      <header className="animate-rise text-center">
        <p className="font-hand text-2xl text-sea-deep">the big family roadtrip</p>
        <h1 className="font-display text-5xl font-black tracking-tight sm:text-6xl">
          THAILAND
          <span className="ml-2 align-super text-3xl text-chili">&rsquo;26</span>
        </h1>
        <p className="mt-2 text-sm tracking-[0.3em] text-ink-soft">
          BKK &middot; 27 DEC &rarr; JAN
        </p>
      </header>

      {stage === "pin" ? (
        <section
          className={`animate-rise flex flex-col items-center gap-6 ${shake ? "animate-[wobble_0.4s_ease-in-out_2]" : ""}`}
          style={{ animationDelay: "0.1s" }}
        >
          <div className="flex gap-3">
            {Array.from({ length: PIN_LENGTH }).map((_, i) => (
              <span
                key={i}
                className={`h-4 w-4 rounded-full border-2 border-ink transition-all ${
                  i < digits.length ? "scale-110 bg-chili border-chili" : "bg-transparent"
                }`}
              />
            ))}
          </div>
          <p className="font-hand text-xl text-ink-soft">family PIN to board</p>
          <div className="grid grid-cols-3 gap-3">
            {["1","2","3","4","5","6","7","8","9","","0","del"].map((key) =>
              key === "" ? (
                <span key="blank" />
              ) : (
                <button
                  key={key}
                  onClick={() => press(key)}
                  className="h-16 w-16 rounded-2xl border-2 border-ink/15 bg-paper-deep font-display text-2xl font-bold shadow-paper transition-transform active:scale-90"
                >
                  {key === "del" ? "⌫" : key}
                </button>
              ),
            )}
          </div>
        </section>
      ) : (
        <section className="animate-rise w-full max-w-sm">
          <p className="mb-4 text-center font-hand text-2xl text-ink-soft">
            and you are...
          </p>
          <div className="grid grid-cols-2 gap-3">
            {MEMBERS.map((m, i) => (
              <button
                key={m.id}
                onClick={() => pick(m)}
                className="animate-rise flex items-center gap-3 rounded-2xl border-2 border-ink/10 bg-paper-deep p-3 shadow-paper transition-transform active:scale-95"
                style={{ animationDelay: `${i * 60}ms` }}
              >
                <span
                  className="flex h-12 w-12 items-center justify-center rounded-full text-2xl"
                  style={{ background: m.color }}
                >
                  {m.avatar}
                </span>
                <span className="text-left">
                  <span className="block font-display text-lg font-bold">{m.name}</span>
                  {m.tag && (
                    <span className="block font-hand text-sm text-chili">{m.tag}</span>
                  )}
                </span>
              </button>
            ))}
          </div>
        </section>
      )}

      <p className="font-hand text-lg text-ink-soft/70">pin it or it never happened 📌</p>
    </main>
  );
}
