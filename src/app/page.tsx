"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { Bell, Check, Pencil } from "lucide-react";
import { usePins, useItinerary, useNotifications, useSettings, useUpdateTitle } from "@/lib/queries";
import { supabaseConfigured } from "@/lib/supabase";
import { useMember } from "@/lib/member";
import { useUiStore } from "@/lib/ui-store";
import type { Category } from "@/lib/constants";
import CategoryChips from "@/components/pins/CategoryChips";
import Avatar from "@/components/ui/Avatar";
import NotificationsSheet from "@/components/ui/NotificationsSheet";

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
  const { data: settings = { title: "Thailand '26", admin_member_id: null } } = useSettings();
  const [activeCategories, setActiveCategories] = useState<Category[] | null>(null);
  const { member } = useMember();
  const setProfileOpen = useUiStore((s) => s.setProfileOpen);
  const { data: notifications = [] } = useNotifications(member?.id ?? null);
  const unread = notifications.filter((n) => !n.read).length;
  const [bellOpen, setBellOpen] = useState(false);
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState("");
  const updateTitle = useUpdateTitle();
  const isAdmin = Boolean(member && settings.admin_member_id === member.id);

  function saveTitle() {
    const trimmed = titleDraft.trim();
    if (trimmed && trimmed !== settings.title) updateTitle.mutate(trimmed.slice(0, 40));
    setEditingTitle(false);
  }

  return (
    <main className="relative h-dvh w-full overflow-hidden" style={{ touchAction: "none" }}>
      <ThailandMap pins={pins} itinerary={itinerary} activeCategories={activeCategories} />

      {/* Floating header */}
      <div className="pointer-events-none absolute inset-x-0 top-0 z-10 pt-[env(safe-area-inset-top)]">
        <div className="flex items-start justify-between px-4 pt-3">
          {editingTitle ? (
            <span className="pointer-events-auto flex items-center gap-2">
              <input
                autoFocus
                value={titleDraft}
                onChange={(e) => setTitleDraft(e.target.value.slice(0, 40))}
                onKeyDown={(e) => e.key === "Enter" && saveTitle()}
                className="w-48 rounded-xl border-2 border-sea-deep bg-paper px-2 py-1 font-display text-xl font-black outline-none"
              />
              <button
                onClick={saveTitle}
                aria-label="Save title"
                className="flex h-8 w-8 items-center justify-center rounded-full bg-sea-deep text-paper active:scale-90"
              >
                <Check size={16} />
              </button>
            </span>
          ) : (
            <h1 className="pointer-events-auto font-display text-2xl font-black leading-none drop-shadow-[0_1px_0_rgba(250,243,227,0.9)]">
              {settings.title}
              {isAdmin && (
                <button
                  onClick={() => {
                    setTitleDraft(settings.title);
                    setEditingTitle(true);
                  }}
                  aria-label="Edit title"
                  className="ml-2 inline-flex h-6 w-6 items-center justify-center rounded-full bg-paper/80 align-middle text-ink-soft shadow-paper active:scale-90"
                >
                  <Pencil size={12} />
                </button>
              )}
            </h1>
          )}
          <div className="pointer-events-auto flex items-center gap-2">
            <button
              onClick={() => setBellOpen(true)}
              aria-label="Notifications"
              className="relative flex h-9 w-9 items-center justify-center rounded-full bg-paper/85 text-ink shadow-paper active:scale-90"
            >
              <Bell size={18} />
              {unread > 0 && (
                <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-chili px-1 text-[10px] font-bold text-paper">
                  {unread > 9 ? "9+" : unread}
                </span>
              )}
            </button>
            <button
              onClick={() => setProfileOpen(true)}
              aria-label="Your profile"
              className="active:scale-90"
            >
              <Avatar memberId={member?.id} size={34} />
            </button>
          </div>
        </div>
        <div className="pointer-events-auto mt-2">
          <CategoryChips value={activeCategories} onChange={setActiveCategories} />
        </div>
      </div>

      <NotificationsSheet open={bellOpen} onOpenChange={setBellOpen} />

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
