# admin-dashboard

An admin dashboard design built with vanilla HTML and CSS Grid (mostly).
Purely static — no framework, no build step, no remote dependencies.

## Run it

There is nothing to install or build. Either:

- open `index.html` directly in a browser, or
- serve the folder: `python3 -m http.server 8000` and visit
  `http://localhost:8000`.

## What's in it

- **`index.html`** — the dashboard: sidebar navigation, a header with
  search/user/actions (including the theme toggle), a project grid, an
  announcements list and a trending panel. Markup uses real landmarks
  (`<aside>`, `<nav>`, `<header>`, `<main>`, `<article>`), every image has
  alt text, and the dynamic sections carry `id`s that the data layer binds to.
  The original hard-coded content is kept in the markup as the offline
  fallback.
- **`data.json`** — the content source. Edit this file (not the HTML) to
  change projects, announcements and trending entries.
- **`data.js`** — tiny, dependency-free data layer. On load it `fetch()`es
  `data.json` and re-renders the projects/announcements/trending sections.
  It shows a **Syncing → Live** status pill on success, and on failure (e.g.
  opened via `file://`, or the file is missing) it keeps the built-in snapshot
  and flips the pill to **Offline** with an inline notice.
- **`theme.js`** — dark/light toggle. Reads the saved preference from
  `localStorage` (falling back to the OS `prefers-color-scheme`), sets
  `<html data-theme="…">`, and drives the header toggle button
  (`aria-pressed` reflects the active theme, so state is announced to
  assistive tech).
- **`style.css`** — all styling, laid out with CSS Grid for the shell and the
  project cards. Colours flow from theme custom properties defined in `:root`
  (light) and `:root[data-theme="dark"]`, so the whole palette switches on a
  single attribute.
- **`assets/`** — every icon and image the page uses, vendored locally
  so the site works offline and hotlinks nothing.

## Content

Edit `data.json` to change what the dashboard shows — no HTML editing
required. Each section (`projects`, `announcements`, `trending`) is an array;
the page re-renders from it on load and falls back to the static snapshot if
the file can't be fetched.

## Theme

The header's moon/sun button toggles light/dark. The choice is remembered in
`localStorage`; before you pick one it follows your OS preference.

## Tests & CI

`npm test` (or `node validate.js`) runs a zero-dependency checker that
verifies the document head, landmarks, alt text, input labels, that all
local asset references exist, that no images are hotlinked remotely, that the
theme tokens are defined for both light (`:root`) and dark
(`[data-theme="dark"]`), that the theme toggle carries accessible
`aria-label`/`aria-pressed` attributes, and that `data.json` exists and is
valid JSON with non-empty `projects`/`announcements`/`trending` arrays.
GitHub Actions runs the same check on every push to `main` and on every
PR (see `.github/workflows/ci.yml`).
