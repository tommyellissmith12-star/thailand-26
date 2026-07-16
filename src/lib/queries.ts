"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "./supabase";
import type { Comment, ItineraryItem, Pin } from "./types";
import type { Category, PinStatus } from "./constants";

const PIN_SELECT = "*, pin_images(*), pin_links(*), reactions(*)";

export function usePins() {
  return useQuery({
    queryKey: ["pins"],
    queryFn: async (): Promise<Pin[]> => {
      const { data, error } = await supabase()
        .from("pins")
        .select(PIN_SELECT)
        .order("created_at", { ascending: false })
        .order("sort_order", { referencedTable: "pin_images", ascending: true });
      if (error) throw error;
      return (data ?? []) as Pin[];
    },
  });
}

export function useComments(pinId: string | null) {
  return useQuery({
    queryKey: ["comments", pinId],
    enabled: Boolean(pinId),
    queryFn: async (): Promise<Comment[]> => {
      const { data, error } = await supabase()
        .from("comments")
        .select("*")
        .eq("pin_id", pinId!)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data ?? []) as Comment[];
    },
  });
}

export function useCommentCounts() {
  return useQuery({
    queryKey: ["comment-counts"],
    queryFn: async (): Promise<Record<string, number>> => {
      const { data, error } = await supabase().from("comments").select("pin_id");
      if (error) throw error;
      const counts: Record<string, number> = {};
      for (const row of data ?? []) counts[row.pin_id] = (counts[row.pin_id] ?? 0) + 1;
      return counts;
    },
  });
}

export function useItinerary() {
  return useQuery({
    queryKey: ["itinerary"],
    queryFn: async (): Promise<ItineraryItem[]> => {
      const { data, error } = await supabase()
        .from("itinerary_items")
        .select("*")
        .order("day")
        .order("sort_order");
      if (error) throw error;
      return (data ?? []) as ItineraryItem[];
    },
  });
}

export function useUpdateProfile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (args: {
      memberId: string;
      name: string;
      avatar: string;
      photoPath: string | null;
    }) => {
      const { error } = await supabase()
        .from("members")
        .update({ name: args.name, avatar: args.avatar, photo_path: args.photoPath })
        .eq("id", args.memberId);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["members"] }),
  });
}

export interface NewPin {
  title: string;
  description: string | null;
  lat: number;
  lng: number;
  category: Category;
  created_by: string;
}

export function useCreatePin() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (pin: NewPin): Promise<Pin> => {
      const { data, error } = await supabase()
        .from("pins")
        .insert(pin)
        .select(PIN_SELECT)
        .single();
      if (error) throw error;
      return data as Pin;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["pins"] }),
  });
}

export function useSetPinStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (args: { pinId: string; status: PinStatus; memberId: string }) => {
      const db = supabase();
      // stamped_by doubles as "verdict by" for torched/shat.
      const attributed = ["stamped", "torched", "shat"].includes(args.status);
      const { error } = await db
        .from("pins")
        .update({
          status: args.status,
          stamped_by: attributed ? args.memberId : null,
        })
        .eq("id", args.pinId);
      if (error) throw error;
      // A pin that is no longer stamped has no business in the itinerary.
      if (args.status !== "stamped") {
        await db.from("itinerary_items").delete().eq("pin_id", args.pinId);
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["pins"] });
      qc.invalidateQueries({ queryKey: ["itinerary"] });
    },
  });
}

export function useDeletePin() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (pinId: string) => {
      const { error } = await supabase().from("pins").delete().eq("id", pinId);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["pins"] }),
  });
}

// Optimistic: the heart lands instantly, realtime refetch reconciles.
export function useToggleReaction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (args: { pinId: string; memberId: string; emoji: string; active: boolean }) => {
      const db = supabase();
      if (args.active) {
        const { error } = await db.from("reactions").delete().match({
          pin_id: args.pinId, member_id: args.memberId, emoji: args.emoji,
        });
        if (error) throw error;
      } else {
        const { error } = await db.from("reactions").insert({
          pin_id: args.pinId, member_id: args.memberId, emoji: args.emoji,
        });
        if (error) throw error;
      }
    },
    onMutate: async (args) => {
      await qc.cancelQueries({ queryKey: ["pins"] });
      const previous = qc.getQueryData<Pin[]>(["pins"]);
      qc.setQueryData<Pin[]>(["pins"], (pins) =>
        (pins ?? []).map((p) => {
          if (p.id !== args.pinId) return p;
          const reactions = args.active
            ? p.reactions.filter(
                (r) => !(r.member_id === args.memberId && r.emoji === args.emoji),
              )
            : [...p.reactions, { pin_id: p.id, member_id: args.memberId, emoji: args.emoji }];
          return { ...p, reactions };
        }),
      );
      return { previous };
    },
    onError: (_err, _args, ctx) => {
      if (ctx?.previous) qc.setQueryData(["pins"], ctx.previous);
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ["pins"] }),
  });
}

export function useAddComment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (args: { pinId: string; memberId: string; body: string }) => {
      const { error } = await supabase().from("comments").insert({
        pin_id: args.pinId, member_id: args.memberId, body: args.body,
      });
      if (error) throw error;
    },
    onSuccess: (_data, args) => {
      qc.invalidateQueries({ queryKey: ["comments", args.pinId] });
      qc.invalidateQueries({ queryKey: ["comment-counts"] });
    },
  });
}

export function useAssignToDay() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (args: { pinId: string; day: string; sortOrder: number }) => {
      const { error } = await supabase().from("itinerary_items").upsert(
        { pin_id: args.pinId, day: args.day, sort_order: args.sortOrder },
        { onConflict: "day,pin_id" },
      );
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["itinerary"] }),
  });
}

export function useRemoveItineraryItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase().from("itinerary_items").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["itinerary"] }),
  });
}

export function useReorderDay() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (items: { id: string; sort_order: number }[]) => {
      const db = supabase();
      const results = await Promise.all(
        items.map((it) =>
          db.from("itinerary_items").update({ sort_order: it.sort_order }).eq("id", it.id),
        ),
      );
      const failed = results.find((r) => r.error);
      if (failed?.error) throw failed.error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["itinerary"] }),
  });
}
