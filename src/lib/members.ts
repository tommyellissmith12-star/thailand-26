"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase, supabaseConfigured } from "./supabase";
import { MEMBERS, type Member } from "./constants";

// Names, emoji, and profile photos are editable in-app and live in the
// members table; ids, colours, approver flags, and picker tags stay in code.
export interface MemberProfile extends Member {
  photoPath: string | null;
}

interface MemberRow {
  id: string;
  name: string;
  avatar: string;
  photo_path: string | null;
}

const FALLBACK: MemberProfile[] = MEMBERS.map((m) => ({ ...m, photoPath: null }));

export function useMembers(): MemberProfile[] {
  const { data } = useQuery({
    queryKey: ["members"],
    enabled: supabaseConfigured,
    staleTime: 60_000,
    queryFn: async (): Promise<MemberRow[]> => {
      const { data, error } = await supabase().from("members").select("*");
      if (error) throw error;
      return (data ?? []) as MemberRow[];
    },
  });

  return useMemo(() => {
    if (!data) return FALLBACK;
    return MEMBERS.map((base) => {
      const row = data.find((r) => r.id === base.id);
      return {
        ...base,
        name: row?.name || base.name,
        avatar: row?.avatar || base.avatar,
        photoPath: row?.photo_path ?? null,
      };
    });
  }, [data]);
}

export function useMembersMap(): Map<string, MemberProfile> {
  const members = useMembers();
  return useMemo(() => new Map(members.map((m) => [m.id, m])), [members]);
}
