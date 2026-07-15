import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// Hit weekly by Vercel cron (see vercel.json) so the Supabase free-tier
// project never pauses from inactivity between planning bursts.
export async function GET() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return NextResponse.json({ ok: false, reason: "unconfigured" });

  const { error } = await createClient(url, key).from("members").select("id").limit(1);
  return NextResponse.json({ ok: !error });
}
