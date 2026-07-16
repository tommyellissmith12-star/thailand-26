# Thailand '26 — the family trip board

Private moodboard for the Dec 27 → Jan roadtrip. Everyone pins ideas, photos and links onto a map of Thailand, votes with reactions, argues in the comments, and Dad or Rach stamp the winners into the itinerary.

## Stack

Next.js 15 (App Router) + Supabase (Postgres, Storage, Realtime) + MapLibre GL with OpenFreeMap tiles. Deployed on Vercel. No email auth: one family PIN plus a "who are you" picker.

## One-time setup

1. **Supabase**: create a free project at supabase.com, then in the SQL editor run `supabase/schema.sql` followed by `supabase/seed.sql`. That creates all tables, permissive RLS, the realtime publication, and the `pin-images` storage bucket.
2. **Env vars**: copy `.env.example` to `.env.local` and fill in the project URL + anon key (Supabase dashboard → Settings → API) and pick a 4-digit `FAMILY_PIN`.
3. **Run locally**: `npm install` then `npm run dev`.
4. **Deploy**: push to a GitHub repo, import into Vercel, add the same three env vars. The weekly cron in `vercel.json` pings `/api/keep-alive` so the Supabase free project never pauses from inactivity.
5. Send the family the URL and the PIN. Tell them to "Add to Home Screen" — it runs full-screen like an app.

## How it works

- **Map** is home: pins cluster as you zoom out, tap one for photos, votes and comments. "The Plan" toggle shows only stamped stops plus the dashed roadtrip route between them.
- **+** adds an idea in 3 steps: photos or a link, words, then drag the map under the crosshair pin (with place search).
- **Feed** is the same board as a scrollable list. **Board** is the leaderboard by reactions.
- **Days** is the itinerary: stamped ideas wait in the tray, tap to give them a day, drag to reorder within a day.
- Only Dad and Rach see the stamp button. Everyone can vote and comment.

## Honest security note

The Supabase anon key ships in the browser bundle with permissive RLS, so the PIN keeps out strangers with the URL, not a determined nerd with devtools. Fine for a family board with nothing sensitive in it. If that ever changes, the upgrade path is minting a signed JWT in `/api/verify-pin` and tightening the RLS policies (about an hour of work).

## Notes

- Photos are compressed to webp client-side (~400KB full, ~40KB thumb) before upload, so the 1GB free storage tier goes a very long way, and sideways iPhone photos come out upright.
- Instagram links save without a preview (they block scrapers); TikTok and YouTube get proper cards via oEmbed.
- Trip dates live in `src/lib/constants.ts` (`TRIP_START` / `TRIP_END`). Adjust when flights are booked.
- The map style is pinned locally at `public/map-style.json`; edit it in Maputnik if you want a different look.
