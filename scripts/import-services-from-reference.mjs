#!/usr/bin/env node
/**
 * Import Services CMS from _reference/Services_model into local D1 + R2.
 *
 * Usage:
 *   node scripts/import-services-from-reference.mjs
 *   node scripts/import-services-from-reference.mjs --remote   # also write remote R2/D1
 *   node scripts/import-services-from-reference.mjs --dry-run
 */
import { readFile, writeFile, mkdir, mkdtemp, rm, readdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, basename, extname } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import sharp from "sharp";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const refRoot = join(root, "_reference/Services_model");
const catalogPath = join(refRoot, "articles/catalog.json");
const iconsRoot = join(refRoot, "icons");
const articlesRoot = join(refRoot, "articles");
const imagesRoot = join(articlesRoot, "images");

const SITE_DB = "ark-admin-db-site";
const CONTENT = "ark-admin-content";
const MEDIA = "ark-admin-media";

const args = new Set(process.argv.slice(2));
const dryRun = args.has("--dry-run");
const remote = args.has("--remote");
const toSite = args.has("--to-site");
const localFlag = remote ? ["--remote"] : ["--local"];
const siteRoot = join(root, "..", "ark-site");

function die(msg) {
  console.error(msg);
  process.exit(1);
}

function wrangler(argv) {
  const result = spawnSync("npx", ["wrangler", ...argv], {
    cwd: root,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
    maxBuffer: 32 * 1024 * 1024,
  });
  if (result.status !== 0) {
    const err = (result.stderr || result.stdout || "").trim();
    throw new Error(`wrangler ${argv.join(" ")} failed:\n${err.slice(0, 2000)}`);
  }
  return result.stdout;
}

function sqlEscape(s) {
  return String(s ?? "").replace(/'/g, "''");
}

function priceText(price) {
  if (typeof price === "number" && Number.isFinite(price)) return String(price);
  if (typeof price === "string") return price.trim();
  return "";
}

function pagePath(slug) {
  return `/services/${slug}`;
}

function readSvg(relOrAbs) {
  const candidates = [
    relOrAbs,
    join(iconsRoot, basename(relOrAbs)),
    join(iconsRoot, "services", basename(relOrAbs)),
    join(refRoot, relOrAbs.replace(/^\.\.\//, "")),
  ];
  for (const p of candidates) {
    if (p && existsSync(p)) {
      return readFile(p, "utf8");
    }
  }
  return "";
}

async function loadArticle(lang, slug) {
  const p = join(articlesRoot, lang, `${slug}.json`);
  if (!existsSync(p)) return null;
  return JSON.parse(await readFile(p, "utf8"));
}

/** Minimal PDF (same approach as lib/services-pdf.ts) */
function buildPriceListPdf(lines) {
  const escape = (s) =>
    String(s)
      .replace(/\\/g, "\\\\")
      .replace(/\(/g, "\\(")
      .replace(/\)/g, "\\)")
      .replace(/[^\x20-\x7E\xA0-\xFF]/g, "?");
  const utf8Len = (s) => Buffer.byteLength(s, "utf8");
  const pageWidth = 595;
  const pageHeight = 842;
  const margin = 48;
  const streams = [];
  let ops = [];
  let y = pageHeight - margin;
  const flush = () => {
    streams.push(ops.join("\n"));
    ops = [];
    y = pageHeight - margin;
  };
  for (const line of lines) {
    const size = Math.max(8, line.size);
    if (y < margin + size * 1.35) flush();
    const font = line.bold ? "F2" : "F1";
    ops.push(
      `BT /${font} ${size} Tf ${margin} ${y.toFixed(2)} Td (${escape(line.text).slice(0, 110)}) Tj ET`,
    );
    y -= size * 1.35;
  }
  if (ops.length) flush();
  if (!streams.length) {
    streams.push(`BT /F1 12 Tf ${margin} ${pageHeight - margin} Td (Empty) Tj ET`);
  }
  const objs = [];
  objs.push("<< /Type /Catalog /Pages 2 0 R >>");
  const kids = streams.map((_, i) => `${3 + i * 2} 0 R`).join(" ");
  objs.push(`<< /Type /Pages /Kids [${kids}] /Count ${streams.length} >>`);
  const fontReg = 3 + streams.length * 2;
  const fontBold = fontReg + 1;
  for (let i = 0; i < streams.length; i++) {
    const contentId = 3 + i * 2 + 1;
    objs.push(
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pageWidth} ${pageHeight}] /Contents ${contentId} 0 R /Resources << /Font << /F1 ${fontReg} 0 R /F2 ${fontBold} 0 R >> >> >>`,
    );
    const stream = streams[i];
    objs.push(`<< /Length ${utf8Len(stream)} >>\nstream\n${stream}\nendstream`);
  }
  objs.push("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>");
  objs.push("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>");
  let body = "%PDF-1.4\n";
  const offsets = [0];
  for (let i = 0; i < objs.length; i++) {
    offsets.push(utf8Len(body));
    body += `${i + 1} 0 obj\n${objs[i]}\nendobj\n`;
  }
  const xref = utf8Len(body);
  body += `xref\n0 ${objs.length + 1}\n0000000000 65535 f \n`;
  for (let i = 1; i <= objs.length; i++) {
    body += `${String(offsets[i]).padStart(10, "0")} 00000 n \n`;
  }
  body += `trailer\n<< /Size ${objs.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
  return Buffer.from(body, "utf8");
}

if (!existsSync(catalogPath)) die(`Missing ${catalogPath}`);

console.log("Reading catalog…");
const catalog = JSON.parse(await readFile(catalogPath, "utf8"));
const tree = Array.isArray(catalog.tree) ? catalog.tree : [];
const articles = Array.isArray(catalog.articles) ? catalog.articles : [];

const categories = [];
const subcategories = [];
let catPos = 0;

for (const node of tree) {
  catPos += 1;
  const iconPath = node.icon
    ? join(iconsRoot, basename(node.icon))
    : join(iconsRoot, `${node.id}.svg`);
  const iconSvg = existsSync(iconPath) ? await readFile(iconPath, "utf8") : "";
  categories.push({
    id: node.id,
    position: catPos,
    slug: node.id,
    name: node.name || { ro: "", en: "", bg: "" },
    icon_svg: iconSvg,
  });

  let subPos = 0;
  for (const child of node.children || []) {
    if (child.type === "subcategory") {
      subPos += 1;
      const subIcon = child.icon
        ? join(iconsRoot, basename(child.icon))
        : join(iconsRoot, `${child.id}.svg`);
      const subSvg = existsSync(subIcon) ? await readFile(subIcon, "utf8") : "";
      subcategories.push({
        id: child.id,
        category_id: node.id,
        position: subPos,
        slug: child.id,
        name: child.name || { ro: "", en: "", bg: "" },
        icon_svg: subSvg,
      });
    }
  }
}

const services = [];
const recommendedIds = [];
let svcPos = 0;
const seenSlugs = new Set();

for (const a of articles) {
  if (!a.slug || seenSlugs.has(a.slug)) {
    console.warn(`Skipping duplicate/missing slug: ${a.slug}`);
    continue;
  }
  seenSlugs.add(a.slug);
  svcPos += 1;
  const iconRel = a.icon || `../icons/services/${a.slug}.svg`;
  const iconFile = join(
    iconsRoot,
    "services",
    basename(String(iconRel).replace(/\\/g, "/")),
  );
  const iconSvg = existsSync(iconFile) ? await readFile(iconFile, "utf8") : "";
  const id = a.slug;
  services.push({
    id,
    position: svcPos,
    slug: a.slug,
    title: a.title || { ro: "", en: "", bg: "" },
    category_id: a.categoryId,
    subcategory_id: a.subcategoryId || null,
    icon_svg: iconSvg,
    price_text: priceText(a.price),
    currency: a.currency || "RON",
    page_path: pagePath(a.slug),
    enabled: true,
    synopsis: a.synopsis || { ro: "", en: "", bg: "" },
    recommended: Boolean(a.recommended),
  });
  if (a.recommended) recommendedIds.push(id);
}

// Prefer recommended order from services.json names when possible
try {
  const roDoc = JSON.parse(
    await readFile(join(refRoot, "services.json"), "utf8"),
  );
  if (Array.isArray(roDoc.recommended)) {
    const byRo = new Map(
      services.map((s) => [s.title.ro.trim().toLowerCase(), s.id]),
    );
    const ordered = [];
    for (const item of roDoc.recommended) {
      const name = String(item.name || "")
        .trim()
        .toLowerCase();
      const id = byRo.get(name);
      if (id && !ordered.includes(id)) ordered.push(id);
    }
    if (ordered.length) {
      recommendedIds.length = 0;
      recommendedIds.push(...ordered);
    }
  }
} catch {
  // keep catalog flags
}

console.log(
  `Parsed ${categories.length} categories, ${subcategories.length} subcategories, ${services.length} services, ${recommendedIds.length} recommended`,
);

// Library images
const imageFiles = existsSync(imagesRoot)
  ? (await readdir(imagesRoot)).filter((f) =>
      /\.(jpe?g|png|webp)$/i.test(f),
    )
  : [];
const libraryImages = [];
const tmp = await mkdtemp(join(tmpdir(), "ark-svc-import-"));

try {
  for (const file of imageFiles) {
    const src = join(imagesRoot, file);
    const stem = basename(file, extname(file));
    const id = `svc-img-${stem}`;
    const masterKey = `library/${id}/${stem}.jpg`;
    const webpKey = `library/${id}/${stem}.webp`;
    const img = sharp(src);
    const meta = await img.metadata();
    const pipeline = sharp(src).rotate().resize({
      width: 1920,
      height: 1920,
      fit: "inside",
      withoutEnlargement: true,
    });
    const jpgBuf = await pipeline
      .clone()
      .jpeg({ quality: 85, mozjpeg: true })
      .toBuffer();
    const webpBuf = await pipeline
      .clone()
      .webp({ quality: 82 })
      .toBuffer();
    const jpgPath = join(tmp, `${stem}.jpg`);
    const webpPath = join(tmp, `${stem}.webp`);
    await writeFile(jpgPath, jpgBuf);
    await writeFile(webpPath, webpBuf);
    const info = await sharp(jpgBuf).metadata();
    libraryImages.push({
      id,
      name: stem,
      alt: stem,
      masterKey,
      webpKey,
      width: info.width || meta.width || 0,
      height: info.height || meta.height || 0,
      bytes: jpgBuf.byteLength,
      jpgPath,
      webpPath,
    });
  }

  // Build pages with image refs
  const pages = [];
  for (const s of services) {
    const ro = await loadArticle("ro", s.slug);
    const en = await loadArticle("en", s.slug);
    const bg = await loadArticle("bg", s.slug);
    const images = [];
    const srcImages = Array.isArray(ro?.images) ? ro.images : [];
    for (const im of srcImages) {
      const stem = basename(String(im.src || ""), extname(String(im.src || "")));
      const lib = libraryImages.find((l) => l.name === stem);
      if (!lib) continue;
      const altRo = String(im.alt || stem);
      const altEn =
        (en?.images || []).find((x) => basename(x.src || "", extname(x.src || "")) === stem)
          ?.alt || altRo;
      const altBg =
        (bg?.images || []).find((x) => basename(x.src || "", extname(x.src || "")) === stem)
          ?.alt || altRo;
      images.push({
        libraryAssetId: lib.id,
        masterKey: lib.masterKey,
        webpKey: lib.webpKey,
        alt: { ro: altRo, en: altEn, bg: altBg },
      });
    }
    pages.push({
      service_id: s.id,
      synopsis: {
        ro: ro?.synopsis || s.synopsis.ro || "",
        en: en?.synopsis || s.synopsis.en || "",
        bg: bg?.synopsis || s.synopsis.bg || "",
      },
      paragraphs: {
        ro: Array.isArray(ro?.paragraphs) ? ro.paragraphs : [],
        en: Array.isArray(en?.paragraphs) ? en.paragraphs : [],
        bg: Array.isArray(bg?.paragraphs) ? bg.paragraphs : [],
      },
      images,
    });
  }

  // SQL batches
  const statements = [];
  statements.push(`DELETE FROM service_recommended;`);
  statements.push(`DELETE FROM service_pages;`);
  statements.push(`DELETE FROM services;`);
  statements.push(`DELETE FROM service_subcategories;`);
  statements.push(`DELETE FROM service_categories;`);

  for (const c of categories) {
    statements.push(
      `INSERT INTO service_categories (id, position, slug, name_ro, name_en, name_bg, icon_key, icon_svg, enabled)
       VALUES ('${sqlEscape(c.id)}', ${c.position}, '${sqlEscape(c.slug)}', '${sqlEscape(c.name.ro)}', '${sqlEscape(c.name.en)}', '${sqlEscape(c.name.bg)}', '', '${sqlEscape(c.icon_svg)}', 1);`,
    );
  }
  for (const s of subcategories) {
    statements.push(
      `INSERT INTO service_subcategories (id, category_id, position, slug, name_ro, name_en, name_bg, icon_svg, enabled)
       VALUES ('${sqlEscape(s.id)}', '${sqlEscape(s.category_id)}', ${s.position}, '${sqlEscape(s.slug)}', '${sqlEscape(s.name.ro)}', '${sqlEscape(s.name.en)}', '${sqlEscape(s.name.bg)}', '${sqlEscape(s.icon_svg)}', 1);`,
    );
  }

  // Icons into icons table (replace prior import names)
  statements.push(
    `DELETE FROM icons WHERE name LIKE 'service:%' OR name LIKE 'category:%';`,
  );
  let iconPos = 1000;
  for (const s of services) {
    if (!s.icon_svg) continue;
    const name = `service:${s.slug}`;
    const compact = s.icon_svg.replace(/\s+/g, " ").trim();
    statements.push(
      `INSERT INTO icons (id, name, svg, position)
       VALUES ('${sqlEscape(s.id)}', '${sqlEscape(name)}', '${sqlEscape(compact)}', ${iconPos++})
       ON CONFLICT(id) DO UPDATE SET name = excluded.name, svg = excluded.svg, updated_at = datetime('now');`,
    );
    s.icon_svg = compact;
  }
  for (const c of categories) {
    if (!c.icon_svg) continue;
    const compact = c.icon_svg.replace(/\s+/g, " ").trim();
    statements.push(
      `INSERT INTO icons (id, name, svg, position)
       VALUES ('cat-${sqlEscape(c.id)}', '${sqlEscape(`category:${c.slug}`)}', '${sqlEscape(compact)}', ${iconPos++})
       ON CONFLICT(id) DO UPDATE SET name = excluded.name, svg = excluded.svg, updated_at = datetime('now');`,
    );
    c.icon_svg = compact;
  }

  for (const s of services) {
    const sub = s.subcategory_id ? `'${sqlEscape(s.subcategory_id)}'` : "NULL";
    statements.push(
      `INSERT INTO services (id, position, slug, title_ro, title_en, title_bg, category_id, subcategory_id, icon_id, icon_svg, price_text, currency, page_path, enabled)
       VALUES ('${sqlEscape(s.id)}', ${s.position}, '${sqlEscape(s.slug)}', '${sqlEscape(s.title.ro)}', '${sqlEscape(s.title.en)}', '${sqlEscape(s.title.bg)}', '${sqlEscape(s.category_id)}', ${sub}, '${sqlEscape(s.id)}', '${sqlEscape(s.icon_svg)}', '${sqlEscape(s.price_text)}', '${sqlEscape(s.currency)}', '${sqlEscape(s.page_path)}', 1);`,
    );
  }

  for (const p of pages) {
    statements.push(
      `INSERT INTO service_pages (service_id, synopsis_ro, synopsis_en, synopsis_bg, body_json_ro, body_json_en, body_json_bg, images_json)
       VALUES ('${sqlEscape(p.service_id)}', '${sqlEscape(p.synopsis.ro)}', '${sqlEscape(p.synopsis.en)}', '${sqlEscape(p.synopsis.bg)}', '${sqlEscape(JSON.stringify(p.paragraphs.ro))}', '${sqlEscape(JSON.stringify(p.paragraphs.en))}', '${sqlEscape(JSON.stringify(p.paragraphs.bg))}', '${sqlEscape(JSON.stringify(p.images))}');`,
    );
  }

  let recPos = 1;
  for (const id of recommendedIds) {
    statements.push(
      `INSERT INTO service_recommended (service_id, position) VALUES ('${sqlEscape(id)}', ${recPos++});`,
    );
  }

  // Library category + images
  statements.push(
    `INSERT OR IGNORE INTO library_categories (id, name, position, is_system)
     VALUES ('services-articles', 'Services articles', 90, 0);`,
  );
  for (const img of libraryImages) {
    statements.push(
      `INSERT INTO library_images (id, name, alt, kind, master_key, master_content_type, webp_key, width, height, bytes, position)
       VALUES ('${sqlEscape(img.id)}', '${sqlEscape(img.name)}', '${sqlEscape(img.alt)}', 'image', '${sqlEscape(img.masterKey)}', 'image/jpeg', '${sqlEscape(img.webpKey)}', ${img.width}, ${img.height}, ${img.bytes}, 1)
       ON CONFLICT(id) DO UPDATE SET
         master_key = excluded.master_key,
         webp_key = excluded.webp_key,
         width = excluded.width,
         height = excluded.height,
         bytes = excluded.bytes,
         updated_at = datetime('now');`,
    );
    statements.push(
      `INSERT OR IGNORE INTO library_image_categories (image_id, category_id)
       VALUES ('${sqlEscape(img.id)}', 'services-articles');`,
    );
  }

  const sqlFile = join(tmp, "import-services.sql");
  await writeFile(sqlFile, statements.join("\n"));
  console.log(`SQL statements: ${statements.length}`);

  if (dryRun) {
    console.log("Dry run — skipping D1/R2 writes");
    console.log(`Would import ${libraryImages.length} library images`);
    process.exit(0);
  }

  console.log("Applying migration 0014 (if needed)…");
  try {
    wrangler(["d1", "migrations", "apply", SITE_DB, ...localFlag]);
  } catch (err) {
    console.warn(String(err.message || err).slice(0, 400));
  }

  // Split SQL into chunks — wrangler has size limits (SVGs are large)
  const chunkSize = 8;
  for (let i = 0; i < statements.length; i += chunkSize) {
    const chunk = statements.slice(i, i + chunkSize).join("\n");
    const chunkFile = join(tmp, `chunk-${i}.sql`);
    await writeFile(chunkFile, chunk);
    console.log(`D1 execute chunk ${i / chunkSize + 1}/${Math.ceil(statements.length / chunkSize)}`);
    wrangler(["d1", "execute", SITE_DB, ...localFlag, `--file=${chunkFile}`]);
  }

  // Upload library images
  for (const img of libraryImages) {
    console.log(`↑ media ${img.masterKey}`);
    wrangler([
      "r2",
      "object",
      "put",
      `${MEDIA}/${img.masterKey}`,
      ...localFlag,
      `--file=${img.jpgPath}`,
      "--content-type",
      "image/jpeg",
    ]);
    wrangler([
      "r2",
      "object",
      "put",
      `${MEDIA}/${img.webpKey}`,
      ...localFlag,
      `--file=${img.webpPath}`,
      "--content-type",
      "image/webp",
    ]);
  }

  // Publish catalog + pages
  const catalogDoc = {
    recommended: recommendedIds,
    categories: categories.map((c) => ({
      id: c.id,
      slug: c.slug,
      position: c.position,
      name: c.name,
      iconSvg: c.icon_svg,
      enabled: true,
    })),
    subcategories: subcategories.map((s) => ({
      id: s.id,
      categoryId: s.category_id,
      slug: s.slug,
      position: s.position,
      name: s.name,
      iconSvg: s.icon_svg,
      enabled: true,
    })),
    services: services.map((s) => ({
      id: s.id,
      slug: s.slug,
      position: s.position,
      title: s.title,
      categoryId: s.category_id,
      subcategoryId: s.subcategory_id,
      price: s.price_text,
      currency: s.currency,
      iconSvg: s.icon_svg,
      pagePath: s.page_path,
      enabled: true,
    })),
    pdfKey: "services/price-list.pdf",
    updatedAt: new Date().toISOString(),
  };

  const catalogFile = join(tmp, "services.json");
  await writeFile(catalogFile, JSON.stringify(catalogDoc, null, 2));
  console.log("↑ content services/services.json");
  wrangler([
    "r2",
    "object",
    "put",
    `${CONTENT}/services/services.json`,
    ...localFlag,
    `--file=${catalogFile}`,
    "--content-type",
    "application/json",
  ]);

  for (const p of pages) {
    const svc = services.find((s) => s.id === p.service_id);
    if (!svc) continue;
    const doc = {
      slug: svc.slug,
      title: svc.title,
      synopsis: p.synopsis,
      paragraphs: p.paragraphs,
      images: p.images.map((img) => ({
        master: img.masterKey,
        webp: img.webpKey,
        alt: img.alt,
      })),
      categoryId: svc.category_id,
      subcategoryId: svc.subcategory_id,
      price: svc.price_text,
      currency: svc.currency,
      iconSvg: svc.icon_svg,
      pagePath: svc.page_path,
    };
    const pageFile = join(tmp, `${svc.slug}.json`);
    await writeFile(pageFile, JSON.stringify(doc, null, 2));
    wrangler([
      "r2",
      "object",
      "put",
      `${CONTENT}/services/pages/${svc.slug}.json`,
      ...localFlag,
      `--file=${pageFile}`,
      "--content-type",
      "application/json",
    ]);
  }
  console.log(`↑ ${pages.length} service pages`);

  // PDF
  const pdfLines = [
    { text: "Ark Dental — Lista de preturi / Price list", size: 16, bold: true },
    { text: `Generat: ${new Date().toISOString().slice(0, 10)}`, size: 10 },
    { text: "", size: 8 },
  ];
  for (const cat of categories) {
    pdfLines.push({
      text: cat.name.ro || cat.name.en || cat.slug,
      size: 13,
      bold: true,
    });
    const direct = services.filter(
      (s) => s.category_id === cat.id && !s.subcategory_id,
    );
    for (const svc of direct) {
      pdfLines.push({
        text: `  ${svc.title.ro || svc.title.en} — ${svc.price_text} ${svc.currency}`,
        size: 10,
      });
    }
    const subs = subcategories.filter((s) => s.category_id === cat.id);
    for (const sub of subs) {
      pdfLines.push({
        text: `  ${sub.name.ro || sub.name.en}`,
        size: 11,
        bold: true,
      });
      for (const svc of services.filter((s) => s.subcategory_id === sub.id)) {
        pdfLines.push({
          text: `    ${svc.title.ro || svc.title.en} — ${svc.price_text} ${svc.currency}`,
          size: 10,
        });
      }
    }
    pdfLines.push({ text: "", size: 8 });
  }
  const pdfBuf = buildPriceListPdf(pdfLines);
  const pdfFile = join(tmp, "price-list.pdf");
  await writeFile(pdfFile, pdfBuf);
  console.log("↑ content services/price-list.pdf");
  wrangler([
    "r2",
    "object",
    "put",
    `${CONTENT}/services/price-list.pdf`,
    ...localFlag,
    `--file=${pdfFile}`,
    "--content-type",
    "application/pdf",
  ]);

  // Mirror wrangler --local D1/R2 into Vite/miniflare (.cloudflare) so admin UI sees data
  if (!remote) {
    try {
      const { DatabaseSync } = await import("node:sqlite");
      const { copyFileSync, readdirSync } = await import("node:fs");
      const wDir = join(root, ".wrangler/state/v3/d1/miniflare-D1DatabaseObject");
      const cDir = join(root, ".cloudflare/state/v3/d1/miniflare-D1DatabaseObject");
      if (existsSync(wDir) && existsSync(cDir)) {
        for (const name of readdirSync(wDir)) {
          if (!name.endsWith(".sqlite") || name.includes("metadata")) continue;
          const src = join(wDir, name);
          const dest = join(cDir, name);
          try {
            const db = new DatabaseSync(src, { readOnly: true });
            const has = db
              .prepare(
                `SELECT 1 AS ok FROM sqlite_master WHERE type='table' AND name='services' LIMIT 1`,
              )
              .get();
            const count = has
              ? db.prepare(`SELECT COUNT(*) AS c FROM services`).get()?.c
              : 0;
            db.close();
            if (count > 0 && existsSync(dest)) {
              copyFileSync(src, dest);
              console.log(`Mirrored D1 → .cloudflare (${count} services)`);
            }
          } catch {
            // skip locked/unreadable
          }
        }
      }
      const wr2 = join(root, ".wrangler/state/v3/r2/miniflare-R2BucketObject");
      const cr2 = join(root, ".cloudflare/state/v3/r2/miniflare-R2BucketObject");
      if (existsSync(wr2) && existsSync(cr2)) {
        for (const name of readdirSync(wr2)) {
          if (!name.endsWith(".sqlite") || name.includes("metadata")) continue;
          const src = join(wr2, name);
          const dest = join(cr2, name);
          if (existsSync(dest)) {
            copyFileSync(src, dest);
            console.log(`Mirrored R2 → .cloudflare (${name.slice(0, 8)}…)`);
          }
        }
      }
    } catch (err) {
      console.warn("Could not mirror to .cloudflare:", err?.message || err);
    }
  }

  if (toSite && existsSync(siteRoot)) {
    const siteData = join(siteRoot, "src/data/services");
    const sitePages = join(siteData, "pages");
    const siteAssets = join(siteRoot, "src/assets/services");
    const siteMedia = join(siteRoot, "src/assets/media");
    const sitePublic = join(siteRoot, "public/media");
    await mkdir(sitePages, { recursive: true });
    await mkdir(siteAssets, { recursive: true });
    await writeFile(
      join(siteData, "services.json"),
      JSON.stringify(catalogDoc, null, 2),
    );
    for (const p of pages) {
      const svc = services.find((s) => s.id === p.service_id);
      if (!svc) continue;
      const doc = {
        slug: svc.slug,
        title: svc.title,
        synopsis: p.synopsis,
        paragraphs: p.paragraphs,
        images: p.images.map((img) => ({
          master: img.masterKey,
          webp: img.webpKey,
          alt: img.alt,
        })),
        categoryId: svc.category_id,
        subcategoryId: svc.subcategory_id,
        price: svc.price_text,
        currency: svc.currency,
        iconSvg: svc.icon_svg,
        pagePath: svc.page_path,
      };
      await writeFile(
        join(sitePages, `${svc.slug}.json`),
        JSON.stringify(doc, null, 2),
      );
    }
    await writeFile(join(siteAssets, "price-list.pdf"), pdfBuf);
    for (const img of libraryImages) {
      const dest = join(siteMedia, img.masterKey);
      const webpDest = join(siteMedia, img.webpKey);
      await mkdir(dirname(dest), { recursive: true });
      await writeFile(dest, await readFile(img.jpgPath));
      await writeFile(webpDest, await readFile(img.webpPath));
      const pubJpg = join(sitePublic, img.masterKey);
      const pubWebp = join(sitePublic, img.webpKey);
      await mkdir(dirname(pubJpg), { recursive: true });
      await writeFile(pubJpg, await readFile(img.jpgPath));
      await writeFile(pubWebp, await readFile(img.webpPath));
    }
    console.log(`Wrote catalog + pages + media into ${siteRoot}`);
  }

  console.log("Import complete.");
} finally {
  await rm(tmp, { recursive: true, force: true });
}
