#!/usr/bin/env node
/**
 * Bridge: local Vite/miniflare R2 slideshow → remote R2 → ark-site src/.
 *
 * Why: `pnpm run dev` writes CONTENT/MEDIA to local miniflare.
 *      ark-site `sync:slideshow` only pulls with wrangler `--remote`.
 *
 * Usage:
 *   node scripts/push-local-slideshow-to-site.mjs
 *   node scripts/push-local-slideshow-to-site.mjs --skip-sync   # remote only
 *   node scripts/push-local-slideshow-to-site.mjs --dry-run
 *
 * Env:
 *   ARK_SITE_ROOT  absolute path to ark-site (default: ../ark-site next to this repo)
 */
import { spawnSync } from "node:child_process";
import { mkdir, mkdtemp, rm, writeFile, copyFile, readFile } from "node:fs/promises";
import { existsSync, readdirSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { DatabaseSync } from "node:sqlite";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const args = new Set(process.argv.slice(2));
const dryRun = args.has("--dry-run");
const skipSync = args.has("--skip-sync");
const siteRoot = resolve(
  process.env.ARK_SITE_ROOT || join(root, "..", "ark-site"),
);

const CONTENT = "ark-admin-content";
const MEDIA = "ark-admin-media";

function die(msg) {
  console.error(msg);
  process.exit(1);
}

function listSqliteFiles(dir, out = []) {
  if (!existsSync(dir)) return out;
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    let st;
    try {
      st = statSync(p);
    } catch {
      continue;
    }
    if (st.isDirectory()) listSqliteFiles(p, out);
    else if (name.endsWith(".sqlite") && !name.includes("metadata")) out.push(p);
  }
  return out;
}

function findBuckets() {
  const searchRoots = [
    join(root, ".cloudflare/state/v3/r2"),
    join(root, ".wrangler/state/v3/r2"),
  ];
  const dbs = searchRoots.flatMap((d) => listSqliteFiles(d));
  let content = null;
  let media = null;

  for (const dbPath of dbs) {
    try {
      const db = new DatabaseSync(dbPath, { readOnly: true });
      const tables = db
        .prepare(`SELECT name FROM sqlite_master WHERE type='table'`)
        .all()
        .map((r) => r.name);
      if (!tables.includes("_mf_objects")) {
        db.close();
        continue;
      }
      const hasSlideshowJson = db
        .prepare(`SELECT 1 AS ok FROM _mf_objects WHERE key = ? LIMIT 1`)
        .get("slideshow/slideshow.json");
      const hasSlideMedia = db
        .prepare(
          `SELECT 1 AS ok FROM _mf_objects WHERE key LIKE 'slideshow/%/slide-%' LIMIT 1`,
        )
        .get();
      if (hasSlideshowJson) {
        content = { dbPath, blobsDir: inferBlobsDir(dbPath, CONTENT) };
      }
      if (hasSlideMedia) {
        media = { dbPath, blobsDir: inferBlobsDir(dbPath, MEDIA) };
      }
      db.close();
    } catch {
      /* skip unreadable */
    }
  }

  return { content, media };
}

/** Miniflare stores blobs under state/.../r2/<bucket-name>/blobs/ */
function inferBlobsDir(dbPath, bucketName) {
  // .../r2/miniflare-R2BucketObject/<hash>.sqlite → .../r2/<bucket>/blobs
  const r2Root = dbPath.includes("/miniflare-R2BucketObject/")
    ? dbPath.slice(0, dbPath.indexOf("/miniflare-R2BucketObject/"))
    : join(dirname(dbPath), "..");
  const named = join(r2Root, bucketName, "blobs");
  if (existsSync(named)) return named;
  // Fallback: sibling blobs next to bucket object dir (rare)
  const alt = join(dirname(dbPath), "blobs");
  return existsSync(alt) ? alt : named;
}

function listKeys(dbPath, like) {
  const db = new DatabaseSync(dbPath, { readOnly: true });
  const rows = db
    .prepare(`SELECT key, blob_id, size FROM _mf_objects WHERE key LIKE ? ORDER BY key`)
    .all(like);
  db.close();
  return rows;
}

async function getObject(dbPath, blobsDir, key, destFile) {
  const db = new DatabaseSync(dbPath, { readOnly: true });
  const row = db
    .prepare(`SELECT blob_id FROM _mf_objects WHERE key = ?`)
    .get(key);
  db.close();
  if (!row?.blob_id) return false;
  const src = join(blobsDir, row.blob_id);
  if (!existsSync(src)) return false;
  await mkdir(dirname(destFile), { recursive: true });
  await copyFile(src, destFile);
  return true;
}

function wranglerPut(bucket, key, file, contentType) {
  if (dryRun) {
    console.log(`[dry-run] put ${bucket}/${key}`);
    return;
  }
  const result = spawnSync(
    "npx",
    [
      "wrangler",
      "r2",
      "object",
      "put",
      `${bucket}/${key}`,
      "--remote",
      `--file=${file}`,
      "--content-type",
      contentType,
    ],
    { cwd: root, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] },
  );
  if (result.status !== 0) {
    throw new Error(
      `put ${bucket}/${key} failed: ${(result.stderr || result.stdout || "").slice(0, 600)}`,
    );
  }
}

function contentTypeFor(key) {
  if (key.endsWith(".json")) return "application/json; charset=utf-8";
  if (key.endsWith(".html")) return "text/html; charset=utf-8";
  if (key.endsWith(".webp")) return "image/webp";
  if (key.endsWith(".jpg") || key.endsWith(".jpeg")) return "image/jpeg";
  if (key.endsWith(".png")) return "image/png";
  if (key.endsWith(".mp4")) return "video/mp4";
  return "application/octet-stream";
}

const { content, media } = findBuckets();
if (!content) {
  die(
    "No local miniflare CONTENT bucket with slideshow/slideshow.json.\n" +
      "Start admin (`pnpm run dev`), save a slide, then retry.",
  );
}
if (!media) {
  console.warn(
    "Warning: no local MEDIA bucket with slideshow files — will still push JSON/HTML.",
  );
}

console.log(`Local CONTENT DB: ${content.dbPath}`);
console.log(`Local CONTENT blobs: ${content.blobsDir}`);
if (media) {
  console.log(`Local MEDIA DB: ${media.dbPath}`);
  console.log(`Local MEDIA blobs: ${media.blobsDir}`);
}

const work = await mkdtemp(join(tmpdir(), "ark-slideshow-push-"));
try {
  const jsonPath = join(work, "slideshow.json");
  if (!(await getObject(content.dbPath, content.blobsDir, "slideshow/slideshow.json", jsonPath))) {
    die("Could not read local slideshow/slideshow.json blob");
  }
  const doc = JSON.parse(await readFile(jsonPath, "utf8"));
  const slides = Array.isArray(doc.slides) ? doc.slides : [];
  console.log(`Found ${slides.length} slide(s) in local slideshow.json`);

  const contentKeys = new Set(["slideshow/slideshow.json"]);
  for (const row of listKeys(content.dbPath, "slideshow/html/%")) {
    contentKeys.add(row.key);
  }

  // Prefer keys referenced by JSON (avoids uploading orphaned versions)
  const mediaKeys = new Set();
  for (const slide of slides) {
    const id = slide.id;
    if (!id) continue;
    contentKeys.add(`slideshow/html/${id}.html`);
    if (slide.layer?.mobile?.sameAsDesktop === false) {
      contentKeys.add(`slideshow/html/${id}.mobile.html`);
    }
    const files = slide.files || {};
    if (files.sourceKey) mediaKeys.add(files.sourceKey);
    if (files.video?.key) mediaKeys.add(files.video.key);
    if (slide.version) {
      for (const w of Object.keys(files.desktop || {})) {
        mediaKeys.add(`slideshow/${id}/slide-${id}.${slide.version}-d-${w}.jpg`);
        mediaKeys.add(`slideshow/${id}/slide-${id}.${slide.version}-d-${w}.webp`);
      }
      for (const w of Object.keys(files.mobile || {})) {
        mediaKeys.add(`slideshow/${id}/slide-${id}.${slide.version}-m-${w}.jpg`);
        mediaKeys.add(`slideshow/${id}/slide-${id}.${slide.version}-m-${w}.webp`);
      }
    }
  }

  // Push content
  for (const key of [...contentKeys].sort()) {
    const dest = join(work, "content", key);
    const ok = await getObject(content.dbPath, content.blobsDir, key, dest);
    if (!ok) {
      if (key.endsWith(".html")) {
        await mkdir(dirname(dest), { recursive: true });
        await writeFile(dest, "");
      } else {
        console.warn(`skip missing content ${key}`);
        continue;
      }
    }
    console.log(`↑ ${CONTENT}/${key}`);
    wranglerPut(CONTENT, key, dest, contentTypeFor(key));
  }

  // Push media
  if (media) {
    for (const key of [...mediaKeys].sort()) {
      const dest = join(work, "media", key);
      const ok = await getObject(media.dbPath, media.blobsDir, key, dest);
      if (!ok) {
        console.warn(`skip missing media ${key}`);
        continue;
      }
      console.log(`↑ ${MEDIA}/${key}`);
      wranglerPut(MEDIA, key, dest, contentTypeFor(key));
    }
  } else if (mediaKeys.size) {
    console.warn("MEDIA bucket missing locally; skipped media uploads.");
  }

  console.log(
    dryRun
      ? "Dry run complete (nothing uploaded)."
      : "Remote R2 updated from local miniflare.",
  );

  if (!skipSync && !dryRun) {
    if (!existsSync(join(siteRoot, "package.json"))) {
      die(
        `ark-site not found at ${siteRoot}. Set ARK_SITE_ROOT or pass --skip-sync.`,
      );
    }
    console.log(`\n→ syncing ark-site at ${siteRoot}`);
    const sync = spawnSync("pnpm", ["run", "sync:slideshow"], {
      cwd: siteRoot,
      encoding: "utf8",
      stdio: "inherit",
    });
    if (sync.status !== 0) die("ark-site sync:slideshow failed");
    console.log("\nDone. Hard-refresh http://localhost:4321/");
  } else if (skipSync) {
    console.log("Skipped site sync (--skip-sync). Run in ark-site:");
    console.log("  pnpm run sync:slideshow");
  }
} finally {
  await rm(work, { recursive: true, force: true }).catch(() => {});
}
