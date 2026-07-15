"use client";

import { useMemo, useState } from "react";
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
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, MapPin, X } from "lucide-react";
import { CATEGORIES, dayLabel, tripDays } from "@/lib/constants";
import {
  useAssignToDay,
  useItinerary,
  usePins,
  useRemoveItineraryItem,
  useReorderDay,
} from "@/lib/queries";
import { publicImageUrl } from "@/lib/supabase";
import { useUiStore } from "@/lib/ui-store";
import type { ItineraryItem, Pin } from "@/lib/types";

export default function ItineraryPage() {
  const { data: pins = [] } = usePins();
  const { data: items = [] } = useItinerary();
  const assign = useAssignToDay();
  const [pickingFor, setPickingFor] = useState<Pin | null>(null);

  const days = tripDays();
  const pinById = useMemo(() => new Map(pins.map((p) => [p.id, p])), [pins]);
  const assignedPinIds = useMemo(() => new Set(items.map((i) => i.pin_id)), [items]);

  const stamped = pins.filter((p) => p.status === "stamped");
  const tray = stamped.filter((p) => !assignedPinIds.has(p.id));

  const itemsByDay = useMemo(() => {
    const map = new Map<string, ItineraryItem[]>();
    for (const item of items) {
      const list = map.get(item.day) ?? [];
      list.push(item);
      map.set(item.day, list);
    }
    for (const list of map.values()) list.sort((a, b) => a.sort_order - b.sort_order);
    return map;
  }, [items]);

  function pickDay(day: string) {
    if (!pickingFor) return;
    const count = itemsByDay.get(day)?.length ?? 0;
    assign.mutate({ pinId: pickingFor.id, day, sortOrder: count });
    setPickingFor(null);
  }

  return (
    <main className="mx-auto min-h-dvh max-w-lg px-4 pb-28 pt-[calc(env(safe-area-inset-top)+16px)]">
      <header className="mb-4">
        <p className="font-hand text-xl leading-none text-sea-deep">the actual roadtrip</p>
        <h1 className="font-display text-3xl font-black">Day by Day</h1>
      </header>

      {/* Tray of stamped-but-unplanned ideas */}
      <section className="mb-6 rounded-2xl border-2 border-dashed border-chili/40 bg-chili/5 p-3">
        <h2 className="font-hand text-xl text-chili">stamped, not scheduled yet</h2>
        {stamped.length === 0 && (
          <p className="mt-1 text-sm text-ink-soft">
            Nothing is locked in yet. Once Jon or Rachel stamp an idea, it lands here
            ready to be given a day.
          </p>
        )}
        {stamped.length > 0 && tray.length === 0 && (
          <p className="mt-1 font-hand text-lg text-ink-soft">
            all scheduled. look at us go 🎉
          </p>
        )}
        <div className="no-scrollbar mt-2 flex gap-2 overflow-x-auto">
          {tray.map((pin) => (
            <button
              key={pin.id}
              onClick={() => setPickingFor(pin)}
              className="flex shrink-0 items-center gap-2 rounded-xl border-2 border-ink/10 bg-paper px-3 py-2 shadow-paper active:scale-95"
            >
              <span>{CATEGORIES[pin.category].emoji}</span>
              <span className="max-w-40 truncate text-sm font-bold">{pin.title}</span>
              <span className="rounded-full bg-chili px-1.5 py-0.5 text-[10px] font-bold text-paper">
                + day
              </span>
            </button>
          ))}
        </div>
      </section>

      {/* Days */}
      <div className="space-y-4">
        {days.map((day) => (
          <DaySection
            key={day}
            day={day}
            items={itemsByDay.get(day) ?? []}
            pinById={pinById}
          />
        ))}
      </div>

      {/* Day picker overlay */}
      {pickingFor && (
        <div
          className="fixed inset-0 z-50 flex items-end bg-ink/40"
          onClick={() => setPickingFor(null)}
        >
          <div
            className="max-h-[75dvh] w-full overflow-y-auto rounded-t-3xl bg-paper p-4 pb-[calc(env(safe-area-inset-bottom)+16px)]"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="font-hand text-xl text-sea-deep">which day for</p>
            <h3 className="mb-3 font-display text-xl font-black">{pickingFor.title}?</h3>
            <ul className="space-y-2">
              {days.map((day) => {
                const { num, pretty } = dayLabel(day);
                const count = itemsByDay.get(day)?.length ?? 0;
                return (
                  <li key={day}>
                    <button
                      onClick={() => pickDay(day)}
                      className="flex w-full items-center justify-between rounded-xl border-2 border-ink/10 bg-white px-4 py-3 shadow-paper active:scale-[0.98]"
                    >
                      <span className="font-bold">
                        <span className="font-display text-chili">Day {num}</span>
                        <span className="ml-2 text-sm text-ink-soft">{pretty}</span>
                      </span>
                      <span className="text-xs text-ink-soft">
                        {count ? `${count} planned` : "free"}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>
      )}
    </main>
  );
}

function DaySection({
  day,
  items,
  pinById,
}: {
  day: string;
  items: ItineraryItem[];
  pinById: Map<string, Pin>;
}) {
  const { num, pretty } = dayLabel(day);
  const reorder = useReorderDay();
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 220, tolerance: 8 } }),
  );

  function onDragEnd(e: DragEndEvent) {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const oldIndex = items.findIndex((i) => i.id === active.id);
    const newIndex = items.findIndex((i) => i.id === over.id);
    const next = arrayMove(items, oldIndex, newIndex);
    reorder.mutate(next.map((it, i) => ({ id: it.id, sort_order: i })));
  }

  return (
    <section>
      <div className="flex items-baseline gap-2">
        <h2 className="font-display text-lg font-black text-chili">Day {num}</h2>
        <span className="text-sm text-ink-soft">{pretty}</span>
        <span className="dashed-route ml-2 h-0.5 flex-1 opacity-30" />
      </div>
      {items.length === 0 ? (
        <p className="mt-1 font-hand text-lg text-ink-soft/50">nothing yet, wide open</p>
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
          <SortableContext items={items.map((i) => i.id)} strategy={verticalListSortingStrategy}>
            <ul className="mt-2 space-y-2">
              {items.map((item) => {
                const pin = pinById.get(item.pin_id);
                return pin ? <SortableStop key={item.id} item={item} pin={pin} /> : null;
              })}
            </ul>
          </SortableContext>
        </DndContext>
      )}
    </section>
  );
}

function SortableStop({ item, pin }: { item: ItineraryItem; pin: Pin }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: item.id });
  const remove = useRemoveItineraryItem();
  const selectPin = useUiStore((s) => s.selectPin);
  const thumb = pin.pin_images[0]?.thumb_path ?? pin.pin_images[0]?.storage_path;

  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={`flex items-center gap-2 rounded-xl bg-white px-2 py-2 shadow-paper ${
        isDragging ? "z-10 shadow-lifted" : ""
      }`}
    >
      <button
        {...attributes}
        {...listeners}
        aria-label="Reorder"
        className="touch-none p-1 text-ink-soft/60"
      >
        <GripVertical size={18} />
      </button>
      {thumb ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={publicImageUrl(thumb)}
          alt=""
          className="h-10 w-10 rounded-lg object-cover"
        />
      ) : (
        <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-paper-deep text-lg">
          {CATEGORIES[pin.category].emoji}
        </span>
      )}
      <button onClick={() => selectPin(pin.id)} className="min-w-0 flex-1 text-left">
        <span className="block truncate text-sm font-bold">{pin.title}</span>
        <span className="flex items-center gap-1 text-[11px] text-ink-soft">
          <MapPin size={10} />
          {CATEGORIES[pin.category].label}
        </span>
      </button>
      <button
        onClick={() => remove.mutate(item.id)}
        aria-label="Remove from day"
        className="p-1.5 text-ink-soft/50 active:scale-90"
      >
        <X size={16} />
      </button>
    </li>
  );
}
