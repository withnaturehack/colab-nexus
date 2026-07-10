---
name: Lovable vite-tanstack-config sandbox port
description: Why bun/npm run dev fails in Replit for Lovable-imported TanStack Start projects, and the fix.
---

`@lovable.dev/vite-tanstack-config`'s `defineConfig` always forces `server.host: "::"` and `server.port: 8080` as its base default (both in its "sandbox" and "non-sandbox" branches), meant for Lovable's own cloud sandbox.

**Why:** Replit's container does not support binding to `::` (IPv6 any-address) — `vite dev` fails immediately with `EAFNOSUPPORT: address family not supported :::8080`. This surfaces as a failed workflow with no port opened.

**How to apply:** In the project's `vite.config.ts`, pass `vite: { server: { host: "0.0.0.0", port: 5000, strictPort: true, allowedHosts: true } }` into the `defineConfig({...})` call from `@lovable.dev/vite-tanstack-config`. Since `isSandbox` is false outside Lovable's env vars (`LOVABLE_SANDBOX`, `DEV_SERVER__PROJECT_PATH`), the library's `mergeConfig(defaults, userConfig)` lets this override win. Point the Replit workflow's `waitForPort` at 5000 to match.
