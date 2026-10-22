#!/usr/bin/env node
/**
 * Genera sitemap.xml leggendo le pagine pubbliche del sito.
 * Uso:  node scripts/build_sitemap.mjs
 */
import { writeFileSync, statSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join, resolve } from "node:path";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const SITE = "https://www.blackjackguild.it";

// path relativo, priorita, frequenza di aggiornamento
const PAGES = [
  ["index.html", "1.0", "daily"],
  ["pages/raider.html", "0.8", "monthly"],
  ["pages/high-roller/aceofspades.html", "0.9", "daily"],
  ["pages/high-roller/roster-aceofspades.html", "0.8", "weekly"],
  ["pages/spettatori.html", "0.7", "weekly"],
  ["pages/guide.html", "0.8", "weekly"],
  ["pages/recruiting.html", "0.9", "monthly"],
  ["pages/statuto.html", "0.5", "yearly"]
];

const entries = PAGES.filter(([file]) => existsSync(join(ROOT, file))).map(([file, priority, freq]) => {
  const lastmod = statSync(join(ROOT, file)).mtime.toISOString().slice(0, 10);
  const loc = file === "index.html" ? `${SITE}/` : `${SITE}/${file}`;
  return [
    "  <url>",
    `    <loc>${loc}</loc>`,
    `    <lastmod>${lastmod}</lastmod>`,
    `    <changefreq>${freq}</changefreq>`,
    `    <priority>${priority}</priority>`,
    "  </url>"
  ].join("\n");
});

const xml = [
  '<?xml version="1.0" encoding="UTF-8"?>',
  '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
  ...entries,
  "</urlset>",
  ""
].join("\n");

writeFileSync(join(ROOT, "sitemap.xml"), xml, "utf8");
console.log(`sitemap.xml generata con ${entries.length} URL`);
