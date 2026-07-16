"use client";

import { useEffect, useRef, useState } from "react";
import { Drawer } from "vaul";
import { Camera, Loader2, UserRound, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMember } from "@/lib/member";
import { useMembersMap } from "@/lib/members";
import { useUpdateProfile } from "@/lib/queries";
import { uploadProfilePhoto } from "@/lib/images";
import { publicImageUrl } from "@/lib/supabase";
import { useUiStore } from "@/lib/ui-store";

const EMOJI_CHOICES = [
  "🤴", "👸", "🌼", "🤠", "🌺", "🏄‍♂️", "🐘", "🛵", "🥭", "🧭", "🦎", "🍜",
  "🏝️", "🛕", "🐒", "🦜", "🌴", "🥥", "🛶", "🧋", "🌶️", "🐠", "🎒", "📸",
];

export default function ProfileSheet() {
  const open = useUiStore((s) => s.profileOpen);
  const setOpen = useUiStore((s) => s.setProfileOpen);
  const { member, setMember } = useMember();
  const profile = useMembersMap().get(member?.id ?? "");
  const update = useUpdateProfile();
  const router = useRouter();
  const fileInput = useRef<HTMLInputElement>(null);

  const [name, setName] = useState("");
  const [avatar, setAvatar] = useState("");
  const [photoPath, setPhotoPath] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (open && profile) {
      setName(profile.name);
      setAvatar(profile.avatar);
      setPhotoPath(profile.photoPath);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  async function pickPhoto(file: File) {
    if (!member) return;
    setUploading(true);
    try {
      setPhotoPath(await uploadProfilePhoto(file, member.id));
    } finally {
      setUploading(false);
    }
  }

  function save() {
    if (!member || !name.trim()) return;
    update.mutate(
      { memberId: member.id, name: name.trim().slice(0, 20), avatar, photoPath },
      { onSuccess: () => setOpen(false) },
    );
  }

  return (
    <Drawer.Root open={open} onOpenChange={setOpen}>
      <Drawer.Portal>
        <Drawer.Overlay className="fixed inset-0 z-40 bg-ink/30" />
        <Drawer.Content
          aria-describedby={undefined}
          className="fixed inset-x-0 bottom-0 z-50 flex max-h-[92dvh] flex-col rounded-t-3xl bg-paper shadow-lifted outline-none"
        >
          <div className="mx-auto mt-2 h-1.5 w-10 shrink-0 rounded-full bg-ink/20" />
          <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-[calc(env(safe-area-inset-bottom)+24px)] pt-3">
            <Drawer.Title className="font-display text-2xl font-black">
              Your travel papers
            </Drawer.Title>

            {/* Current look */}
            <div className="mt-4 flex items-center gap-4">
              <span
                className="relative flex h-20 w-20 items-center justify-center overflow-hidden rounded-full border-4 border-paper text-4xl shadow-paper"
                style={{ background: member?.color }}
              >
                {photoPath ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={publicImageUrl(photoPath)} alt="" className="h-full w-full object-cover" />
                ) : (
                  avatar
                )}
              </span>
              <div className="flex flex-col gap-2">
                <input
                  ref={fileInput}
                  type="file"
                  accept="image/*"
                  hidden
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) void pickPhoto(f);
                    e.target.value = "";
                  }}
                />
                <button
                  onClick={() => fileInput.current?.click()}
                  disabled={uploading}
                  className="flex items-center gap-1.5 rounded-full border-2 border-sea-deep px-3 py-1.5 text-sm font-bold text-sea-deep active:scale-95 disabled:opacity-50"
                >
                  {uploading ? <Loader2 size={15} className="animate-spin" /> : <Camera size={15} />}
                  {photoPath ? "Change photo" : "Add a photo"}
                </button>
                {photoPath && (
                  <button
                    onClick={() => setPhotoPath(null)}
                    className="flex items-center gap-1.5 rounded-full border-2 border-ink/15 px-3 py-1.5 text-sm text-ink-soft active:scale-95"
                  >
                    <X size={15} /> Back to emoji
                  </button>
                )}
              </div>
            </div>

            {/* Nickname */}
            <label className="mt-5 block font-hand text-xl text-ink-soft">what do we call you?</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value.slice(0, 20))}
              className="mt-1 w-full rounded-xl border-2 border-ink/15 bg-paper px-3 py-3 font-display text-lg font-bold outline-none focus:border-sea-deep"
            />

            {/* Emoji */}
            <label className="mt-5 block font-hand text-xl text-ink-soft">
              your emoji {photoPath ? "(hiding behind your photo)" : ""}
            </label>
            <div className="mt-2 grid grid-cols-8 gap-1.5">
              {EMOJI_CHOICES.map((e) => (
                <button
                  key={e}
                  onClick={() => setAvatar(e)}
                  className={`flex h-10 items-center justify-center rounded-lg border-2 text-xl transition-all active:scale-90 ${
                    avatar === e ? "border-chili bg-chili/10" : "border-ink/10 bg-paper-deep/40"
                  }`}
                >
                  {e}
                </button>
              ))}
            </div>
            <input
              value={avatar}
              onChange={(e) => setAvatar(e.target.value)}
              maxLength={8}
              placeholder="or type any emoji"
              className="mt-2 w-28 rounded-xl border-2 border-ink/15 bg-paper px-3 py-2 text-center text-xl outline-none focus:border-sea-deep"
            />

            <button
              onClick={save}
              disabled={!name.trim() || update.isPending || uploading}
              className="mt-6 flex w-full items-center justify-center gap-2 rounded-full bg-ink py-3 font-display text-lg font-bold text-paper active:scale-[0.98] disabled:opacity-50"
            >
              {update.isPending && <Loader2 size={18} className="animate-spin" />}
              Save my papers
            </button>

            <button
              onClick={() => {
                setOpen(false);
                setMember(null);
                router.push("/enter?who=1");
              }}
              className="mt-3 flex w-full items-center justify-center gap-2 rounded-full border-2 border-ink/15 py-3 font-bold text-ink-soft active:scale-[0.98]"
            >
              <UserRound size={17} />
              Not {profile?.name ?? "you"}? Switch traveller
            </button>
          </div>
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  );
}
