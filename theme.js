/**
 * theme.js — dark/light theme toggle.
 *
 * Reads the saved preference from `localStorage` (or, failing that, the OS
 * `prefers-color-scheme`), applies it to `<html data-theme="…">`, and wires
 * the header toggle button. The button exposes `aria-pressed` (true when the
 * dark theme is active) so its state is announced to assistive tech.
 */

const STORAGE_KEY = 'dashboard-theme';
const THEMES = ['light', 'dark'];

function systemPrefersDark() {
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches === true;
}

function currentTheme() {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (THEMES.includes(saved)) return saved;
  return systemPrefersDark() ? 'dark' : 'light';
}

function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  const btn = document.getElementById('theme-toggle');
  if (btn) {
    btn.setAttribute('aria-pressed', String(theme === 'dark'));
    btn.setAttribute('aria-label',
      theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme');
    // Swap the shown glyph: show a sun when dark (click -> light), moon when light.
    const sun = btn.querySelector('[data-icon="sun"]');
    const moon = btn.querySelector('[data-icon="moon"]');
    if (sun) sun.hidden = theme !== 'dark';
    if (moon) moon.hidden = theme === 'dark';
  }
}

function initThemeToggle() {
  const btn = document.getElementById('theme-toggle');
  if (!btn) return;

  applyTheme(currentTheme());

  btn.addEventListener('click', () => {
    const next = currentTheme() === 'dark' ? 'light' : 'dark';
    localStorage.setItem(STORAGE_KEY, next);
    applyTheme(next);
  });

  // Keep in sync with OS preference changes until the user picks manually.
  window.matchMedia?.('(prefers-color-scheme: dark)')
    .addEventListener?.('change', (e) => {
      if (!localStorage.getItem(STORAGE_KEY)) applyTheme(e.matches ? 'dark' : 'light');
    });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initThemeToggle);
} else {
  initThemeToggle();
}
