#!/usr/bin/env node
/**
 * Copy selected CMS tables from local vinext D1 → remote ark-admin-db-site.
 * Usage: node scripts/migrate-local-cms-to-remote.mjs
 */
import { spawnSync } from "node:child_process";
import { mkdirSync, writeFileSync, readdirSync, rmSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { DatabaseSync } from "node:sqlite";
import { readdir } from "node:fs/promises";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const OUT = join("/tmp", "ark-cms-migrate");

const TABLES = [
  "slideshow_settings",
  "slideshow_slides",
  "stuff_spotlight_settings",
  "stuff_categories",
  "stuff_roles",
  "stuff_specialties",
  "stuff_provided_services",
  "stuff_members",
  "stuff_member_provided_services",
  "article_categories",
  "articles",
  "article_pages",
  "article_first_page",
];

function findLocalDb() {
  const base = join(root, ".cloudflare/state/v3/d1/miniflare-D1DatabaseObject");
  if (!existsSync(base)) throw new Error(`Missing local D1 dir: ${base}`);
  const files = readdirSync(base).filter((f) => f.endsWith(".sqlite") && !f.includes("metadata"));
  for (const f of files) {
    const path = join(base, f);
    try {
      const db = new DatabaseSync(path, { readOnly: true });
      const row = db.prepare(
        "SELECT name FROM sqlite_master WHERE type='table' AND name='slideshow_slides'",
      ).get();
      if (row) {
        const n = db.prepare("SELECT COUNT(*) AS n FROM slideshow_slides").get()?.n ?? 0;
        db.close();
        if (n > 0) return path;
        continue;
      }
      db.close();
    } catch {
      /* try next */
    }
  }
  throw new Error("No local vinext D1 with slideshow_slides found");
}

function wranglerJson(args) {
  const r = spawnSync("npx", ["--loglevel=error", "wrangler", ...args, "--json"], {
    cwd: root,
    encoding: "utf8",
    maxBuffer: 20 * 1024 * 1024,
    env: { ...process.env, npm_config_loglevel: "error", NPM_CONFIG_UPDATE_NOTIFIER: "false" },
  });
  const raw = (r.stdout || "").trim();
  // Prefer a top-level JSON array (wrangler --json).
  const start = raw.indexOf("[");
  const end = raw.lastIndexOf("]");
  if (start < 0 || end < start) {
    throw new Error(`wrangler failed: ${args.join(" ")}\n${raw.slice(-800)}`);
  }
  return JSON.parse(raw.slice(start, end + 1));
}

function remoteCols(table) {
  const data = wranglerJson([
    "d1",
    "execute",
    "ark-admin-db-site",
    "--remote",
    "--command",
    `PRAGMA table_info(${table});`,
  ]);
  return (data[0]?.results || []).map((r) => r.name);
}

function lit(v) {
  if (v === null || v === undefined) return "NULL";
  if (typeof v === "number" && Number.isFinite(v)) return String(v);
  return `'${String(v).replace(/'/g, "''")}'`;
}

function buildInsert(table, cols, row, localCols) {
  const vals = cols.map((c) => {
    if (
      c === "published_at" &&
      (row[c] === null || row[c] === "") &&
      localCols.includes("datetime") &&
      row.datetime
    ) {
      return lit(row.datetime);
    }
    return lit(row[c]);
  });
  return `INSERT OR REPLACE INTO ${table} (${cols.join(", ")}) VALUES (${vals.join(", ")});`;
}

function runFile(file) {
  const r = spawnSync(
    "npx",
    ["--loglevel=error", "wrangler", "d1", "execute", "ark-admin-db-site", "--remote", "--file", file, "-y"],
    {
      cwd: root,
      encoding: "utf8",
      maxBuffer: 10 * 1024 * 1024,
      env: { ...process.env, npm_config_loglevel: "error", NPM_CONFIG_UPDATE_NOTIFIER: "false" },
    },
  );
  const out = `${r.stdout || ""}\n${r.stderr || ""}`;
  if (r.status !== 0 || out.includes("✘") || /ERROR/i.test(out)) {
    throw new Error(`Import failed ${file}\n${out.slice(-1200)}`);
  }
  return out;
}

const localPath = findLocalDb();
console.log("Local D1:", localPath);
const db = new DatabaseSync(localPath, { readOnly: true });

rmSync(OUT, { recursive: true, force: true });
mkdirSync(OUT, { recursive: true });

const localTables = new Set(
  db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all().map((r) => r.name),
);

let fileIdx = 0;
for (const table of TABLES) {
  if (!localTables.has(table)) {
    console.log(`skip (no local table) ${table}`);
    continue;
  }
  let rcols;
  try {
    rcols = remoteCols(table);
  } catch (e) {
    console.log(`skip (no remote table) ${table}: ${e.message}`);
    continue;
  }
  const lcols = db.prepare(`PRAGMA table_info(${table})`).all().map((r) => r.name);
  const cols = lcols.filter((c) => rcols.includes(c));
  const rows = db.prepare(`SELECT * FROM ${table}`).all();
  console.log(
    `${table}: ${rows.length} rows, cols=${cols.length}, dropped=${lcols.filter((c) => !rcols.includes(c)).join(",") || "-"}`,
  );
  if (!rows.length) continue;

  // One statement file per few rows to avoid D1_RESET_DO on large imports
  const chunkSize = table === "slideshow_slides" ? 1 : 5;
  for (let i = 0; i < rows.length; i += chunkSize) {
    const chunk = rows.slice(i, i + chunkSize);
    const sql = chunk.map((row) => buildInsert(table, cols, row, lcols)).join("\n") + "\n";
    const file = join(OUT, `part_${String(fileIdx).padStart(4, "0")}_${table}.sql`);
    writeFileSync(file, sql, "utf8");
    fileIdx++;
  }
}

db.close();

const parts = (await readdir(OUT)).filter((f) => f.endsWith(".sql")).sort();
console.log(`Importing ${parts.length} SQL files…`);
for (const name of parts) {
  const file = join(OUT, name);
  process.stdout.write(`  ${name}… `);
  try {
    runFile(file);
    console.log("ok");
  } catch (e) {
    console.log("FAIL");
    console.error(e.message);
    process.exit(1);
  }
}

const check = wranglerJson([
  "d1",
  "execute",
  "ark-admin-db-site",
  "--remote",
  "--command",
  "SELECT (SELECT COUNT(*) FROM slideshow_slides) AS slides, (SELECT COUNT(*) FROM stuff_members) AS stuff, (SELECT COUNT(*) FROM articles) AS articles;",
]);
console.log("Remote counts:", check[0]?.results?.[0]);
