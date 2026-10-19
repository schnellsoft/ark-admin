import { bindings, defineConfig, defineWorker, exports } from "cf/config";

export default defineConfig({
  worker: defineWorker({
    name: "ark-admin",
    entrypoint: "./worker/index.ts",
    compatibilityDate: "2026-10-05",
    compatibilityFlags: ["nodejs_compat"],
    assets: { notFoundHandling: "none" },
    env: {
      ASSETS: bindings.assets(),
      IMAGES: bindings.images(),
      DB: bindings.d1({
        name: "ark-admin-db",
        id: "27df8aba-99fe-4516-bf07-12bc0f9acae6",
      }),
      SITE_DB: bindings.d1({
        name: "ark-admin-db-site",
        id: "d6db6b40-cc69-4577-9534-49eb306164e6",
      }),
      MEDIA: bindings.r2({ name: "ark-admin-media" }),
      CONTENT: bindings.r2({ name: "ark-admin-content" }),
      CHAT: bindings.durableObject({
        worker: "ark-admin",
        exportName: "ChatRoom",
      }),
      SESSION_SECRET: bindings.secret(),
      VAPID_PUBLIC_KEY: bindings.secret(),
      VAPID_PRIVATE_KEY: bindings.secret(),
      VAPID_SUBJECT: bindings.text("mailto:admin@ark.local"),
      /**
       * Set after deploy with:
       *   npx wrangler secret put SITE_DEPLOY_HOOK_URL
       *   npx wrangler secret put SITE_REBUILD_GITHUB_TOKEN
       * Declared here so vinext/wrangler typegen know about them.
       */
      SITE_DEPLOY_HOOK_URL: bindings.secret(),
      SITE_REBUILD_GITHUB_TOKEN: bindings.secret(),
      SITE_REBUILD_GITHUB_REPO: bindings.text("schnellsoft/ark-site"),
    },
    exports: {
      ChatRoom: exports.durableObject({ storage: "sqlite" }),
    },
  }),
});
