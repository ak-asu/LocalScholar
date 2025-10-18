// Content script: text extraction and basic overlay placeholder

function getSelectionText() {
  const sel = window.getSelection();
  return sel && String(sel).trim() ? String(sel) : '';
}

function getPageText() {
  // Prefer rendered text
  return document.body ? document.body.innerText || '' : '';
}

function mountOverlay() {
  if (document.getElementById('quizzer-overlay-root')) return;
  const host = document.createElement('div');
  host.id = 'quizzer-overlay-root';
  Object.assign(host.style, {
    position: 'fixed', top: '16px', right: '16px', zIndex: 2147483647,
    background: 'white', color: '#111', border: '1px solid #ddd', borderRadius: '8px',
    boxShadow: '0 6px 20px rgba(0,0,0,0.2)', padding: '10px', maxWidth: '360px',
    font: '13px/1.45 system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif'
  });
  const close = document.createElement('button');
  close.textContent = '×';
  close.setAttribute('aria-label', 'Close');
  Object.assign(close.style, { float: 'right', border: 'none', background: 'transparent', fontSize: '18px', cursor: 'pointer' });
  close.addEventListener('click', () => host.remove());
  const title = document.createElement('div');
  title.textContent = 'Quizzer';
  title.style.fontWeight = '600';
  const body = document.createElement('div');
  body.id = 'quizzer-overlay-body';
  body.textContent = 'Overlay ready.';
  host.append(close, title, body);
  document.documentElement.appendChild(host);
}

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg?.type === 'QUIZZER_GET_TEXT') {
    const { source } = msg;
    const text = source === 'selection' ? (getSelectionText() || getPageText()) : getPageText();
    sendResponse({ text });
    return true;
  }
  if (msg?.type === 'QUIZZER_CONTEXT_ACTION') {
    mountOverlay();
    const { menuId, selectionText } = msg.payload || {};
    const body = document.getElementById('quizzer-overlay-body');
    if (body) {
      body.textContent = `Action: ${menuId}. ${(selectionText ? 'Using selection.' : 'Using full page.')}`;
    }
  }
});
