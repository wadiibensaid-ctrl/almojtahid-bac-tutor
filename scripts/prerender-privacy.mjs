/**
 * Emits dist/confidentialite/index.html from src/lib/privacyContent.js — the
 * same source the in-app modal renders, so the two can't drift apart.
 *
 * Why a static page at all: the modal is reachable only by clicking, which ad
 * platforms (Meta, TikTok, Google) can't accept as a privacy policy URL and
 * crawlers can't read. This gives the policy a real address without pulling a
 * router into a single-route app.
 *
 * Runs after `vite build`; see the build script in package.json.
 */
import { writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { fr, ar } from "../src/lib/privacyContent.js";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
// A flat file rather than confidentialite/index.html: `cleanUrls` in
// vercel.json serves it at /confidentialite, which does not depend on
// directory-index behaviour differing between hosts.
const outFile = resolve(root, "dist/confidentialite.html");

const esc = (s) =>
  String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

const block = (content, lang) => `
    <section lang="${lang}" dir="${lang === "ar" ? "rtl" : "ltr"}">
      <h1>${esc(content.title)}</h1>
      <p class="updated">${esc(content.updated)}</p>
${content.sections
  .map((s) => `      <h2>${esc(s.h)}</h2>\n      <p>${esc(s.p)}</p>`)
  .join("\n")}
    </section>`;

const html = `<!doctype html>
<html lang="fr">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${esc(fr.title)} — Almojtahid</title>
    <meta name="description" content="Politique de confidentialité d'Almojtahid : données collectées, finalités, sous-traitants, mineurs, conservation et droits au titre de la loi 09-08." />
    <link rel="canonical" href="https://www.almojtahid.ma/confidentialite" />
    <link rel="icon" href="/favicon.ico" sizes="any" />
    <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
    <meta name="theme-color" content="#F2E8D5" />
    <style>
      :root { color-scheme: light; }
      body {
        margin: 0;
        background: #F2E8D5;
        color: #2B2620;
        font-family: Inter, system-ui, -apple-system, sans-serif;
        line-height: 1.65;
      }
      main {
        max-width: 640px;
        margin: 0 auto;
        padding: 40px 20px 64px;
      }
      section {
        background: #FFFDF7;
        border: 1.5px solid #D8C9A8;
        border-radius: 16px;
        padding: 32px;
        margin-bottom: 24px;
      }
      h1 { font-family: Georgia, serif; font-size: 24px; margin: 0 0 4px; }
      h2 { font-size: 15px; margin: 22px 0 4px; }
      p { font-size: 14px; color: #4a453d; margin: 0; }
      p.updated { font-size: 12px; color: #9c9184; margin-bottom: 4px; }
      a { color: #B5533C; }
      .back { display: inline-block; font-size: 14px; margin-bottom: 20px; }
    </style>
  </head>
  <body>
    <main>
      <a class="back" href="/">&larr; Almojtahid</a>
${block(fr, "fr")}
${block(ar, "ar")}
    </main>
  </body>
</html>
`;

await writeFile(outFile, html, "utf8");
console.log("prerendered dist/confidentialite.html");
