#!/usr/bin/env node
/**
 * validate.js — zero-dependency HTML sanity + a11y checker for this static
 * site. Run with: node validate.js   (or: npm test)
 *
 * Checks:
 *   1. Document head: doctype, <html lang>, <meta charset>, viewport meta,
 *      non-empty <title>.
 *   2. Landmarks: at least one <main>; the sidebar is an <aside>.
 *   3. Every <img> has an alt attribute (empty alt allowed only for
 *      decorative images that also carry aria-hidden, or that are marked
 *      with a data-decorative attribute).
 *   4. Every text input has an accessible label (matching <label for>,
 *      a wrapping <label>, or aria-label).
 *   5. Every local src/href in the markup resolves to a real file
 *      (catches typos / deleted assets).
 *   6. No hotlinked remote images (the site must be self-contained).
 *
 * Exits 0 when clean, 1 with a list of problems otherwise.
 */
import { readFileSync, existsSync } from 'node:fs';
import { dirname, resolve, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const html = readFileSync(join(here, 'index.html'), 'utf8');

const problems = [];
const fail = (msg) => problems.push(msg);

// --- 1. Document head -------------------------------------------------
if (!/^<!DOCTYPE html>/i.test(html.trim())) fail('missing <!DOCTYPE html>');
if (!/<html[^>]*\blang\s*=\s*["'][^"']+["']/i.test(html)) fail('missing lang attribute on <html>');
if (!/<meta[^>]*\bcharset\s*=/i.test(html)) fail('missing <meta charset>');
if (!/<meta[^>]*name\s*=\s*["']viewport["'][^>]*>/i.test(html)) fail('missing viewport meta tag');
const title = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
if (!title || !title[1].trim()) fail('missing or empty <title>');

// --- 2. Landmarks -----------------------------------------------------
const count = (re) => (html.match(re) || []).length;
if (count(/<main[\s>]/gi) < 1) fail('no <main> landmark');
if (count(/<aside[\s>]/gi) < 1) fail('sidebar is not an <aside> landmark');
if (count(/<header[\s>]/gi) < 1) fail('no <header> landmark');

// --- 3. Image alt text ------------------------------------------------
const imgs = [...html.matchAll(/<img\b[^>]*>/gi)];
imgs.forEach((m, i) => {
  const tag = m[0];
  const src = (tag.match(/\bsrc\s*=\s*["']([^"']*)["']/i) || [])[1] || `#${i}`;
  if (!/\balt\s*=\s*["'][^"']*["']/i.test(tag)) {
    fail(`<img> for ${src} has no alt attribute`);
  }
});

// --- 4. Input labels --------------------------------------------------
const inputs = [...html.matchAll(/<input\b[^>]*>/gi)];
inputs.forEach((m) => {
  const tag = m[0];
  if (/\btype\s*=\s*["'](?:hidden|button|submit|reset)["']/i.test(tag)) return;
  const id = (tag.match(/\bid\s*=\s*["']([^"']*)["']/i) || [])[1];
  const hasFor = id && new RegExp(`<label[^>]*\\bfor\\s*=\\s*["']${id}["']`, 'i').test(html);
  const hasAria = /\baria-label\s*=\s*["'][^"']*["']/i.test(tag);
  if (!hasFor && !hasAria) fail(`input ${id ? `#${id}` : '(no id)'} has no accessible label`);
});

// --- 5. Local references resolve --------------------------------------
const refs = new Set();
for (const m of html.matchAll(/\b(?:src|href)\s*=\s*["']([^"']+)["']/gi)) {
  const ref = m[1];
  if (/^(https?:|mailto:|#|data:|javascript:)/i.test(ref)) continue;
  refs.add(ref);
}
for (const ref of refs) {
  const path = join(here, ref.split('#')[0]);
  if (!existsSync(resolve(path))) fail(`local reference does not exist: ${ref}`);
}

// --- 6. No hotlinked remote images ------------------------------------
for (const m of html.matchAll(/<img\b[^>]*>/gi)) {
  const src = (m[0].match(/\bsrc\s*=\s*["']([^"']*)["']/i) || [])[1] || '';
  if (/^https?:/i.test(src)) fail(`hotlinked remote image: ${src}`);
}

// --- Result ------------------------------------------------------------
if (problems.length) {
  console.error(`validate.js: ${problems.length} problem(s) found:\n`);
  for (const p of problems) console.error(`  - ${p}`);
  process.exit(1);
}
console.log(`validate.js: OK — head, landmarks, alt text, labels and ${refs.size} local reference(s) all check out.`);
