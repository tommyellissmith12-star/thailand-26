"use client";

import { createContext, useContext } from "react";
import type { Member } from "./constants";

const KEY = "thailand26.member";

export function loadMemberId(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(KEY);
}

export function saveMemberId(id: string | null) {
  if (id) localStorage.setItem(KEY, id);
  else localStorage.removeItem(KEY);
}

export interface MemberContextValue {
  member: Member | null;
  ready: boolean; // false until localStorage has been read post-hydration
  setMember: (m: Member | null) => void;
}

export const MemberContext = createContext<MemberContextValue>({
  member: null,
  ready: false,
  setMember: () => {},
});

export const useMember = () => useContext(MemberContext);
