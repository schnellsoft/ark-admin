#!/usr/bin/env node
/**
 * Copy local R2 objects written by `wrangler r2 object put --local`
 * (`.wrangler/state`) into vinext persist (`.cloudflare/state`).
 *
 * Usage:
 *   node scripts/sync-wrangler-r2-to-vinext.mjs
 *   node scripts/sync-wrangler-r2-to-vinext.mjs --prefix=library/
 */
import { copyFileSync, existsSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { DatabaseSync } from "node:sqlite";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const prefixArg = process.argv.find((a) => a.startsWith("--prefix="));
const prefix = prefixArg ? prefixArg.slice("--prefix=".length) : "library/";

const WR_R2 = join(root, ".wrangler/state/v3/r2");
const CF_R2 = join(root, ".cloudflare/state/v3/r2");

const BUCKETS = [
  {
    name: "ark-admin-media",
    objectDb:
      "miniflare-R2BucketObject/3ed1faa2fea6a5cdf17a5163fb59fdf6b877bc9e71bee73368bc8cdaf367df6d.sqlite",
  },
  {
    name: "ark-admin-content",
    objectDb:
      "miniflare-R2BucketObject/7bec06821d3a74ba7eabad820c03044f80525d0029cba13ef0d8d2b09c95831a.sqlite",
  },
];

for (const { name, objectDb } of BUCKETS) {
  const wrDbPath = join(WR_R2, objectDb);
  const cfDbPath = join(CF_R2, objectDb);
  const wrBlobs = join(WR_R2, name, "blobs");
  const cfBlobs = join(CF_R2, name, "blobs");
  if (!existsSync(wrDbPath) || !existsSync(cfDbPath)) {
    console.warn(`skip ${name}: missing sqlite`);
    continue;
  }
  mkdirSync(cfBlobs, { recursive: true });

  const wr = new DatabaseSync(wrDbPath, { readOnly: true });
  const cf = new DatabaseSync(cfDbPath);
  const rows = wr
    .prepare(
      `SELECT key, blob_id, version, size, etag, uploaded, checksums, http_metadata, custom_metadata
       FROM _mf_objects WHERE key LIKE ?`,
    )
    .all(`${prefix}%`);

  const upsert = cf.prepare(
    `INSERT INTO _mf_objects
       (key, blob_id, version, size, etag, uploaded, checksums, http_metadata, custom_metadata)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(key) DO UPDATE SET
       blob_id=excluded.blob_id,
       version=excluded.version,
       size=excluded.size,
       etag=excluded.etag,
       uploaded=excluded.uploaded,
       checksums=excluded.checksums,
       http_metadata=excluded.http_metadata,
       custom_metadata=excluded.custom_metadata`,
  );

  let n = 0;
  for (const row of rows) {
    const src = join(wrBlobs, row.blob_id);
    const dst = join(cfBlobs, row.blob_id);
    if (!existsSync(src)) {
      console.warn(`missing blob for ${row.key}`);
      continue;
    }
    if (!existsSync(dst)) copyFileSync(src, dst);
    upsert.run(
      row.key,
      row.blob_id,
      row.version,
      row.size,
      row.etag,
      row.uploaded,
      row.checksums,
      row.http_metadata,
      row.custom_metadata,
    );
    n += 1;
  }
  wr.close();
  cf.close();
  console.log(`${name}: synced ${n} object(s) with prefix "${prefix}"`);
}
