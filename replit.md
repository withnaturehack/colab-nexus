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
- Supabase credentials (`SUPABASE_*` / `VITE_SUPABASE_*`) are already present in `.env`.

## Notes
- Minor dev-only hydration mismatch warnings appear in the browser console from Lovable's component-tagger dev plugin (`data-tsd-source` attributes); harmless in development.
