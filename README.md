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
5. Restart the dev server. Users create an account and sign in with a name and password. No email is collected. Supabase Auth uses a reserved internal address for each name, and there is no email-based password recovery; users must keep their password safe. Activities remain in each account's row-level-security-protected records.

## UI

Built with reusable shadcn-style components, Tailwind CSS, Radix Dialog, and Lucide icons. shadcn component configuration lives in `components.json`.
