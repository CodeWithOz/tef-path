// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - tanstackStart, viteReact, tailwindcss, tsConfigPaths, cloudflare (build-only),
//     componentTagger (dev-only), VITE_* env injection, @ path alias, React/TanStack dedupe,
//     error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... } }) if needed.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";

/**
 * Dev server: use `host: true` so Vite calls `listen(port)` with no hostname. Node then binds
 * in dual-stack mode so both `http://localhost:8080` (::1) and `http://127.0.0.1:8080` work.
 * (`host: "0.0.0.0"` is IPv4-only; browsers often resolve `localhost` to IPv6 only.)
 *
 * Production / Lovable: `server.*` applies to `vite dev` / `vite preview` only, not the
 * Cloudflare Workers bundle from `vite build`, so this does not change deployed routing or
 * cause downtime on push.
 */
export default defineConfig({
  vite: {
    server: {
      host: true,
      port: 8080,
    },
  },
});
