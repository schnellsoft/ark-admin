#!/usr/bin/env node
/**
 * Re-bake slideshow -d/-m variants from each slide's source image using
 * mobileCrop, desktopCrop (or default 16:9), and filters from slideshow.json.
 * Updates R2 media, D1 files/crop columns, and republishes slideshow.json.
 *
 * Usage: node scripts/rebuild-slide-variants.mjs
 */
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import sharp from "sharp";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const CONTENT = "ark-admin-content";
const MEDIA = "ark-admin-media";
const SITE_DB = "ark-admin-db-site";

function wrangler(args, opts = {}) {
  const result = spawnSync("npx", ["wrangler", ...args], {
    cwd: root,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
    ...opts,
  });
  if (result.status !== 0) {
    const err = (result.stderr || result.stdout || "").trim();
    throw new Error(`wrangler ${args.join(" ")} failed: ${err.slice(0, 800)}`);
  }
  return result.stdout;
}

function r2Get(bucket, key, file) {
  const result = spawnSync(
    "npx",
    ["wrangler", "r2", "object", "get", `${bucket}/${key}`, "--remote", `--file=${file}`],
    { cwd: root, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] },
  );
  return result.status === 0;
}

function r2Put(bucket, key, file, contentType) {
  wrangler([
    "r2",
    "object",
    "put",
    `${bucket}/${key}`,
    "--remote",
    `--file=${file}`,
    "--content-type",
    contentType,
  ]);
}

function parseRatio(ratio) {
  const parts = String(ratio || "16:9")
    .split(":")
    .map((n) => Number.parseFloat(n));
  if (parts.length === 2 && parts.every((n) => Number.isFinite(n) && n > 0)) {
    return { w: parts[0], h: parts[1] };
  }
  return { w: 16, h: 9 };
}

function defaultDesktopCrop(naturalW, naturalH, ratio = "16:9") {
  const { w: rw, h: rh } = parseRatio(ratio);
  const targetRatio = rw / rh;
  let width = naturalW;
  let height = Math.round(width / targetRatio);
  if (height > naturalH) {
    height = naturalH;
    width = Math.round(height * targetRatio);
  }
  return {
    left: Math.round((naturalW - width) / 2),
    top: Math.round((naturalH - height) / 2),
    width: Math.max(1, width),
    height: Math.max(1, height),
  };
}

function defaultMobileCrop(naturalW, naturalH) {
  const targetRatio = 3 / 4;
  let width = naturalW;
  let height = Math.round(width / targetRatio);
  if (height > naturalH) {
    height = naturalH;
    width = Math.round(height * targetRatio);
  }
  return {
    left: Math.round((naturalW - width) / 2),
    top: Math.round((naturalH - height) / 2),
    width: Math.max(1, width),
    height: Math.max(1, height),
  };
}

function focusFromCrop(crop, naturalW, naturalH) {
  if (!naturalW || !naturalH) return { x: 50, y: 50 };
  return {
    x: Math.min(
      100,
      Math.max(0, Math.round(((crop.left + crop.width / 2) / naturalW) * 1000) / 10),
    ),
    y: Math.min(
      100,
      Math.max(0, Math.round(((crop.top + crop.height / 2) / naturalH) * 1000) / 10),
    ),
  };
}

function clampCrop(crop, nw, nh) {
  if (!crop) return null;
  let left = Math.max(0, Math.round(Number(crop.left) || 0));
  let top = Math.max(0, Math.round(Number(crop.top) || 0));
  let width = Math.max(1, Math.round(Number(crop.width) || 1));
  let height = Math.max(1, Math.round(Number(crop.height) || 1));
  if (left + width > nw) width = Math.max(1, nw - left);
  if (top + height > nh) height = Math.max(1, nh - top);
  if (width > nw) {
    width = nw;
    left = 0;
  }
  if (height > nh) {
    height = nh;
    top = 0;
  }
  return { left, top, width, height };
}

function filtersAreIdentity(f) {
  if (!f) return true;
  return (
    (f.brightness ?? 100) === 100 &&
    (f.contrast ?? 100) === 100 &&
    (f.saturate ?? 100) === 100 &&
    (f.hueRotate ?? 0) === 0 &&
    (f.grayscale ?? 0) === 0 &&
    (f.sepia ?? 0) === 0 &&
    (f.invert ?? 0) === 0 &&
    (f.blur ?? 0) === 0
  );
}

async function applyFilters(pipeline, filters) {
  if (filtersAreIdentity(filters)) return pipeline;
  let img = pipeline;
  const brightness = (filters.brightness ?? 100) / 100;
  const saturation = (filters.saturate ?? 100) / 100;
  const hue = filters.hueRotate ?? 0;
  if (brightness !== 1 || saturation !== 1 || hue !== 0) {
    img = img.modulate({
      brightness,
      saturation,
      hue,
    });
  }
  const contrast = (filters.contrast ?? 100) / 100;
  if (contrast !== 1) {
    // Approximate CSS contrast around mid-gray
    const a = contrast;
    const b = 128 * (1 - contrast);
    img = img.linear(a, b);
  }
  if ((filters.grayscale ?? 0) >= 100) img = img.grayscale();
  if ((filters.invert ?? 0) >= 100) img = img.negate();
  if ((filters.blur ?? 0) > 0) img = img.blur(Math.max(0.3, filters.blur));
  // Sepia: approximate via recomb when fully on
  if ((filters.sepia ?? 0) >= 100) {
    img = img.recomb([
      [0.393, 0.769, 0.189],
      [0.349, 0.686, 0.168],
      [0.272, 0.534, 0.131],
    ]);
  }
  return img;
}

/** Match client encode: filter the full frame, then extract crop, then resize. */
async function filteredSource(sourcePath, filters) {
  let pipeline = sharp(sourcePath).rotate();
  if (filtersAreIdentity(filters)) return pipeline;
  pipeline = await applyFilters(pipeline, filters);
  const buf = await pipeline.png().toBuffer();
  return sharp(buf);
}

async function extractAndResize(filtered, crop, targetW, targetH, quality) {
  const pipeline = filtered
    .clone()
    .extract({
      left: crop.left,
      top: crop.top,
      width: crop.width,
      height: crop.height,
    })
    .resize(targetW, targetH, { fit: "fill", kernel: "lanczos3" });
  const jpg = await pipeline
    .clone()
    .jpeg({ quality, mozjpeg: true })
    .toBuffer();
  const webp = await pipeline
    .clone()
    .webp({ quality })
    .toBuffer();
  return { jpg, webp };
}

function sqlQuote(s) {
  return `'${String(s).replace(/'/g, "''")}'`;
}

const work = await mkdtemp(join(tmpdir(), "ark-slide-rebuild-"));
const jsonPath = join(work, "slideshow.json");

try {
  console.log("↓ content slideshow/slideshow.json");
  if (!r2Get(CONTENT, "slideshow/slideshow.json", jsonPath)) {
    throw new Error("Could not download slideshow.json");
  }

  const doc = JSON.parse(await readFile(jsonPath, "utf8"));
  const settings = doc.settings ?? {};
  const output = settings.output ?? {};
  const ratio = settings.ratio || "16:9";
  const deskW = output.desktop?.width || 1920;
  const landW = output.mobileLandscape?.width || 1280;
  const portraitW = output.mobilePortrait?.width || 1080;
  const portraitH = output.mobilePortrait?.height || 1440;
  const quality = output.desktop?.quality || 80;

  const slides = Array.isArray(doc.slides) ? doc.slides : [];
  let changed = 0;

  for (const slide of slides) {
    if (!slide?.id || slide.mediaKind === "video") continue;
    const sourceKey = slide.files?.sourceKey;
    if (!sourceKey || !slide.version) {
      console.warn(`skip ${slide.id}: missing source/version`);
      continue;
    }

    const sourcePath = join(work, `${slide.id}-source`);
    console.log(`↓ ${sourceKey}`);
    if (!r2Get(MEDIA, sourceKey, sourcePath)) {
      console.warn(`skip ${slide.id}: source missing`);
      continue;
    }

    const meta = await sharp(sourcePath).rotate().metadata();
    const nw = meta.width || 0;
    const nh = meta.height || 0;
    if (!nw || !nh) {
      console.warn(`skip ${slide.id}: bad dimensions`);
      continue;
    }

    const desktopCrop =
      clampCrop(slide.desktopCrop, nw, nh) ?? defaultDesktopCrop(nw, nh, ratio);
    const mobileCrop =
      clampCrop(slide.mobileCrop, nw, nh) ?? defaultMobileCrop(nw, nh);
    const desktopFocus =
      slide.desktopFocus &&
      Number.isFinite(slide.desktopFocus.x) &&
      Number.isFinite(slide.desktopFocus.y)
        ? slide.desktopFocus
        : focusFromCrop(desktopCrop, nw, nh);
    const filters = slide.filters ?? {};
    const filtered = await filteredSource(sourcePath, filters);

    const files = {
      desktop: {},
      mobile: {},
      sourceKey,
      ...(slide.files?.video ? { video: slide.files.video } : {}),
    };

    let desktopWidths = [deskW, landW].filter((w, i, arr) => arr.indexOf(w) === i);
    desktopWidths = desktopWidths
      .filter((w) => desktopCrop.width >= w)
      .sort((a, b) => b - a);
    if (desktopWidths.length === 0) desktopWidths = [desktopCrop.width];

    for (const w of desktopWidths) {
      const h = Math.max(1, Math.round((desktopCrop.height / desktopCrop.width) * w));
      const { jpg, webp } = await extractAndResize(
        filtered,
        desktopCrop,
        w,
        h,
        quality,
      );
      const base = `slide-${slide.id}.${slide.version}-d-${w}`;
      const jpgPath = join(work, `${base}.jpg`);
      const webpPath = join(work, `${base}.webp`);
      await writeFile(jpgPath, jpg);
      await writeFile(webpPath, webp);
      const keyPrefix = `slideshow/${slide.id}/`;
      console.log(`↑ ${keyPrefix}${base}.jpg (${w}×${h})`);
      r2Put(MEDIA, `${keyPrefix}${base}.jpg`, jpgPath, "image/jpeg");
      r2Put(MEDIA, `${keyPrefix}${base}.webp`, webpPath, "image/webp");
      files.desktop[String(w)] = { width: w, height: h };
    }

    const mediumW = Math.round(portraitW * (2 / 3));
    const mediumH = Math.round(portraitH * (2 / 3));
    const mobileTargets = [
      { w: portraitW, h: portraitH },
      { w: mediumW, h: mediumH },
    ].filter((t, i, arr) => arr.findIndex((x) => x.w === t.w) === i);

    for (const t of mobileTargets) {
      const { jpg, webp } = await extractAndResize(
        filtered,
        mobileCrop,
        t.w,
        t.h,
        quality,
      );
      const base = `slide-${slide.id}.${slide.version}-m-${t.w}`;
      const jpgPath = join(work, `${base}.jpg`);
      const webpPath = join(work, `${base}.webp`);
      await writeFile(jpgPath, jpg);
      await writeFile(webpPath, webp);
      const keyPrefix = `slideshow/${slide.id}/`;
      console.log(`↑ ${keyPrefix}${base}.jpg (${t.w}×${t.h})`);
      r2Put(MEDIA, `${keyPrefix}${base}.jpg`, jpgPath, "image/jpeg");
      r2Put(MEDIA, `${keyPrefix}${base}.webp`, webpPath, "image/webp");
      files.mobile[String(t.w)] = { width: t.w, height: t.h };
    }

    slide.desktopCrop = desktopCrop;
    slide.mobileCrop = mobileCrop;
    slide.desktopFocus = desktopFocus;
    slide.files = files;

    const sqlPath = join(work, `${slide.id}.sql`);
    await writeFile(
      sqlPath,
      `UPDATE slideshow_slides SET
  desktop_crop_json = ${sqlQuote(JSON.stringify(desktopCrop))},
  desktop_focus_json = ${sqlQuote(JSON.stringify(desktopFocus))},
  mobile_crop_json = ${sqlQuote(JSON.stringify(mobileCrop))},
  files_json = ${sqlQuote(JSON.stringify(files))},
  updated_at = datetime('now')
WHERE id = ${sqlQuote(slide.id)};
`,
    );
    console.log(`DB update ${slide.id}`);
    wrangler(["d1", "execute", SITE_DB, "--remote", "--file", sqlPath]);

    changed += 1;
  }

  await writeFile(jsonPath, JSON.stringify(doc, null, 2));
  console.log("↑ content slideshow/slideshow.json");
  r2Put(CONTENT, "slideshow/slideshow.json", jsonPath, "application/json; charset=utf-8");

  console.log(`Rebuilt ${changed} slide(s).`);
} finally {
  await rm(work, { recursive: true, force: true }).catch(() => {});
}
