"use client";

import { useEffect } from "react";
import { Drawer } from "vaul";
import { useMember } from "@/lib/member";
import { useMembersMap } from "@/lib/members";
import {
  useMarkNotificationsRead,
  useNotifications,
  usePins,
} from "@/lib/queries";
import { useUiStore } from "@/lib/ui-store";
import Avatar from "./Avatar";

function timeAgo(iso: string): string {
  const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

export default function NotificationsSheet({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { member } = useMember();
  const members = useMembersMap();
  const { data: notifications = [] } = useNotifications(member?.id ?? null);
  const { data: pins = [] } = usePins();
  const markRead = useMarkNotificationsRead();
  const selectPin = useUiStore((s) => s.selectPin);

  // Opening the sheet counts as reading everything
  useEffect(() => {
    if (open && member && notifications.some((n) => !n.read)) {
      markRead.mutate(member.id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  return (
    <Drawer.Root open={open} onOpenChange={onOpenChange}>
      <Drawer.Portal>
        <Drawer.Overlay className="fixed inset-0 z-40 bg-ink/30" />
        <Drawer.Content
          aria-describedby={undefined}
          className="fixed inset-x-0 bottom-0 z-50 flex max-h-[80dvh] flex-col rounded-t-3xl bg-paper shadow-lifted outline-none"
        >
          <div className="mx-auto mt-2 h-1.5 w-10 shrink-0 rounded-full bg-ink/20" />
          <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-[calc(env(safe-area-inset-bottom)+24px)] pt-3">
            <Drawer.Title className="font-display text-2xl font-black">
              While you were away
            </Drawer.Title>
            {notifications.length === 0 && (
              <p className="mt-8 text-center font-hand text-2xl text-ink-soft">
                nothing yet. pin something worth reacting to 😏
              </p>
            )}
            <ul className="mt-3 space-y-2">
              {notifications.map((n) => {
                const actor = members.get(n.actor_id);
                const pin = pins.find((p) => p.id === n.pin_id);
                return (
                  <li key={n.id}>
                    <button
                      onClick={() => {
                        if (pin) {
                          onOpenChange(false);
                          selectPin(pin.id);
                        }
                      }}
                      className={`flex w-full items-start gap-2.5 rounded-xl px-3 py-2.5 text-left ${
                        n.read ? "bg-white/50" : "bg-marigold/15"
                      } shadow-paper active:scale-[0.98]`}
                    >
                      <Avatar memberId={n.actor_id} size={30} />
                      <span className="min-w-0 flex-1">
                        <span className="block text-sm">
                          <b>{actor?.name ?? "Someone"}</b>{" "}
                          {n.kind === "reaction" ? (
                            <>
                              reacted {n.emoji} to{" "}
                              <b>{pin?.title ?? "your idea"}</b>
                            </>
                          ) : (
                            <>
                              commented on <b>{pin?.title ?? "your idea"}</b>
                            </>
                          )}
                        </span>
                        {n.body && (
                          <span className="mt-0.5 block truncate text-sm text-ink-soft">
                            &ldquo;{n.body}&rdquo;
                          </span>
                        )}
                        <span className="mt-0.5 block text-[11px] text-ink-soft/70">
                          {timeAgo(n.created_at)}
                        </span>
                      </span>
                      {!n.read && (
                        <span className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full bg-chili" />
                      )}
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  );
}
