import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

function showError(message: string, stack?: string) {
  const root = document.getElementById('root');
  if (!root) return;
  const pre = document.createElement('pre');
  pre.style.cssText =
    'position:fixed;inset:0;z-index:9999;background:#0f172a;color:#fca5a5;padding:24px;margin:0;white-space:pre-wrap;overflow:auto;font:13px/1.5 ui-monospace,Menlo,monospace;';
  pre.textContent = `CleanCollect failed to start:\n\n${message}\n\n${stack || ''}`;
  root.innerHTML = '';
  root.appendChild(pre);
}

window.addEventListener('error', (e) => {
  if (e.error) showError(e.error.message || String(e.error), e.error.stack);
  else if (e.message) showError(e.message);
});
window.addEventListener('unhandledrejection', (e) => {
  const r: any = e.reason;
  showError(r?.message || String(r), r?.stack);
});

try {
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
} catch (e: any) {
  showError(e?.message || String(e), e?.stack);
}