"use client";

import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase, supabaseConfigured } from "./supabase";

// One shared channel; every change just invalidates the relevant query so the
// UI refetches. Dumb and reliable beats clever cache surgery here.
export function useBoardChannel() {
  const qc = useQueryClient();

  useEffect(() => {
    if (!supabaseConfigured) return;
    const channel = supabase()
      .channel("board")
      .on("postgres_changes", { event: "*", schema: "public", table: "pins" }, () =>
        qc.invalidateQueries({ queryKey: ["pins"] }),
      )
      .on("postgres_changes", { event: "*", schema: "public", table: "reactions" }, () =>
        qc.invalidateQueries({ queryKey: ["pins"] }),
      )
      .on("postgres_changes", { event: "*", schema: "public", table: "comments" }, (payload) => {
        const pinId =
          (payload.new as { pin_id?: string })?.pin_id ??
          (payload.old as { pin_id?: string })?.pin_id;
        if (pinId) qc.invalidateQueries({ queryKey: ["comments", pinId] });
        qc.invalidateQueries({ queryKey: ["comment-counts"] });
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "itinerary_items" }, () =>
        qc.invalidateQueries({ queryKey: ["itinerary"] }),
      )
      .on("postgres_changes", { event: "*", schema: "public", table: "members" }, () =>
        qc.invalidateQueries({ queryKey: ["members"] }),
      )
      .on("postgres_changes", { event: "*", schema: "public", table: "notifications" }, () =>
        qc.invalidateQueries({ queryKey: ["notifications"] }),
      )
      .on("postgres_changes", { event: "*", schema: "public", table: "app_settings" }, () =>
        qc.invalidateQueries({ queryKey: ["settings"] }),
      )
      .subscribe();

    return () => {
      supabase().removeChannel(channel);
    };
  }, [qc]);
}
