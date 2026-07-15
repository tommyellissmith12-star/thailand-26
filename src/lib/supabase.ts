import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const supabaseConfigured = Boolean(url && anonKey);

let client: SupabaseClient | null = null;

export function supabase(): SupabaseClient {
  if (!client) {
    client = createClient(
      url ?? "https://placeholder.supabase.co",
      anonKey ?? "placeholder-anon-key",
    );
  }
  return client;
}

export function publicImageUrl(path: string): string {
  return supabase().storage.from("pin-images").getPublicUrl(path).data.publicUrl;
}
