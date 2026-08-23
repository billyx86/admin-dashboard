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
  search/user/actions, a project grid, an announcements list and a
  trending panel. Markup uses real landmarks (`<aside>`, `<nav>`,
  `<header>`, `<main>`, `<article>`) and every image has alt text.
- **`style.css`** — all styling, laid out with CSS Grid for the shell
  and the project cards.
- **`assets/`** — every icon and image the page uses, vendored locally
  so the site works offline and hotlinks nothing.

## Tests & CI

`npm test` (or `node validate.js`) runs a zero-dependency checker that
verifies the document head, landmarks, alt text, input labels, that all
local asset references exist, and that no images are hotlinked remotely.
GitHub Actions runs the same check on every push to `main` and on every
PR (see `.github/workflows/ci.yml`).
