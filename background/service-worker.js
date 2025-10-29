// Quizzer Service Worker (MV3)
// - Creates context menu items
// - Routes requests to content script or popup
// - Does NOT call built-in AI APIs (no DOM here)

const MENUS = {
  SUMMARIZE: 'quizzer_summarize',
  FLASHCARDS: 'quizzer_flashcards',
  ADD_TO_QUEUE: 'quizzer_add_to_queue',
  TRANSLATE: 'quizzer_translate',
  PROOFREAD: 'quizzer_proofread',
  REWRITE: 'quizzer_rewrite',
};

chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.removeAll(() => {
    chrome.contextMenus.create({ id: MENUS.SUMMARIZE, title: 'Quizzer: Summarize', contexts: ['selection', 'page'] });
    chrome.contextMenus.create({ id: MENUS.FLASHCARDS, title: 'Quizzer: Create Flashcards', contexts: ['selection', 'page'] });
    chrome.contextMenus.create({ id: MENUS.ADD_TO_QUEUE, title: 'Quizzer: Add to Report Queue', contexts: ['selection', 'page'] });
    chrome.contextMenus.create({ id: MENUS.TRANSLATE, title: 'Quizzer: Translate Selection', contexts: ['selection'] });
    chrome.contextMenus.create({ id: MENUS.PROOFREAD, title: 'Quizzer: Proofread Selection', contexts: ['selection'] });
    chrome.contextMenus.create({ id: MENUS.REWRITE, title: 'Quizzer: Rewrite Selection', contexts: ['selection'] });
  });
});

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (!tab?.id) return;
  const payload = { menuId: info.menuItemId, selectionText: info.selectionText || null };
  // Forward to the content script; it will handle extraction and UI.
  chrome.tabs.sendMessage(tab.id, { type: 'QUIZZER_CONTEXT_ACTION', payload });
});

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  // Simple router placeholder for popup <-> content coordination if needed later
  if (msg?.type === 'PING') {
    sendResponse({ ok: true });
  }
});
