import type { Category, PinStatus } from "./constants";

export interface PinImage {
  id: string;
  pin_id: string;
  storage_path: string;
  thumb_path: string | null;
  width: number | null;
  height: number | null;
  sort_order: number;
}

export interface PinLink {
  id: string;
  pin_id: string;
  url: string;
  og_title: string | null;
  og_description: string | null;
  og_image: string | null;
  og_site_name: string | null;
  fetched_ok: boolean;
}

export interface Reaction {
  pin_id: string;
  member_id: string;
  emoji: string;
}

export interface Comment {
  id: string;
  pin_id: string;
  member_id: string;
  body: string;
  created_at: string;
}

export interface Pin {
  id: string;
  title: string;
  description: string | null;
  lat: number;
  lng: number;
  category: Category;
  status: PinStatus;
  created_by: string;
  stamped_by: string | null;
  created_at: string;
  pin_images: PinImage[];
  pin_links: PinLink[];
  reactions: Reaction[];
}

export interface ItineraryItem {
  id: string;
  day: string; // ISO date
  pin_id: string;
  sort_order: number;
  note: string | null;
}

export interface LinkPreview {
  url: string;
  title: string | null;
  description: string | null;
  image: string | null;
  siteName: string | null;
  ok: boolean;
}
