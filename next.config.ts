import type { NextConfig } from "next";

/**
 * Vinext treats multipart POSTs without a Next.js action id as progressive
 * server actions and enforces `serverActions.bodySizeLimit` (default 1 MB).
 * Library uploads send master + WebP + portrait800 in one request, so raise
 * the limit to match library maxBytes (25 MB) with headroom for multipart
 * overhead.
 */
const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      bodySizeLimit: "32mb",
    },
  },
};

export default nextConfig;
