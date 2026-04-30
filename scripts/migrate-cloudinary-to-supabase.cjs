#!/usr/bin/env node
/* eslint-disable */
// One-shot migration: download every Cloudinary asset referenced in the DB,
// re-upload it to Supabase Storage, and rewrite the DB row to point at the
// new Supabase public URL. Idempotent — only touches URLs containing
// "cloudinary.com".

const pg = require("pg");
const { createClient } = require("@supabase/supabase-js");
const path = require("path");

const DB_URL = process.env.SUPABASE_DATABASE_URL || process.env.DATABASE_URL;
const SUPA_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const SUPA_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!DB_URL) { console.error("SUPABASE_DATABASE_URL/DATABASE_URL missing"); process.exit(1); }
if (!SUPA_URL || !SUPA_KEY) { console.error("SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY missing"); process.exit(1); }

const useSsl = /sslmode=require/i.test(DB_URL) || /supabase\.co/i.test(DB_URL);
const db = new pg.Client({ connectionString: DB_URL, ssl: useSsl ? { rejectUnauthorized: false } : false });
const supa = createClient(SUPA_URL, SUPA_KEY, { auth: { persistSession: false, autoRefreshToken: false } });

const ensuredBuckets = new Set();
async function ensureBucket(name) {
  if (ensuredBuckets.has(name)) return;
  const { data } = await supa.storage.getBucket(name);
  if (!data) {
    const { error } = await supa.storage.createBucket(name, {
      public: true,
      fileSizeLimit: 15 * 1024 * 1024,
      allowedMimeTypes: ["image/png", "image/jpeg", "image/webp", "image/gif"],
    });
    if (error && !/already exists/i.test(error.message)) throw error;
  }
  ensuredBuckets.add(name);
}

function isCloudinary(url) {
  return typeof url === "string" && /\bres\.cloudinary\.com\b/i.test(url);
}

function guessExt(contentType, url) {
  if (contentType?.includes("png")) return "png";
  if (contentType?.includes("webp")) return "webp";
  if (contentType?.includes("gif")) return "gif";
  if (contentType?.includes("jpeg") || contentType?.includes("jpg")) return "jpg";
  const m = url.match(/\.([a-zA-Z0-9]{2,5})(?:\?|$)/);
  if (m) return m[1].toLowerCase();
  return "jpg";
}

function safeName(s) {
  return (s || "file").toLowerCase().replace(/[^a-z0-9._-]+/g, "-").replace(/^-+|-+$/g, "") || "file";
}

async function migrateOne(cloudUrl, bucket, folder) {
  await ensureBucket(bucket);
  const res = await fetch(cloudUrl);
  if (!res.ok) throw new Error(`download failed ${res.status}`);
  const ct = res.headers.get("content-type") || "image/jpeg";
  const buf = Buffer.from(await res.arrayBuffer());
  const ext = guessExt(ct, cloudUrl);
  const base = safeName(path.basename(new URL(cloudUrl).pathname).replace(/\.[^.]+$/, "")) || "img";
  const key = `${folder ? folder + "/" : ""}${Date.now()}-${Math.random().toString(36).slice(2, 8)}-${base}.${ext}`;
  const { error } = await supa.storage.from(bucket).upload(key, buf, { contentType: ct, upsert: false, cacheControl: "3600" });
  if (error) throw error;
  const { data } = supa.storage.from(bucket).getPublicUrl(key);
  return data.publicUrl;
}

async function migrateJsonbArray(table, idCol, urlCol, bucket, folder) {
  const sel = await db.query(
    `SELECT ${idCol} AS id, ${urlCol} AS urls FROM ${table}
       WHERE EXISTS (SELECT 1 FROM jsonb_array_elements_text(${urlCol}) g WHERE g LIKE '%cloudinary.com%')`,
  );
  let migrated = 0, failed = 0;
  for (const row of sel.rows) {
    const urls = Array.isArray(row.urls) ? row.urls : [];
    const next = [];
    let changed = false;
    for (const u of urls) {
      if (!isCloudinary(u)) { next.push(u); continue; }
      try {
        const newUrl = await migrateOne(u, bucket, folder);
        next.push(newUrl);
        changed = true;
        migrated++;
        console.log(`  ✓ ${table}#${row.id}: ${u} → ${newUrl}`);
      } catch (e) {
        next.push(u);
        failed++;
        console.warn(`  ✗ ${table}#${row.id}: ${u} → ${e.message}`);
      }
    }
    if (changed) {
      await db.query(`UPDATE ${table} SET ${urlCol} = $1::jsonb WHERE ${idCol} = $2`, [JSON.stringify(next), row.id]);
    }
  }
  return { table, migrated, failed, scanned: sel.rows.length };
}

async function migrateScalar(table, idCol, urlCol, bucket, folder) {
  const sel = await db.query(`SELECT ${idCol} AS id, ${urlCol} AS url FROM ${table} WHERE ${urlCol} LIKE '%cloudinary.com%'`);
  let migrated = 0, failed = 0;
  for (const row of sel.rows) {
    try {
      const newUrl = await migrateOne(row.url, bucket, folder);
      await db.query(`UPDATE ${table} SET ${urlCol} = $1 WHERE ${idCol} = $2`, [newUrl, row.id]);
      migrated++;
      console.log(`  ✓ ${table}#${row.id}: ${row.url} → ${newUrl}`);
    } catch (e) {
      failed++;
      console.warn(`  ✗ ${table}#${row.id}: ${row.url} → ${e.message}`);
    }
  }
  return { table, migrated, failed, scanned: sel.rows.length };
}

async function migrateSettings() {
  const sel = await db.query(`SELECT key, value FROM pengaturan_situs WHERE value::text LIKE '%cloudinary.com%'`);
  let migrated = 0, failed = 0;
  for (const row of sel.rows) {
    let value = row.value;
    let changed = false;
    async function rewrite(node) {
      if (typeof node === "string") return isCloudinary(node) ? await migrateOne(node, "site", "settings") : node;
      if (Array.isArray(node)) {
        const out = [];
        for (const v of node) out.push(await rewrite(v));
        return out;
      }
      if (node && typeof node === "object") {
        const out = {};
        for (const [k, v] of Object.entries(node)) out[k] = await rewrite(v);
        return out;
      }
      return node;
    }
    try {
      const before = JSON.stringify(value);
      value = await rewrite(value);
      const after = JSON.stringify(value);
      if (before !== after) {
        await db.query(`UPDATE pengaturan_situs SET value = $1::jsonb, updated_at = NOW() WHERE key = $2`, [after, row.key]);
        changed = true;
        migrated++;
        console.log(`  ✓ pengaturan_situs#${row.key} updated`);
      }
    } catch (e) {
      failed++;
      console.warn(`  ✗ pengaturan_situs#${row.key} → ${e.message}`);
    }
  }
  return { table: "pengaturan_situs", migrated, failed, scanned: sel.rows.length };
}

(async () => {
  await db.connect();
  console.log("Connected to DB. Starting Cloudinary → Supabase migration…\n");

  const summary = [];
  console.log("[1/6] portfolio.gambar_url");
  summary.push(await migrateJsonbArray("portfolio", "id", "gambar_url", "portfolio", "portfolio"));
  console.log("\n[2/6] produk.gambar_url");
  summary.push(await migrateJsonbArray("produk",    "id", "gambar_url", "produk",    "produk"));
  console.log("\n[3/6] promo.gambar_url");
  summary.push(await migrateScalar("promo",     "id", "gambar_url",  "promo",     "promo"));
  console.log("\n[4/6] testimoni.foto_url");
  summary.push(await migrateScalar("testimoni", "id", "foto_url",    "testimoni", "testimoni"));
  console.log("\n[5/6] profiles.foto_profil");
  summary.push(await migrateScalar("profiles",  "id", "foto_profil", "profil",    "avatar"));
  console.log("\n[6/6] pengaturan_situs.value");
  summary.push(await migrateSettings());

  console.log("\n=== Summary ===");
  for (const s of summary) console.log(`${s.table.padEnd(20)} scanned=${s.scanned}  migrated=${s.migrated}  failed=${s.failed}`);
  await db.end();
})().catch((e) => { console.error("Fatal:", e); process.exit(1); });
