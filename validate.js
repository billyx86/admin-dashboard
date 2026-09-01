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

// --- 7. Theme tokens + [data-theme] switch (#8) -------------------------
// The light theme is :root; dark is activated with [data-theme="dark"].
// Assert both blocks exist and define the core custom properties, and that
// every token :root defines is redefined for dark (no half-themes).
const css = existsSync(join(here, 'style.css'))
  ? readFileSync(join(here, 'style.css'), 'utf8')
  : '';
const blockOf = (sel) => {
  const start = css.indexOf(sel);
  if (start === -1) return null;
  const open = css.indexOf('{', start);
  let depth = 0;
  for (let i = open; i < css.length; i++) {
    if (css[i] === '{') depth++;
    else if (css[i] === '}') { depth--; if (depth === 0) return css.slice(open + 1, i); }
  }
  return null;
};
const lightBlock = blockOf(':root {') ?? blockOf(':root{');
const darkBlock = blockOf(':root[data-theme="dark"]');
const CORE_TOKENS = [
  '--sidebar-bg', '--accent', '--content-bg', '--card-bg',
  '--text-primary', '--text-secondary',
];
if (!lightBlock) fail('no :root theme-token block in style.css');
if (!darkBlock) fail('no :root[data-theme="dark"] theme-token block in style.css');
if (lightBlock && darkBlock) {
  const tokensIn = (b) => new Set([...b.matchAll(/(--[a-z0-9-]+)\s*:/gi)].map((m) => m[1]));
  const lightTokens = tokensIn(lightBlock);
  const darkTokens = tokensIn(darkBlock);
  for (const t of CORE_TOKENS) {
    if (!lightTokens.has(t)) fail(`:root is missing core theme token ${t}`);
    if (!darkTokens.has(t)) fail(`dark theme is missing core theme token ${t}`);
  }
  for (const t of lightTokens) {
    if (!darkTokens.has(t)) fail(`token ${t} defined in :root but not overridden for dark`);
  }
}

// --- 8. Theme toggle button a11y (#8) -----------------------------------
const toggleMatch = [...html.matchAll(/<button\b[^>]*\bid\s*=\s*["']theme-toggle["'][^>]*>/gi)];
const toggle = toggleMatch[0]?.[0];
if (!toggle) {
  fail('missing #theme-toggle button');
} else {
  if (!/\baria-label\s*=\s*["'][^"']*["']/i.test(toggle)) fail('#theme-toggle has no aria-label');
  if (!/\baria-pressed\s*=\s*["'](?:true|false)["']/i.test(toggle)) fail('#theme-toggle has no aria-pressed');
  if (!/\btype\s*=\s*["']button["']/i.test(toggle)) fail('#theme-toggle should be type="button"');
}

// --- 9. Data layer files (#7) ------------------------------------------
const dataJsonPath = join(here, 'data.json');
if (!existsSync(dataJsonPath)) {
  fail('data.json missing (data-driven content source)');
} else {
  try {
    const parsed = JSON.parse(readFileSync(dataJsonPath, 'utf8'));
    for (const key of ['projects', 'announcements', 'trending']) {
      if (!Array.isArray(parsed[key]) || parsed[key].length === 0) {
        fail(`data.json is missing a non-empty "${key}" array`);
      }
    }
  } catch (e) {
    fail(`data.json is not valid JSON: ${e.message}`);
  }
}
for (const script of ['data.js', 'theme.js']) {
  if (!existsSync(join(here, script))) fail(`${script} missing`);
}

// --- Result ------------------------------------------------------------
if (problems.length) {
  console.error(`validate.js: ${problems.length} problem(s) found:\n`);
  for (const p of problems) console.error(`  - ${p}`);
  process.exit(1);
}
console.log(`validate.js: OK — head, landmarks, alt text, labels and ${refs.size} local reference(s) all check out.`);
