# Thailand '26 — project context for Claude

Family trip moodboard for Tom's family (6 people), live at https://thailand.tez.earth
(also thailand-26.vercel.app). PIN 2712. Trip: 27 Dec 2026 to 24 Jan 2027.

## The people

Dad (🤴 King of the Trip) and Rach (👸 Queen of the Trip) are approvers: only they
can stamp ideas into the plan or "shit on" them. Ruby, Tom, Neve, Dale contribute
and vote. Names/emoji/photos are editable in-app (members table); ids, colours,
approver flags live in `src/lib/constants.ts` and MUST match `supabase/seed.sql`.

## Stack and architecture

Next.js 15 App Router + Supabase (project `jcuvcefsoloelimksecj`: Postgres,
Storage bucket `pin-images`, Realtime) + MapLibre GL (OpenFreeMap tiles, custom
style pinned at `public/map-style.json`). ~95% client components talking to
Supabase directly; TanStack Query cache invalidated by one realtime channel
(`src/lib/realtime.ts`). Server surface is only middleware (PIN cookie) and
api routes: verify-pin, link-preview (oEmbed for TikTok/YouTube, OG scrape
otherwise, Instagram gets a graceful fallback), keep-alive (weekly Vercel cron
so the free Supabase project never pauses — exempt from PIN middleware).

Auth is deliberately family-grade: PIN in an httpOnly cookie + anon key with
permissive RLS. Do not "upgrade" it without being asked.

## Conventions

- Schema changes = idempotent SQL files in `supabase/` (0002, 0003...), applied
  manually via the Supabase SQL editor or management API, then committed as a
  record. Never the supabase CLI.
- Design system: warm paper travel-journal. Fraunces (display), Karla (body),
  Caveat (handwritten accents). Tokens in `globals.css` @theme. UK English,
  no em dashes in user-facing copy, playful micro-copy throughout.
- Photos: compressed client-side to webp (full 1600px + 400px thumb) in
  `src/lib/images.ts`. First photo of a pin is the cover. Photos can be
  spoiler-tagged (blurred until tapped).
- Verdict animations (`VerdictOverlay.tsx`) replay on EVERY open of a rejected
  pin. That is the joke and it is load-bearing. Never memoise it away.
- The "torch it" verdict button was retired; torched pins still render burnt
  with a Have mercy undo. "Shit on it" is the only active rejection.
- Verdict art (`public/verdicts/`) is white-background webp composited with
  mix-blend-multiply; the overlay must paint AFTER sheet content with no
  z-index of its own or the blend breaks (learned the hard way).

## Deploying

No GitHub↔Vercel auto-deploy (Tom's Vercel login isn't linked to GitHub).
Deploy with: `npx vercel deploy --prod --yes` from the project root (needs a
Vercel token or interactive login; project is linked in `.vercel/`).
Env vars (`.env.local`, never committed): NEXT_PUBLIC_SUPABASE_URL,
NEXT_PUBLIC_SUPABASE_ANON_KEY, FAMILY_PIN.

## Dev gotchas (Windows)

- Never run `npm run build` while the dev server is running (shared `.next`
  corrupts). Kill orphaned node processes holding port 3000 before diagnosing
  local 500s (`next dev` silently hops ports when 3000 is taken).
- Verify with playwright-core (devDependency) driving installed Edge with
  `--use-angle=swiftshader` for the WebGL map. Test data goes to the REAL
  family database: always name test pins "... delete me" and delete them after.

## Ideas parked for discussion (not building yet)

Budget-o-meter, This-or-That showdowns, route drive-time reality check,
countdown mode, packing lists, trip/memory mode (day journal from live photos)
+ Photo of the Day voting, weather layer, WhatsApp digest, documents vault,
golden pin (one unshittable idea per person). Tom's separate product idea:
"Plan-it Earth" — productised multi-tenant version; validate first by cloning
the codebase per friend group (new Supabase project + Vercel envs).
