import React from 'react';
import { createRoot } from 'react-dom/client';
import { name as appName } from './app.json';

console.log('[Web] Booting React Native Web app:', appName, 'using dynamic import');

let rootEl = document.getElementById('root');
if (!rootEl) {
  rootEl = document.createElement('div');
  rootEl.id = 'root';
  rootEl.style.height = '100%';
  document.body.appendChild(rootEl);
  console.warn('[Web] Root tag missing; created one dynamically');
}

const root = createRoot(rootEl);
const statusEl = document.getElementById('bundle-status');
if (statusEl) statusEl.textContent = 'Importing App.web…';

// Dynamically import App.web to catch and surface import-time errors
import('./App.web')
  .then((mod) => {
    const App = mod.default;
    root.render(React.createElement(App));
    console.log('[Web] ReactDOM root.render completed');
    if (statusEl) statusEl.textContent = 'App mounted ✔';
  })
  .catch((err) => {
    console.error('[Web] Failed to import App.web:', err);
    const pre = document.createElement('pre');
    pre.textContent = `Failed to import App.web: ${String(err && err.message || err)}\nCheck console for stack.`;
    pre.style.position = 'fixed';
    pre.style.top = '12px';
    pre.style.left = '12px';
    pre.style.background = 'rgba(220,0,0,0.1)';
    pre.style.padding = '8px';
    pre.style.maxWidth = '80%';
    pre.style.whiteSpace = 'pre-wrap';
    pre.style.zIndex = '9999';
    document.body.appendChild(pre);
    if (statusEl) statusEl.textContent = 'App import failed ✖';
  });

// Visual cue that script executed
(() => {
  const banner = document.createElement('div');
  banner.textContent = 'Booting Web Shell…';
  banner.style.position = 'fixed';
  banner.style.bottom = '6px';
  banner.style.right = '8px';
  banner.style.background = 'rgba(0,0,0,0.4)';
  banner.style.color = '#fff';
  banner.style.padding = '4px 8px';
  banner.style.fontSize = '12px';
  banner.style.borderRadius = '4px';
  banner.style.zIndex = '9999';
  document.body.appendChild(banner);
  setTimeout(() => banner.remove(), 2500);
})();
