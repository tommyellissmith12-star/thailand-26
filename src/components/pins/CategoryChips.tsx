"use client";

import { CATEGORIES, CATEGORY_KEYS, type Category } from "@/lib/constants";

export default function CategoryChips({
  value,
  onChange,
}: {
  value: Category[] | null; // null = all
  onChange: (v: Category[] | null) => void;
}) {
  function toggle(cat: Category) {
    if (value === null) {
      onChange([cat]);
    } else if (value.includes(cat)) {
      const next = value.filter((c) => c !== cat);
      onChange(next.length ? next : null);
    } else {
      onChange([...value, cat]);
    }
  }

  return (
    <div className="no-scrollbar flex gap-2 overflow-x-auto px-4 pb-2">
      {CATEGORY_KEYS.map((key) => {
        const cat = CATEGORIES[key];
        const active = value === null || value.includes(key);
        return (
          <button
            key={key}
            onClick={() => toggle(key)}
            className={`flex shrink-0 items-center gap-1.5 rounded-full border-2 px-3 py-1.5 text-sm font-bold shadow-paper transition-all active:scale-90 ${
              active ? "text-paper" : "bg-paper/80 text-ink-soft opacity-60"
            }`}
            style={active ? { background: cat.color, borderColor: cat.color } : { borderColor: "#d5c69e" }}
          >
            <span>{cat.emoji}</span>
            {cat.label}
          </button>
        );
      })}
    </div>
  );
}
