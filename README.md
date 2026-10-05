# Ark Admin

Next.js 16-style admin PWA for a dental clinic static site, running on **Cloudflare Workers** via [vinext](https://github.com/cloudflare/vinext).

## Stack

- vinext + Vite + Cloudflare Workers (`cf` / Wrangler)
- Tailwind CSS + shadcn-style UI + sortable/filterable data grids
- Zod validation
- D1 (drafts, users, messages, tickets)
- R2 (media + published JSON packs)
- Durable Objects (WebSocket chat)
- Web Push + app badge + PWA install

## Quick start

```bash
pnpm install
pnpm approve-builds   # if pnpm blocks workerd/esbuild scripts
pnpm db:migrate:local
pnpm dev
```

Open the Vite URL (usually `http://localhost:5173`).

Default admin: `admin@ark.local` / `changeme`

## Scripts

| Script | Purpose |
| --- | --- |
| `pnpm dev` | Local Workers-aware Vite server |
| `pnpm build` | Production build |
| `pnpm deploy` | Deploy with `@vinext/cloudflare` |
| `pnpm db:migrate:local` | Apply D1 migrations locally |
| `pnpm db:migrate:remote` | Apply D1 migrations remotely |
| `pnpm cf-typegen` | Generate binding types from `cloudflare.config.ts` |

## Config

- Runtime bindings: [`cloudflare.config.ts`](cloudflare.config.ts)
- Wrangler companion (migrations / DO): [`wrangler.jsonc`](wrangler.jsonc)
- Local secrets: `.dev.vars` (gitignored)

## Deploy

```bash
pnpm build
pnpm deploy   # vinext-cloudflare deploy (uses cloudflare.config.ts)
```

Set secrets in the Cloudflare dashboard or via `cf workers secrets` / Wrangler before production use:

- `SESSION_SECRET`
- `VAPID_PUBLIC_KEY`
- `VAPID_PRIVATE_KEY`

Remote D1 migrations: `pnpm db:migrate:remote` (requires authenticated Cloudflare account and a real D1 database id in config).

## Public APIs (for the clinic static site)

- `POST /api/public/contact` — Zod-validated contact form → D1 + optional Resend email + push
- `POST /api/public/tickets` — create support ticket
- `GET /api/public/ws` — WebSocket upgrade to chat Durable Object

## Publish flow

Edits save to D1 drafts. **Save to cloud** writes versioned JSON under `published/<version>/` and `published/latest/` in the `CONTENT` R2 bucket.
