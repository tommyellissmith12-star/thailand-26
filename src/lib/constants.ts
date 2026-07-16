export type Category =
  | "food" | "beach" | "temple" | "island"
  | "activity" | "stay" | "town" | "other";

export type PinStatus = "idea" | "shortlist" | "stamped" | "torched" | "shat";

// Jon & Rachel's rejection verdicts. Anything here is dead unless mercy is shown.
export const REJECTED: PinStatus[] = ["torched", "shat"];
export const isRejected = (s: PinStatus) => REJECTED.includes(s);

export interface Member {
  id: string;
  name: string;
  avatar: string;
  color: string;
  isApprover: boolean;
}

// Fixed family roster. Ids match supabase/seed.sql exactly.
export const MEMBERS: Member[] = [
  { id: "00000000-0000-4000-8000-000000000001", name: "Jon",    avatar: "🤴", color: "#3E6C9E", isApprover: true },
  { id: "00000000-0000-4000-8000-000000000002", name: "Rachel", avatar: "👸", color: "#C74A34", isApprover: true },
  { id: "00000000-0000-4000-8000-000000000003", name: "Ruby",   avatar: "🌼", color: "#7E5A9B", isApprover: false },
  { id: "00000000-0000-4000-8000-000000000004", name: "Tom",    avatar: "🤠", color: "#2A9D8F", isApprover: false },
  { id: "00000000-0000-4000-8000-000000000005", name: "Neve",   avatar: "🌺", color: "#F2A93B", isApprover: false },
  { id: "00000000-0000-4000-8000-000000000006", name: "Dale",   avatar: "🏄‍♂️", color: "#588B4C", isApprover: false },
];

export const memberById = (id: string | null | undefined): Member | undefined =>
  MEMBERS.find((m) => m.id === id);

export const CATEGORIES: Record<Category, { label: string; emoji: string; color: string }> = {
  food:     { label: "Food",     emoji: "🍜", color: "#C74A34" },
  beach:    { label: "Beach",    emoji: "🏖️", color: "#E8875C" },
  temple:   { label: "Temple",   emoji: "🛕", color: "#C9A227" },
  island:   { label: "Island",   emoji: "🏝️", color: "#2A9D8F" },
  activity: { label: "Activity", emoji: "🪂", color: "#588B4C" },
  stay:     { label: "Stay",     emoji: "🛏️", color: "#7E5A9B" },
  town:     { label: "Town",     emoji: "🏙️", color: "#3E6C9E" },
  other:    { label: "Idea",     emoji: "📌", color: "#6B705C" },
};

export const CATEGORY_KEYS = Object.keys(CATEGORIES) as Category[];

export const REACTION_EMOJIS = ["❤️", "🔥", "😍", "🤔", "💰"] as const;

// Trip window: Dec 27 2026 to Jan 24 2027.
export const TRIP_START = "2026-12-27";
export const TRIP_END = "2027-01-24";

export function tripDays(): string[] {
  const days: string[] = [];
  const d = new Date(TRIP_START + "T12:00:00Z");
  const end = new Date(TRIP_END + "T12:00:00Z");
  while (d <= end) {
    days.push(d.toISOString().slice(0, 10));
    d.setUTCDate(d.getUTCDate() + 1);
  }
  return days;
}

export function dayLabel(iso: string): { num: number; pretty: string } {
  const days = tripDays();
  const num = days.indexOf(iso) + 1;
  const date = new Date(iso + "T12:00:00Z");
  const pretty = date.toLocaleDateString("en-GB", {
    weekday: "short", day: "numeric", month: "short", timeZone: "UTC",
  });
  return { num, pretty };
}

// Camera bounds: Thailand plus a little breathing room.
export const THAILAND_BOUNDS: [[number, number], [number, number]] = [
  [95.5, 4.5],
  [107.5, 21.5],
];
export const THAILAND_CENTER: [number, number] = [100.9, 13.6];
