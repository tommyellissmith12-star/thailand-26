"use client";

import { useState } from "react";
import { Drawer } from "vaul";
import { MapPin, Pencil, Stamp, Trash2 } from "lucide-react";
import { useRouter, usePathname } from "next/navigation";
import { CATEGORIES, isRejected, type PinStatus } from "@/lib/constants";
import { useMembersMap } from "@/lib/members";
import { useMember } from "@/lib/member";
import { useDeletePin, usePins, useSetPinStatus } from "@/lib/queries";
import { publicImageUrl } from "@/lib/supabase";
import { useUiStore } from "@/lib/ui-store";
import Avatar from "@/components/ui/Avatar";
import ReactionBar from "./ReactionBar";
import CommentThread from "./CommentThread";
import LinkCard from "./LinkCard";
import VerdictOverlay from "./VerdictOverlay";

// Deterministic pick so a photo keeps its tape between visits
function tapeVariant(id: string): number {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) | 0;
  return Math.abs(h) % 6;
}

export default function PinDetailSheet() {
  const { data: pins = [] } = usePins();
  const selectedPinId = useUiStore((s) => s.selectedPinId);
  const selectPin = useUiStore((s) => s.selectPin);
  const setFlyTo = useUiStore((s) => s.setFlyTo);
  const openEditPin = useUiStore((s) => s.openEditPin);
  const { member } = useMember();
  const setStatus = useSetPinStatus();
  const deletePin = useDeletePin();
  const router = useRouter();
  const pathname = usePathname();
  const [justStamped, setJustStamped] = useState(false);
  const [revealed, setRevealed] = useState<Set<string>>(new Set());

  const pin = pins.find((p) => p.id === selectedPinId) ?? null;
  const cat = pin ? CATEGORIES[pin.category] : null;
  const author = useMembersMap().get(pin?.created_by ?? "");
  const stamped = pin?.status === "stamped";
  const verdict = pin && isRejected(pin.status) ? (pin.status as "torched" | "shat") : null;

  function setVerdict(target: PinStatus) {
    if (!pin || !member?.isApprover) return;
    // Tapping the active verdict shows mercy and restores the idea.
    const next = pin.status === target ? "idea" : target;
    if (next === "stamped") {
      setJustStamped(true);
      setTimeout(() => setJustStamped(false), 900);
    }
    setStatus.mutate({ pinId: pin.id, status: next, memberId: member.id });
  }

  function viewOnMap() {
    if (!pin) return;
    setFlyTo({ lng: pin.lng, lat: pin.lat });
    selectPin(null);
    if (pathname !== "/") router.push("/");
  }

  function remove() {
    if (!pin) return;
    if (!confirm(`Bin "${pin.title}"? Photos and comments go with it.`)) return;
    deletePin.mutate(pin.id);
    selectPin(null);
  }

  return (
    <Drawer.Root open={Boolean(pin)} onOpenChange={(open) => !open && selectPin(null)}>
      <Drawer.Portal>
        <Drawer.Overlay className="fixed inset-0 z-40 bg-ink/30" />
        <Drawer.Content
          aria-describedby={undefined}
          className="fixed inset-x-0 bottom-0 z-50 flex max-h-[92dvh] flex-col rounded-t-3xl bg-paper shadow-lifted outline-none"
        >
          <div className="mx-auto mt-2 h-1.5 w-10 shrink-0 rounded-full bg-ink/20" />
          {pin && cat && (
            <div
              className={`min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pb-[calc(env(safe-area-inset-bottom)+90px)] pt-3 ${
                verdict === "torched" ? "charred" : verdict === "shat" ? "soiled" : ""
              }`}
            >
              {/* Title row */}
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <Drawer.Title className="font-display text-2xl font-black leading-tight">
                    {pin.title}
                  </Drawer.Title>
                  <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-ink-soft">
                    <span
                      className="rounded-full px-2 py-0.5 text-xs font-bold text-paper"
                      style={{ background: cat.color }}
                    >
                      {cat.emoji} {cat.label}
                    </span>
                    <span className="flex items-center gap-1">
                      <Avatar memberId={pin.created_by} size={20} />
                      {author?.name}&rsquo;s idea
                    </span>
                  </div>
                </div>
                {stamped && (
                  <span
                    className={`stamp shrink-0 px-2.5 py-1.5 text-xs ${justStamped ? "animate-stamp" : ""}`}
                  >
                    Locked in
                  </span>
                )}
              </div>

              {/* Photo gallery */}
              {pin.pin_images.length > 0 && (
                <div className="no-scrollbar -mx-4 mt-2 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-1 pt-4">
                  {pin.pin_images.map((img, i) => {
                    const spoiled = img.is_spoiler && !revealed.has(img.id);
                    return (
                      <figure
                        key={img.id}
                        className="relative shrink-0 snap-center rounded-lg bg-white p-2 pb-6 shadow-paper"
                        style={{ transform: `rotate(${i % 2 === 0 ? -1.2 : 1.4}deg)` }}
                      >
                        <button
                          className="relative block overflow-hidden rounded"
                          onClick={() =>
                            img.is_spoiler &&
                            setRevealed((r) => {
                              const next = new Set(r);
                              if (next.has(img.id)) next.delete(img.id);
                              else next.add(img.id);
                              return next;
                            })
                          }
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={publicImageUrl(img.storage_path)}
                            alt=""
                            className={`h-56 w-auto max-w-[78vw] object-cover transition-all duration-300 ${
                              spoiled ? "blur-2xl saturate-50" : ""
                            }`}
                            loading="lazy"
                          />
                          {spoiled && (
                            <span className="absolute inset-0 flex flex-col items-center justify-center gap-1">
                              <span className="text-3xl">🙈</span>
                              <span className="font-hand rounded-full bg-paper/85 px-3 py-1 text-lg text-ink">
                                spoiler! tap to peek
                              </span>
                            </span>
                          )}
                        </button>
                        <span
                          className={`tape tape-v${tapeVariant(img.id)} -top-3 left-1/2 -translate-x-1/2`}
                        />
                      </figure>
                    );
                  })}
                </div>
              )}

              {/* Description */}
              {pin.description && (
                <p className="mt-4 whitespace-pre-wrap text-[15px] leading-relaxed">
                  {pin.description}
                </p>
              )}

              {/* Links */}
              {pin.pin_links.length > 0 && (
                <div className="mt-4 space-y-2">
                  {pin.pin_links.map((l) => (
                    <LinkCard key={l.id} link={l} />
                  ))}
                </div>
              )}

              {/* Reactions */}
              <div className="mt-5">
                <ReactionBar pin={pin} />
              </div>

              {/* Actions */}
              <div className="mt-5 flex flex-wrap gap-2">
                <button
                  onClick={viewOnMap}
                  className="flex items-center gap-1.5 rounded-full border-2 border-sea-deep px-3 py-1.5 text-sm font-bold text-sea-deep transition-transform active:scale-95"
                >
                  <MapPin size={15} /> Fly to it
                </button>
                {member?.isApprover && (
                  <>
                    <button
                      onClick={() => setVerdict("stamped")}
                      className={`flex items-center gap-1.5 rounded-full border-2 px-3 py-1.5 text-sm font-bold transition-transform active:scale-95 ${
                        stamped
                          ? "border-ink/20 text-ink-soft"
                          : "border-chili bg-chili text-paper"
                      }`}
                    >
                      <Stamp size={15} />
                      {stamped ? "Un-stamp it" : "Stamp it. We're going"}
                    </button>
                    {/* Torching retired as an option; existing torched pins keep their undo */}
                    {verdict === "torched" && (
                      <button
                        onClick={() => setVerdict("torched")}
                        className="flex items-center gap-1.5 rounded-full border-2 border-marigold bg-marigold/20 px-3 py-1.5 text-sm font-bold text-ink transition-transform active:scale-95"
                      >
                        🔥 Have mercy
                      </button>
                    )}
                    <button
                      onClick={() => setVerdict("shat")}
                      className={`flex items-center gap-1.5 rounded-full border-2 px-3 py-1.5 text-sm font-bold transition-transform active:scale-95 ${
                        verdict === "shat"
                          ? "border-[#7a4a1f] bg-[#7a4a1f]/15 text-[#7a4a1f]"
                          : "border-[#7a4a1f]/60 text-ink-soft"
                      }`}
                    >
                      💩 {verdict === "shat" ? "Hose it down" : "Shit on it"}
                    </button>
                  </>
                )}
                {member?.id === pin.created_by && (
                  <button
                    onClick={() => openEditPin(pin)}
                    className="flex items-center gap-1.5 rounded-full border-2 border-ink/15 px-3 py-1.5 text-sm font-bold text-ink-soft transition-transform active:scale-95"
                  >
                    <Pencil size={15} /> Edit
                  </button>
                )}
                {member && (member.id === pin.created_by || member.isApprover) && (
                  <button
                    onClick={remove}
                    aria-label="Delete pin"
                    className="flex items-center gap-1.5 rounded-full border-2 border-ink/15 px-3 py-1.5 text-sm text-ink-soft transition-transform active:scale-95"
                  >
                    <Trash2 size={15} />
                  </button>
                )}
              </div>

              <hr className="my-5 border-dashed border-ink/20" />

              <CommentThread pinId={pin.id} />
            </div>
          )}
          {pin && verdict && <VerdictOverlay key={pin.id} verdict={verdict} />}
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  );
}
