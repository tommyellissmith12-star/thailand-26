"use client";

import { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { useQueryClient } from "@tanstack/react-query";
import {
  DndContext,
  PointerSensor,
  TouchSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  horizontalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Camera, Link2, Loader2, X } from "lucide-react";
import { CATEGORIES, CATEGORY_KEYS, THAILAND_CENTER, type Category } from "@/lib/constants";
import { useMember } from "@/lib/member";
import { uploadPinImage } from "@/lib/images";
import { publicImageUrl, supabase } from "@/lib/supabase";
import { useUiStore } from "@/lib/ui-store";
import type { LinkPreview, PinImage } from "@/lib/types";

const LocationPicker = dynamic(() => import("@/components/map/LocationPicker"), { ssr: false });

const STEPS = ["the goods", "the words", "the where"] as const;
const MAX_PHOTOS = 6;

type PhotoItem =
  | { key: string; kind: "new"; file: File; url: string; spoiler: boolean }
  | { key: string; kind: "existing"; image: PinImage; spoiler: boolean };

function itemSrc(item: PhotoItem): string {
  return item.kind === "new"
    ? item.url
    : publicImageUrl(item.image.thumb_path ?? item.image.storage_path);
}

export default function AddPinFlow() {
  const open = useUiStore((s) => s.addPinOpen);
  const editPin = useUiStore((s) => s.editPin);
  const close = useUiStore((s) => s.closeAddPin);
  const selectPin = useUiStore((s) => s.selectPin);
  const setFlyTo = useUiStore((s) => s.setFlyTo);
  const { member } = useMember();
  const qc = useQueryClient();

  const [step, setStep] = useState(0);
  const [items, setItems] = useState<PhotoItem[]>([]);
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

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 8 } }),
  );

  // Prefill everything when opened as an editor
  useEffect(() => {
    if (open && editPin) {
      setTitle(editPin.title);
      setDescription(editPin.description ?? "");
      setCategory(editPin.category);
      setLocation({ lng: editPin.lng, lat: editPin.lat });
      setItems(
        [...editPin.pin_images]
          .sort((a, b) => a.sort_order - b.sort_order)
          .map((image) => ({ key: image.id, kind: "existing", image, spoiler: image.is_spoiler })),
      );
      const link = editPin.pin_links[0];
      setLinkUrl(link?.url ?? "");
      setPreview(
        link
          ? {
              url: link.url,
              title: link.og_title,
              description: link.og_description,
              image: link.og_image,
              siteName: link.og_site_name,
              ok: link.fetched_ok,
            }
          : null,
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, editPin?.id]);

  function reset() {
    for (const item of items) if (item.kind === "new") URL.revokeObjectURL(item.url);
    setStep(0);
    setItems([]);
    setLinkUrl("");
    setPreview(null);
    setTitle("");
    setCategory("other");
    setDescription("");
    setLocation({ lng: THAILAND_CENTER[0], lat: THAILAND_CENTER[1] });
    setSaving(false);
    setError(null);
  }

  function dismiss() {
    close();
    reset();
  }

  function addFiles(files: File[]) {
    const images = files.filter((f) => f.type.startsWith("image/"));
    setItems((current) =>
      [
        ...current,
        ...images.map((file) => ({
          key: crypto.randomUUID(),
          kind: "new" as const,
          file,
          url: URL.createObjectURL(file),
          spoiler: false,
        })),
      ].slice(0, MAX_PHOTOS),
    );
  }

  function toggleSpoiler(key: string) {
    setItems((current) =>
      current.map((i) => (i.key === key ? { ...i, spoiler: !i.spoiler } : i)),
    );
  }

  function removeItem(key: string) {
    setItems((current) => {
      const item = current.find((i) => i.key === key);
      if (item?.kind === "new") URL.revokeObjectURL(item.url);
      return current.filter((i) => i.key !== key);
    });
  }

  function onDragEnd(e: DragEndEvent) {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    setItems((current) => {
      const oldIndex = current.findIndex((i) => i.key === active.id);
      const newIndex = current.findIndex((i) => i.key === over.id);
      return arrayMove(current, oldIndex, newIndex);
    });
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
      const fields = {
        title: title.trim(),
        description: description.trim() || null,
        lat: location.lat,
        lng: location.lng,
        category,
      };

      let pinId: string;
      if (editPin) {
        pinId = editPin.id;
        const { error: pinError } = await db.from("pins").update(fields).eq("id", pinId);
        if (pinError) throw pinError;

        // Photos: delete the removed, re-order the kept, upload the new
        const keptKeys = new Set(items.map((i) => i.key));
        const removed = editPin.pin_images.filter((img) => !keptKeys.has(img.id));
        if (removed.length) {
          const { error: delError } = await db
            .from("pin_images")
            .delete()
            .in("id", removed.map((r) => r.id));
          if (delError) throw delError;
          await db.storage
            .from("pin-images")
            .remove(removed.flatMap((r) => [r.storage_path, ...(r.thumb_path ? [r.thumb_path] : [])]));
        }
        for (const [index, item] of items.entries()) {
          if (item.kind === "existing") {
            const { error: sortError } = await db
              .from("pin_images")
              .update({ sort_order: index, is_spoiler: item.spoiler })
              .eq("id", item.image.id);
            if (sortError) throw sortError;
          } else {
            const uploaded = await uploadPinImage(item.file, pinId);
            const { error: imgError } = await db
              .from("pin_images")
              .insert({ pin_id: pinId, ...uploaded, sort_order: index, is_spoiler: item.spoiler });
            if (imgError) throw imgError;
          }
        }

        // Link: replace when changed, drop when cleared
        const url = linkUrl.trim();
        const existingUrl = editPin.pin_links[0]?.url ?? "";
        if (url !== existingUrl) {
          const { error: linkDelError } = await db.from("pin_links").delete().eq("pin_id", pinId);
          if (linkDelError) throw linkDelError;
          if (url) {
            const { error: linkError } = await db.from("pin_links").insert({
              pin_id: pinId,
              url,
              og_title: preview?.title ?? null,
              og_description: preview?.description ?? null,
              og_image: preview?.image ?? null,
              og_site_name: preview?.siteName ?? null,
              fetched_ok: preview?.ok ?? false,
            });
            if (linkError) throw linkError;
          }
        }
      } else {
        const { data: pin, error: pinError } = await db
          .from("pins")
          .insert({ ...fields, created_by: member.id })
          .select("id")
          .single();
        if (pinError) throw pinError;
        pinId = pin.id;

        for (const [index, item] of items.entries()) {
          if (item.kind !== "new") continue;
          const uploaded = await uploadPinImage(item.file, pinId);
          const { error: imgError } = await db
            .from("pin_images")
            .insert({ pin_id: pinId, ...uploaded, sort_order: index, is_spoiler: item.spoiler });
          if (imgError) throw imgError;
        }

        const url = linkUrl.trim();
        if (url) {
          const { error: linkError } = await db.from("pin_links").insert({
            pin_id: pinId,
            url,
            og_title: preview?.title ?? null,
            og_description: preview?.description ?? null,
            og_image: preview?.image ?? null,
            og_site_name: preview?.siteName ?? null,
            fetched_ok: preview?.ok ?? false,
          });
          if (linkError) throw linkError;
        }
      }

      await qc.invalidateQueries({ queryKey: ["pins"] });
      const dest = { lng: location.lng, lat: location.lat };
      dismiss();
      setFlyTo(dest);
      selectPin(pinId);
    } catch (e) {
      setError(e instanceof Error ? e.message : "That didn't stick. Try again?");
      setSaving(false);
    }
  }

  if (!open) return null;

  const canNext = step === 1 ? title.trim().length > 0 : true;
  const editing = Boolean(editPin);

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-paper">
      {/* Header */}
      <header className="flex items-center justify-between px-4 pb-2 pt-[calc(env(safe-area-inset-top)+12px)]">
        <div>
          <p className="font-hand text-lg leading-none text-sea-deep">
            {editing ? "fixing up your idea" : `step ${step + 1} of 3`}
          </p>
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
                  if (picked.length) addFiles(picked);
                  e.target.value = "";
                }}
              />
              <button
                onClick={() => fileInput.current?.click()}
                onDragOver={(e) => {
                  e.preventDefault();
                  e.dataTransfer.dropEffect = "copy";
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  addFiles(Array.from(e.dataTransfer.files));
                }}
                disabled={items.length >= MAX_PHOTOS}
                className="flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-ink/25 bg-paper-deep/50 py-8 font-bold text-ink-soft active:scale-[0.98] disabled:opacity-50"
              >
                <Camera size={22} />
                {items.length >= MAX_PHOTOS
                  ? "That's the lot"
                  : items.length
                    ? "Add more photos (or drop them here)"
                    : "Add photos (or drop them here)"}
                <span
                  className={`rounded-full px-2 py-0.5 text-xs tabular-nums ${
                    items.length >= MAX_PHOTOS ? "bg-chili text-paper" : "bg-ink/10"
                  }`}
                >
                  {items.length}/{MAX_PHOTOS}
                </span>
              </button>
              {items.length > 0 && (
                <>
                  <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
                    <SortableContext items={items.map((i) => i.key)} strategy={horizontalListSortingStrategy}>
                      <div className="no-scrollbar mt-3 flex gap-3 overflow-x-auto py-1">
                        {items.map((item, i) => (
                          <SortablePhoto
                            key={item.key}
                            item={item}
                            index={i}
                            onRemove={removeItem}
                            onToggleSpoiler={toggleSpoiler}
                          />
                        ))}
                      </div>
                    </SortableContext>
                  </DndContext>
                  <p className="mt-1 font-hand text-lg text-ink-soft/70">
                    {items.length > 1 ? "hold and drag to reorder. first photo is the star ⭐ " : ""}
                    tap 🙈 to mark a photo as a spoiler
                  </p>
                </>
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
            <LocationPicker
              onChange={setLocation}
              initial={editing ? { lng: editPin!.lng, lat: editPin!.lat } : undefined}
            />
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
            {saving ? "Saving..." : editing ? "Save changes ✅" : "Pin it 📌"}
          </button>
        )}
      </footer>
    </div>
  );
}

function SortablePhoto({
  item,
  index,
  onRemove,
  onToggleSpoiler,
}: {
  item: PhotoItem;
  index: number;
  onRemove: (key: string) => void;
  onToggleSpoiler: (key: string) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: item.key });

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={`relative shrink-0 ${isDragging ? "z-10" : ""}`}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        {...attributes}
        {...listeners}
        src={itemSrc(item)}
        alt=""
        draggable={false}
        className={`h-24 w-24 touch-none rounded-xl border-2 border-white object-cover shadow-paper ${
          isDragging ? "shadow-lifted" : ""
        } ${item.spoiler ? "blur-[6px]" : ""}`}
        style={{ transform: `rotate(${index % 2 ? 2 : -2}deg)` }}
      />
      {index === 0 && (
        <span className="absolute -left-1.5 -top-1.5 rounded-full bg-marigold px-1.5 py-0.5 text-[10px] font-bold text-paper shadow-paper">
          ⭐
        </span>
      )}
      <button
        onClick={() => onToggleSpoiler(item.key)}
        aria-label={item.spoiler ? "Unmark spoiler" : "Mark as spoiler"}
        className={`absolute -left-1.5 bottom-0 flex h-6 w-6 items-center justify-center rounded-full text-[13px] shadow-paper ${
          item.spoiler ? "bg-plum text-paper" : "bg-paper"
        }`}
      >
        🙈
      </button>
      <button
        onClick={() => onRemove(item.key)}
        aria-label="Remove photo"
        className="absolute -right-1.5 -top-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-ink text-paper"
      >
        <X size={13} />
      </button>
    </div>
  );
}
