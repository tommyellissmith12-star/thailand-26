"use client";

// The theatre of judgement. Renders on top of the pin detail sheet whenever a
// pin has been torched or shat on; mounts fresh with the sheet, so the
// animation replays every single time someone opens the pin. That is the joke
// and it must never be "fixed".

const FLAMES = [
  { left: "6%", delay: 0, size: "text-4xl" },
  { left: "18%", delay: 180, size: "text-6xl" },
  { left: "31%", delay: 60, size: "text-5xl" },
  { left: "44%", delay: 260, size: "text-7xl" },
  { left: "57%", delay: 120, size: "text-5xl" },
  { left: "70%", delay: 320, size: "text-6xl" },
  { left: "83%", delay: 30, size: "text-4xl" },
  { left: "92%", delay: 220, size: "text-5xl" },
];

const SPLATS = [
  { left: "12%", top: "22%", delay: 2300, size: "text-2xl", tilt: "-15deg" },
  { left: "78%", top: "14%", delay: 2450, size: "text-3xl", tilt: "12deg" },
  { left: "64%", top: "58%", delay: 2600, size: "text-2xl", tilt: "-8deg" },
  { left: "22%", top: "66%", delay: 2750, size: "text-xl", tilt: "20deg" },
];

export default function VerdictOverlay({
  verdict,
  byName,
}: {
  verdict: "torched" | "shat";
  byName: string | null;
}) {
  return (
    // NB: no z-index here. The overlay must stay in the drawer's stacking
    // context and simply paint after the content, or mix-blend-multiply on the
    // scorch/smear artwork can't see the content underneath it.
    <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-t-3xl">
      {verdict === "torched" ? (
        <>
          {/* heat glow */}
          <div
            className="absolute inset-0"
            style={{
              background:
                "linear-gradient(to top, rgba(199,74,52,0.85), rgba(242,169,59,0.5) 45%, transparent 75%)",
              animation: "burn-glow 2s ease-out both",
            }}
          />
          {/* charred edges creep in (white background disappears via multiply) */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/verdicts/scorch.webp"
            alt=""
            className="absolute inset-0 h-full w-full mix-blend-multiply"
            style={{ objectFit: "fill", animation: "scorch-in 1.4s ease-out 0.5s both" }}
          />
          {/* rising flames */}
          {FLAMES.map((f, i) => (
            <span
              key={i}
              className={`absolute bottom-0 ${f.size}`}
              style={{
                left: f.left,
                animation: `flame-rise 1.7s ease-in ${f.delay}ms both`,
              }}
            >
              🔥
            </span>
          ))}
          {/* the verdict lands */}
          <span
            className="stamp absolute left-1/2 top-[30%] -translate-x-1/2 bg-paper/90 px-4 py-2 text-lg"
            style={{ animation: "stamp 0.45s cubic-bezier(0.2,1.6,0.4,1) 1.5s both" }}
          >
            Torched{byName ? ` by ${byName}` : ""} 🔥
          </span>
        </>
      ) : (
        <>
          {/* the throne rises */}
          <span
            className="absolute bottom-2 left-[4%] text-7xl"
            style={{ animation: "toilet-in 0.6s cubic-bezier(0.2,1.4,0.4,1) both" }}
          >
            🚽
          </span>
          {/* payload delivery */}
          <span
            className="absolute bottom-16 left-[9%] text-5xl"
            style={{ animation: "poop-launch 1.5s cubic-bezier(0.3,0.6,0.6,1) 0.55s both" }}
          >
            💩
          </span>
          {/* the smear drags across (generated artwork, multiply hides the white) */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/verdicts/smear.webp"
            alt=""
            className="absolute left-[-5%] top-[16%] w-[110%] max-w-none mix-blend-multiply"
            style={{ animation: "smear-wipe 1.1s ease-out 2.1s both" }}
          />
          {/* residue */}
          {SPLATS.map((s, i) => (
            <span
              key={i}
              className={`absolute ${s.size}`}
              style={{
                left: s.left,
                top: s.top,
                rotate: s.tilt,
                animation: `splat-pop 0.4s cubic-bezier(0.2,1.6,0.4,1) ${s.delay}ms both`,
              }}
            >
              💩
            </span>
          ))}
          <span
            className="stamp absolute left-1/2 top-[32%] -translate-x-1/2 border-[#7a4a1f] bg-paper/90 px-4 py-2 text-lg text-[#7a4a1f]"
            style={{ animation: "stamp 0.45s cubic-bezier(0.2,1.6,0.4,1) 2.9s both" }}
          >
            Shat on 💩
          </span>
        </>
      )}
    </div>
  );
}
