"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Map, ListTree, CalendarDays, Trophy, Plus } from "lucide-react";
import { useUiStore } from "@/lib/ui-store";

const TABS = [
  { href: "/", label: "Map", icon: Map },
  { href: "/feed", label: "Feed", icon: ListTree },
  { href: "/itinerary", label: "Days", icon: CalendarDays },
  { href: "/board", label: "Board", icon: Trophy },
];

export default function TabBar() {
  const pathname = usePathname();
  const openAddPin = useUiStore((s) => s.openAddPin);

  if (pathname === "/enter") return null;

  const left = TABS.slice(0, 2);
  const right = TABS.slice(2);

  const renderTab = ({ href, label, icon: Icon }: (typeof TABS)[number]) => {
    const active = pathname === href;
    return (
      <Link
        key={href}
        href={href}
        className={`flex flex-1 flex-col items-center gap-0.5 py-2 transition-colors ${
          active ? "text-chili" : "text-ink-soft"
        }`}
      >
        <Icon size={22} strokeWidth={active ? 2.6 : 2} />
        <span className={`text-[10px] tracking-wide ${active ? "font-bold" : ""}`}>
          {label}
        </span>
      </Link>
    );
  };

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 safe-bottom border-t-2 border-ink/10 bg-paper/95 backdrop-blur">
      <div className="mx-auto flex max-w-lg items-center">
        {left.map(renderTab)}
        <button
          onClick={openAddPin}
          aria-label="Pin an idea"
          className="relative -top-4 mx-1 flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-chili text-paper shadow-lifted transition-transform active:scale-90"
        >
          <Plus size={28} strokeWidth={2.8} />
        </button>
        {right.map(renderTab)}
      </div>
    </nav>
  );
}
