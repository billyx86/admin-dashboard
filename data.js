/**
 * data.js — tiny, dependency-free data layer for the dashboard.
 *
 * Fetches `data.json` and re-renders the three dynamic sections (projects,
 * announcements, trending) so content is data-driven instead of hard-coded
 * HTML. It keeps the hard-coded markup in `index.html` as a graceful offline
 * fallback: if the fetch fails (e.g. the page is opened via `file://`, or the
 * file is missing), the static snapshot stays on screen untouched and the
 * status pill flips to "Offline".
 *
 * States surfaced to the user / screen readers:
 *   - syncing : fetch in flight  (pill "Syncing…" + aria-busy on the content)
 *   - live    : data rendered    (pill "Live")
 *   - offline : fetch failed     (pill "Offline" + an inline notice)
 */

const DATA_URL = 'data.json';
const FETCH_TIMEOUT_MS = 4000;

// Section id -> renderer. Each renderer takes the array from data.json and
// returns an HTML string for the container.
const CARD_ICONS =
  '<div class="project-buttons">' +
  '<img src="assets/share-variant-outline.svg" alt="" aria-hidden="true">' +
  '<img src="assets/eye-plus-outline.svg" alt="" aria-hidden="true">' +
  '<img src="assets/star-plus-outline.svg" alt="" aria-hidden="true">' +
  '</div>';

const renderers = {
  'projects-list': (items) => items.map((p) =>
    `<article class="project">` +
    `<h4>${esc(p.title)}</h4>` +
    `<p>${esc(p.description)}</p>` +
    `${CARD_ICONS}` +
    `</article>`).join(''),
  'announcements-container': (items) => {
    const block = (a) =>
      `<div class="announcement"><h4>${esc(a.title)}</h4><p>${esc(a.description)}</p></div>`;
    // Announcements are separated by dividers, mirroring the static markup.
    return items.map(block).join('<div class="h-divider" aria-hidden="true"></div>');
  },
  'trending-container': (items) => items.map((t) =>
    `<div class="trending-profile">` +
    `<img src="${esc(t.avatar)}" alt="${esc(t.alt)}">` +
    `<div class="trend-prof-info"><h4>${esc(t.handle)}</h4><p>${esc(t.project)}</p></div>` +
    `</div>`).join(''),
};

const sectionKeys = {
  'projects-list': 'projects',
  'announcements-container': 'announcements',
  'trending-container': 'trending',
};

function esc(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

function pill(state, text) {
  const el = document.getElementById('data-status');
  if (!el) return;
  el.dataset.state = state;
  el.textContent = text;
  el.setAttribute('role', state === 'error' ? 'alert' : 'status');
}

function setContentBusy(busy) {
  const main = document.querySelector('.main-content');
  if (main) main.setAttribute('aria-busy', busy ? 'true' : 'false');
}

function setNotice(message) {
  const el = document.getElementById('data-notice');
  if (!el) return;
  if (message) {
    el.hidden = false;
    el.textContent = message;
  } else {
    el.hidden = true;
    el.textContent = '';
  }
}

async function loadLiveData() {
  // 1. Capture the hard-coded snapshot so we can fall back to it.
  const snapshot = {};
  for (const id of Object.keys(renderers)) {
    const el = document.getElementById(id);
    if (el) snapshot[id] = el.innerHTML;
  }

  setContentBusy(true);
  pill('syncing', 'Syncing…');

  let data = null;
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
    const res = await fetch(DATA_URL, { cache: 'no-store', signal: controller.signal });
    clearTimeout(timer);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    data = await res.json();
  } catch (err) {
    // Graceful fallback: keep the static snapshot, surface the offline state.
    setContentBusy(false);
    pill('error', 'Offline');
    setNotice('Live data unavailable — showing the built-in snapshot.');
    console.warn('[data.js] falling back to static content:', err?.message || err);
    return;
  }

  // 2. Validate shape; render each section that has data.
  let renderedAny = false;
  for (const [id, key] of Object.entries(sectionKeys)) {
    const el = document.getElementById(id);
    const items = Array.isArray(data?.[key]) ? data[key] : null;
    if (!el) continue;
    if (items === null || items.length === 0) {
      // No live data for this section -> keep the static snapshot for it.
      continue;
    }
    el.innerHTML = renderers[id](items);
    renderedAny = true;
  }

  setContentBusy(false);
  pill('live', 'Live');
  setNotice('');
  if (!renderedAny) {
    // Fetched successfully but nothing usable — treat as offline for honesty.
    pill('error', 'Offline');
    setNotice('Live data returned no recognisable sections.');
  }
}

// Run once the DOM is ready. The module is loaded with `defer`, so the DOM is
// already parsed by the time this executes, but guard anyway.
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', loadLiveData);
} else {
  loadLiveData();
}
