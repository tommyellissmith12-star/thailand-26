"use client";

import { useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { useQueryClient } from "@tanstack/react-query";
import { Camera, Link2, Loader2, X } from "lucide-react";
import { CATEGORIES, CATEGORY_KEYS, THAILAND_CENTER, type Category } from "@/lib/constants";
import { useMember } from "@/lib/member";
import { uploadPinImage } from "@/lib/images";
import { supabase } from "@/lib/supabase";
import { useUiStore } from "@/lib/ui-store";
import type { LinkPreview } from "@/lib/types";

const LocationPicker = dynamic(() => import("@/components/map/LocationPicker"), { ssr: false });

const STEPS = ["the goods", "the words", "the where"] as const;

export default function AddPinFlow() {
  const open = useUiStore((s) => s.addPinOpen);
  const close = useUiStore((s) => s.closeAddPin);
  const selectPin = useUiStore((s) => s.selectPin);
  const setFlyTo = useUiStore((s) => s.setFlyTo);
  const { member } = useMember();
  const qc = useQueryClient();

  const [step, setStep] = useState(0);
  const [files, setFiles] = useState<File[]>([]);
  const [linkUrl, setLinkUrl] = useState("");
  const [preview, setPreview] = useState<LinkPreview | null>(null);
  const [fetchingPreview, setFetchingPreview] = useState(false);
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState<Category>("other");
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState({ lng: THAILAND_CENTER[0], lat: THAILAND_CENTER[1] });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  const objectUrls = useMemo(() => files.map((f) => URL.createObjectURL(f)), [files]);

  function reset() {
    setStep(0);
    setFiles([]);
    setLinkUrl("");
    setPreview(null);
    setTitle("");
    setCategory("other");
    setDescription("");
    setSaving(false);
    setError(null);
  }

  function dismiss() {
    close();
    reset();
  }

  async function fetchPreview() {
    const url = linkUrl.trim();
    if (!url) return;
    setFetchingPreview(true);
    try {
      const res = await fetch("/api/link-preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });
      if (res.ok) {
        const data = (await res.json()) as LinkPreview;
        setPreview(data);
        if (data.title && !title) setTitle(data.title.slice(0, 120));
      }
    } finally {
      setFetchingPreview(false);
    }
  }

  async function save() {
    if (!member || !title.trim() || saving) return;
    setSaving(true);
    setError(null);
    try {
      const db = supabase();
      const { data: pin, error: pinError } = await db
        .from("pins")
        .insert({
          title: title.trim(),
          description: description.trim() || null,
          lat: location.lat,
          lng: location.lng,
          category,
          created_by: member.id,
        })
        .select("id, lng, lat")
        .single();
      if (pinError) throw pinError;

      if (files.length > 0) {
        const uploaded = await Promise.all(files.map((f) => uploadPinImage(f, pin.id)));
        const { error: imgError } = await db.from("pin_images").insert(
          uploaded.map((u, i) => ({ pin_id: pin.id, ...u, sort_order: i })),
        );
        if (imgError) throw imgError;
      }

      const url = linkUrl.trim();
      if (url) {
        const p = preview;
        const { error: linkError } = await db.from("pin_links").insert({
          pin_id: pin.id,
          url,
          og_title: p?.title ?? null,
          og_description: p?.description ?? null,
          og_image: p?.image ?? null,
          og_site_name: p?.siteName ?? null,
          fetched_ok: p?.ok ?? false,
        });
        if (linkError) throw linkError;
      }

      await qc.invalidateQueries({ queryKey: ["pins"] });
      dismiss();
      setFlyTo({ lng: pin.lng, lat: pin.lat });
      selectPin(pin.id);
    } catch (e) {
      setError(e instanceof Error ? e.message : "That didn't stick. Try again?");
      setSaving(false);
    }
  }

  if (!open) return null;

  const canNext = step === 1 ? title.trim().length > 0 : true;

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-paper">
      {/* Header */}
      <header className="flex items-center justify-between px-4 pb-2 pt-[calc(env(safe-area-inset-top)+12px)]">
        <div>
          <p className="font-hand text-lg leading-none text-sea-deep">step {step + 1} of 3</p>
          <h2 className="font-display text-2xl font-black">{STEPS[step]}</h2>
        </div>
        <button
          onClick={dismiss}
          aria-label="Close"
          className="flex h-10 w-10 items-center justify-center rounded-full border-2 border-ink/15 active:scale-90"
        >
          <X size={20} />
        </button>
      </header>

      {/* Progress */}
      <div className="mx-4 flex gap-1.5">
        {STEPS.map((_, i) => (
          <span
            key={i}
            className={`h-1.5 flex-1 rounded-full transition-colors ${i <= step ? "bg-chili" : "bg-ink/10"}`}
          />
        ))}
      </div>

      {/* Body */}
      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
        {step === 0 && (
          <div className="space-y-5">
            <div>
              <input
                ref={fileInput}
                type="file"
                accept="image/*"
                multiple
                hidden
                onChange={(e) => {
                  const picked = Array.from(e.target.files ?? []);
                  if (picked.length) setFiles((f) => [...f, ...picked].slice(0, 6));
                  e.target.value = "";
                }}
              />
              <button
                onClick={() => fileInput.current?.click()}
                className="flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-ink/25 bg-paper-deep/50 py-8 font-bold text-ink-soft active:scale-[0.98]"
              >
                <Camera size={22} />
                {files.length ? "Add more photos" : "Add photos"}
              </button>
              {files.length > 0 && (
                <div className="no-scrollbar mt-3 flex gap-3 overflow-x-auto">
                  {files.map((f, i) => (
                    <div key={i} className="relative shrink-0">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={objectUrls[i]}
                        alt=""
                        className="h-24 w-24 rounded-xl border-2 border-white object-cover shadow-paper"
                        style={{ transform: `rotate(${i % 2 ? 2 : -2}deg)` }}
                      />
                      <button
                        onClick={() => setFiles((fs) => fs.filter((_, j) => j !== i))}
                        aria-label="Remove photo"
                        className="absolute -right-1.5 -top-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-ink text-paper"
                      >
                        <X size={13} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div>
              <label className="font-hand text-xl text-ink-soft">
                or paste a TikTok / YouTube / blog link
              </label>
              <div className="mt-1 flex gap-2">
                <input
                  value={linkUrl}
                  onChange={(e) => {
                    setLinkUrl(e.target.value);
                    setPreview(null);
                  }}
                  onBlur={fetchPreview}
                  inputMode="url"
                  placeholder="https://..."
                  className="min-w-0 flex-1 rounded-xl border-2 border-ink/15 bg-paper px-3 py-2.5 text-sm outline-none focus:border-sea-deep"
                />
                <button
                  onClick={fetchPreview}
                  disabled={!linkUrl.trim() || fetchingPreview}
                  aria-label="Fetch preview"
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-sea-deep text-paper active:scale-90 disabled:opacity-40"
                >
                  {fetchingPreview ? <Loader2 size={18} className="animate-spin" /> : <Link2 size={18} />}
                </button>
              </div>
              {preview && (
                <div className="mt-2 flex items-center gap-3 rounded-xl border-2 border-ink/10 bg-paper-deep/50 p-2">
                  {preview.image && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={preview.image} alt="" className="h-14 w-14 rounded-lg object-cover" />
                  )}
                  <div className="min-w-0">
                    <p className="truncate text-sm font-bold">
                      {preview.title ?? "Link saved"}
                    </p>
                    <p className="truncate text-xs text-ink-soft">
                      {preview.ok
                        ? preview.siteName
                        : "No preview for this one (looking at you, Instagram). It still saves fine."}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {step === 1 && (
          <div className="space-y-5">
            <div>
              <label className="font-hand text-xl text-ink-soft">what is it?</label>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value.slice(0, 120))}
                placeholder="Sunday night market in Chiang Mai"
                className="mt-1 w-full rounded-xl border-2 border-ink/15 bg-paper px-3 py-3 font-display text-lg font-bold outline-none focus:border-sea-deep"
              />
            </div>
            <div>
              <label className="font-hand text-xl text-ink-soft">what kind of thing?</label>
              <div className="mt-2 grid grid-cols-4 gap-2">
                {CATEGORY_KEYS.map((key) => {
                  const cat = CATEGORIES[key];
                  const active = category === key;
                  return (
                    <button
                      key={key}
                      onClick={() => setCategory(key)}
                      className={`flex flex-col items-center gap-1 rounded-xl border-2 py-2.5 text-xs font-bold transition-all active:scale-90 ${
                        active ? "text-paper" : "border-ink/10 bg-paper-deep/40 text-ink-soft"
                      }`}
                      style={active ? { background: cat.color, borderColor: cat.color } : undefined}
                    >
                      <span className="text-lg">{cat.emoji}</span>
                      {cat.label}
                    </button>
                  );
                })}
              </div>
            </div>
            <div>
              <label className="font-hand text-xl text-ink-soft">sell it to the family</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value.slice(0, 4000))}
                rows={4}
                placeholder="Why do we HAVE to do this one?"
                className="mt-1 w-full resize-none rounded-xl border-2 border-ink/15 bg-paper px-3 py-3 text-[15px] outline-none focus:border-sea-deep"
              />
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="h-full min-h-[340px]">
            <LocationPicker onChange={setLocation} />
          </div>
        )}

        {error && (
          <p className="mt-3 rounded-xl border-2 border-chili/40 bg-chili/10 p-3 text-sm text-chili">
            {error}
          </p>
        )}
      </div>

      {/* Footer */}
      <footer className="flex gap-3 px-4 pb-[calc(env(safe-area-inset-bottom)+16px)] pt-2">
        {step > 0 && (
          <button
            onClick={() => setStep((s) => s - 1)}
            className="rounded-full border-2 border-ink/15 px-5 py-3 font-bold text-ink-soft active:scale-95"
          >
            Back
          </button>
        )}
        {step < 2 ? (
          <button
            onClick={() => canNext && setStep((s) => s + 1)}
            disabled={!canNext}
            className="flex-1 rounded-full bg-ink py-3 font-display text-lg font-bold text-paper active:scale-[0.98] disabled:opacity-40"
          >
            {step === 1 ? "Now, where is it?" : "Next"}
          </button>
        ) : (
          <button
            onClick={save}
            disabled={saving}
            className="flex flex-1 items-center justify-center gap-2 rounded-full bg-chili py-3 font-display text-lg font-bold text-paper active:scale-[0.98] disabled:opacity-60"
          >
            {saving && <Loader2 size={18} className="animate-spin" />}
            {saving ? "Pinning..." : "Pin it 📌"}
          </button>
        )}
      </footer>
    </div>
  );
}
