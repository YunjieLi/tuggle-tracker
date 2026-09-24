# Little Days

A small, mobile-friendly baby tracker for everyday care. Log feeds, pumping sessions, diaper changes, and sleep, then review them together in the recent activity feed.

## Run locally

```sh
npm install
npm run dev
```

Without Supabase configuration, activity entries stay in the current browser's `localStorage`.

## Supabase

1. Copy `.env.example` to `.env.local` and add the project URL, publishable key, and legacy anon key from Supabase.
2. Apply the SQL migrations in `supabase/migrations` to the project.
3. Deploy `supabase/functions/auth-by-username` with JWT verification enabled.
4. Add `http://localhost:5173` to Supabase Auth's allowed redirect URLs.
5. Restart the dev server. Users sign in with a user ID and password. Email is collected only when creating an account and is used for password recovery. Activities remain in each account's row-level-security-protected records.

Existing browser-saved activities are copied into the signed-in user's Supabase table the first time that table is empty.

## UI

Built with reusable shadcn-style components, Tailwind CSS, Radix Dialog, and Lucide icons. shadcn component configuration lives in `components.json`.
