/**
 * Content Script Loader
 * Dynamically imports the main content script as a module
 */

(async function() {
  try {
    // Import the main content script as a module
    await import(chrome.runtime.getURL('content/content.js'));
    console.log('[Quizzer] Content script modules loaded successfully');
  } catch (error) {
    console.error('[Quizzer] Failed to load content script:', error);
  }
})();
