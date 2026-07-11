# CoLab Nation

## Overview
CoLab Nation is a workspace/organization management app ("Recruitment, onboarding, tasks, projects, departments, meetings, and reports") built with Lovable and imported from GitHub into Replit.

## Stack
- **Frontend/SSR**: TanStack Start (React 19) + TanStack Router, built with Vite
- **Styling**: Tailwind CSS v4, Radix UI, shadcn-style components in `src/components/ui`
- **Backend/Data**: Supabase (auth + Postgres), config in `supabase/` (migrations, config.toml)
- **Package manager**: Bun (bun.lock present; npm lockfile also present but Bun is used to run/install)

## Running the app
- Dev workflow: `Start application` runs `bun run dev` (Vite dev server) on port 5000.
- `vite.config.ts` overrides the Lovable sandbox defaults (`host: "::"`, `port: 8080`) with `host: "0.0.0.0"`, `port: 5000`, `allowedHosts: true` — the `::`/8080 defaults from `@lovable.dev/vite-tanstack-config` don't work in Replit's container (no IPv6 support), so this override is required for the workflow to start. Keep this override if the config file is regenerated.
- Supabase credentials (`SUPABASE_*` / `VITE_SUPABASE_*`) are already present in `.env`, pointing at Supabase project `jeopktziiwmikchmrlow`. Schema migrations from `supabase/migrations/` have been applied to that project's database.
- `SUPABASE_SERVICE_ROLE_KEY` is stored as a Replit secret — required server-side by `src/integrations/supabase/client.server.ts` for admin operations (account signup lookup, application submission, super-admin seeding). Without it, the "Apply to join" flow fails silently server-side.
- If the Supabase project is ever swapped again: update `.env`'s `SUPABASE_URL`/`SUPABASE_PROJECT_ID`/`SUPABASE_PUBLISHABLE_KEY` (and `VITE_` equivalents) via the shell (the Edit/Write tools block `.env` writes), request a new `SUPABASE_SERVICE_ROLE_KEY` secret, and re-run the SQL files in `supabase/migrations/` against the new project's Postgres connection (Project Settings → Database → Connection string) in filename order.

## Notes
- Minor dev-only hydration mismatch warnings appear in the browser console from Lovable's component-tagger dev plugin (`data-tsd-source` attributes); harmless in development.
