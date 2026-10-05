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
      DB: bindings.d1({ name: "ark-admin-db" }),
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
    },
    exports: {
      ChatRoom: exports.durableObject({ storage: "sqlite" }),
    },
  }),
});
