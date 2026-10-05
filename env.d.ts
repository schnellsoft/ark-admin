/* Fallback Env typing when generated Cloudflare types are absent. */
/* Prefer `pnpm cf-typegen` / `wrangler types` output. */

interface ImagesBinding {
  input(stream: ReadableStream | ArrayBuffer | string | URL): unknown;
}

interface Env {
  DB: D1Database;
  MEDIA: R2Bucket;
  CONTENT: R2Bucket;
  CHAT: DurableObjectNamespace;
  ASSETS: Fetcher;
  IMAGES: ImagesBinding;
  SESSION_SECRET: string;
  VAPID_PUBLIC_KEY: string;
  VAPID_PRIVATE_KEY: string;
  VAPID_SUBJECT: string;
}
