// LocalScholar Service Worker (MV3)
// - Creates context menu items
// - Routes requests to content script or popup
// - Does NOT call built-in AI APIs (no DOM here)

const MENUS = {
  SUMMARIZE: 'localscholar_summarize',
  FLASHCARDS: 'localscholar_flashcards',
  ADD_TO_QUEUE: 'localscholar_add_to_queue',
  TRANSLATE: 'localscholar_translate',
  PROOFREAD: 'localscholar_proofread',
  REWRITE: 'localscholar_rewrite',
};

chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.removeAll(() => {
    chrome.contextMenus.create({ id: MENUS.SUMMARIZE, title: 'LocalScholar: Summarize', contexts: ['selection', 'page'] });
    chrome.contextMenus.create({ id: MENUS.FLASHCARDS, title: 'LocalScholar: Create Flashcards', contexts: ['selection', 'page'] });
    chrome.contextMenus.create({ id: MENUS.ADD_TO_QUEUE, title: 'LocalScholar: Add to Report Queue', contexts: ['selection', 'page'] });
    chrome.contextMenus.create({ id: MENUS.TRANSLATE, title: 'LocalScholar: Translate Selection', contexts: ['selection'] });
    chrome.contextMenus.create({ id: MENUS.PROOFREAD, title: 'LocalScholar: Proofread Selection', contexts: ['selection'] });
    chrome.contextMenus.create({ id: MENUS.REWRITE, title: 'LocalScholar: Rewrite Selection', contexts: ['selection'] });
  });
});

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (!tab?.id) return;
  const payload = { menuId: info.menuItemId, selectionText: info.selectionText || null };
  // Forward to the content script; it will handle extraction and UI.
  chrome.tabs.sendMessage(tab.id, { type: 'LOCALSCHOLAR_CONTEXT_ACTION', payload });
});

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  // Simple router placeholder for popup <-> content coordination if needed later
  if (msg?.type === 'PING') {
    sendResponse({ ok: true });
  }
});
