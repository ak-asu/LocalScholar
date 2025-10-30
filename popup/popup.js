/**
 * Quizzer Popup - Enhanced with modals, action buttons, and report generation
 */

import * as storage from '../data/storage.js';
import { processReportGeneration } from '../utils/ai-pipeline.js';

// Tab switching
const tabHistory = document.getElementById('tab-history');
const tabSettings = document.getElementById('tab-settings');
const viewHistory = document.getElementById('view-history');
const viewSettings = document.getElementById('view-settings');

// Modal elements
const modalOverlay = document.getElementById('modal-overlay');
const modalTitle = document.getElementById('modal-title');
const modalContent = document.getElementById('modal-content');
const modalClose = document.getElementById('modal-close');
const modalOkBtn = document.getElementById('modal-ok-btn');
const modalCopyBtn = document.getElementById('modal-copy-btn');
const modalDownloadBtn = document.getElementById('modal-download-btn');

// Current modal context
let currentModalData = null;

// Settings defaults
const DEFAULT_SETTINGS = {
  summaryType: 'key-points',
  summaryLength: 'medium',
  summaryFormat: 'markdown',
  outputLanguage: 'en',
  fcCount: '5',
  fcDifficulty: 'medium',
  fcLanguage: 'en',
  translationTargetLang: 'es',
  rewriterTone: 'as-is',
  rewriterLength: 'as-is',
  rewriterFormat: 'as-is',
  enableCaching: true,
  cacheExpiration: 24,
  chunkSize: 4000,
  autoSummarize: false,
  autoFlashcards: false
};

const SETTINGS_KEY = 'quizzer.settings';

// Tab switching
function switchTab(showHistory) {
  if (showHistory) {
    tabHistory.classList.add('active');
    tabHistory.setAttribute('aria-selected', 'true');
    tabSettings.classList.remove('active');
    tabSettings.setAttribute('aria-selected', 'false');
    viewHistory.removeAttribute('hidden');
    viewSettings.setAttribute('hidden', '');
  } else {
    tabSettings.classList.add('active');
    tabSettings.setAttribute('aria-selected', 'true');
    tabHistory.classList.remove('active');
    tabHistory.setAttribute('aria-selected', 'false');
    viewSettings.removeAttribute('hidden');
    viewHistory.setAttribute('hidden', '');
  }
}

tabHistory.addEventListener('click', () => switchTab(true));
tabSettings.addEventListener('click', () => switchTab(false));

// Modal functions
function openModal(title, content, data = null) {
  modalTitle.textContent = title;
  modalContent.textContent = content;
  currentModalData = data;
  modalOverlay.removeAttribute('hidden');
}

function closeModal() {
  modalOverlay.setAttribute('hidden', '');
  currentModalData = null;
}

modalClose.addEventListener('click', closeModal);
modalOkBtn.addEventListener('click', closeModal);
modalOverlay.addEventListener('click', (e) => {
  if (e.target === modalOverlay) closeModal();
});

// Modal copy button
modalCopyBtn.addEventListener('click', async () => {
  if (!currentModalData) return;

  try {
    await navigator.clipboard.writeText(modalContent.textContent);
    showStatus('Copied to clipboard!', false);
  } catch (error) {
    showStatus('Failed to copy', true);
  }
});

// Modal download button
modalDownloadBtn.addEventListener('click', () => {
  if (!currentModalData) return;

  const { type, item } = currentModalData;
  let filename = 'quizzer-export.txt';
  let content = modalContent.textContent;

  if (type === 'summary') {
    filename = `summary-${sanitizeFilename(item.title)}.md`;
  } else if (type === 'deck') {
    filename = `flashcards-${sanitizeFilename(item.title)}.json`;
    content = JSON.stringify(item, null, 2);
  } else if (type === 'report') {
    filename = `report-${sanitizeFilename(item.title)}.md`;
  } else if (type === 'queue-item') {
    filename = `queue-item-${sanitizeFilename(item.title)}.txt`;
  }

  downloadFile(content, filename);
  showStatus('Downloaded!', false);
});

function sanitizeFilename(name) {
  return name.replace(/[^a-z0-9]/gi, '-').toLowerCase().substring(0, 50);
}

function downloadFile(content, filename) {
  const blob = new Blob([content], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// Settings management
async function loadSettings() {
  const data = await chrome.storage.local.get(SETTINGS_KEY);
  return { ...DEFAULT_SETTINGS, ...(data[SETTINGS_KEY] || {}) };
}

async function saveSettings(settings) {
  await chrome.storage.local.set({ [SETTINGS_KEY]: settings });
}

async function initializeSettings() {
  const settings = await loadSettings();

  document.getElementById('sum-type').value = settings.summaryType;
  document.getElementById('sum-length').value = settings.summaryLength;
  document.getElementById('sum-format').value = settings.summaryFormat;
  document.getElementById('output-language').value = settings.outputLanguage;
  document.getElementById('fc-count').value = settings.fcCount;
  document.getElementById('fc-difficulty').value = settings.fcDifficulty;
  document.getElementById('fc-language').value = settings.fcLanguage;
  document.getElementById('translation-target-lang').value = settings.translationTargetLang;
  document.getElementById('rewriter-tone').value = settings.rewriterTone;
  document.getElementById('rewriter-length').value = settings.rewriterLength;
  document.getElementById('rewriter-format').value = settings.rewriterFormat;
  document.getElementById('enable-caching').checked = settings.enableCaching;
  document.getElementById('cache-expiration').value = settings.cacheExpiration;
  document.getElementById('chunk-size').value = settings.chunkSize;
  document.getElementById('auto-summarize').checked = settings.autoSummarize || false;
  document.getElementById('auto-flashcards').checked = settings.autoFlashcards || false;
}

// Auto-save settings
function setupSettingsAutoSave() {
  const settingsInputs = viewSettings.querySelectorAll('select, input[type="checkbox"]');

  settingsInputs.forEach(input => {
    input.addEventListener('change', async () => {
      const settings = {
        summaryType: document.getElementById('sum-type').value,
        summaryLength: document.getElementById('sum-length').value,
        summaryFormat: document.getElementById('sum-format').value,
        outputLanguage: document.getElementById('output-language').value,
        fcCount: document.getElementById('fc-count').value,
        fcDifficulty: document.getElementById('fc-difficulty').value,
        fcLanguage: document.getElementById('fc-language').value,
        translationTargetLang: document.getElementById('translation-target-lang').value,
        rewriterTone: document.getElementById('rewriter-tone').value,
        rewriterLength: document.getElementById('rewriter-length').value,
        rewriterFormat: document.getElementById('rewriter-format').value,
        enableCaching: document.getElementById('enable-caching').checked,
        cacheExpiration: parseInt(document.getElementById('cache-expiration').value),
        chunkSize: parseInt(document.getElementById('chunk-size').value),
        autoSummarize: document.getElementById('auto-summarize').checked,
        autoFlashcards: document.getElementById('auto-flashcards').checked
      };

      await saveSettings(settings);
      showStatus('Settings saved', false);
    });
  });
}

// Status message
function showStatus(message, isError = false) {
  const status = document.getElementById('status');
  status.textContent = message;
  status.className = `status ${isError ? 'error' : 'success'}`;

  setTimeout(() => {
    status.textContent = '';
    status.className = 'status';
  }, 3000);
}

// Create action buttons for items
function createActionButtons(item, type) {
  const actions = document.createElement('div');
  actions.className = 'item-actions';

  const viewBtn = document.createElement('button');
  viewBtn.className = 'item-action-btn';
  viewBtn.textContent = '👁️ View';
  viewBtn.onclick = (e) => {
    e.stopPropagation();
    handleView(item, type);
  };

  const copyBtn = document.createElement('button');
  copyBtn.className = 'item-action-btn';
  copyBtn.textContent = '📋 Copy';
  copyBtn.onclick = async (e) => {
    e.stopPropagation();
    await handleCopy(item, type);
  };

  const downloadBtn = document.createElement('button');
  downloadBtn.className = 'item-action-btn';
  downloadBtn.textContent = '⬇️ Download';
  downloadBtn.onclick = (e) => {
    e.stopPropagation();
    handleDownload(item, type);
  };

  const deleteBtn = document.createElement('button');
  deleteBtn.className = 'item-action-btn delete';
  deleteBtn.textContent = '🗑️ Delete';
  deleteBtn.onclick = async (e) => {
    e.stopPropagation();
    await handleDelete(item, type);
  };

  actions.append(viewBtn, copyBtn, downloadBtn, deleteBtn);
  return actions;
}

// Action handlers
async function handleView(item, type) {
  // Get active tab
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id) {
    showStatus('No active tab found', true);
    return;
  }

  try {
    // Send message to content script to show in overlay
    await chrome.tabs.sendMessage(tab.id, {
      type: 'QUIZZER_SHOW_CONTENT',
      item,
      contentType: type
    });

    // Close popup
    window.close();
  } catch (error) {
    console.error('Failed to show content:', error);
    showStatus('Failed to open content. Try refreshing the page.', true);
  }
}

async function handleCopy(item, type) {
  let content = '';

  if (type === 'summary') {
    content = item.text || '';
  } else if (type === 'deck') {
    content = JSON.stringify(item.cards, null, 2);
  } else if (type === 'report') {
    content = item.content || '';
  } else if (type === 'queue-item') {
    content = item.fullText || item.textExcerpt || '';
  }

  try {
    await navigator.clipboard.writeText(content);
    showStatus('Copied to clipboard!', false);
  } catch (error) {
    showStatus('Failed to copy', true);
  }
}

function handleDownload(item, type) {
  let filename = 'quizzer-export.txt';
  let content = '';

  if (type === 'summary') {
    filename = `summary-${sanitizeFilename(item.title)}.md`;
    content = item.text || '';
  } else if (type === 'deck') {
    filename = `flashcards-${sanitizeFilename(item.title)}.json`;
    content = JSON.stringify(item, null, 2);
  } else if (type === 'report') {
    filename = `report-${sanitizeFilename(item.title)}.md`;
    content = item.content || '';
  } else if (type === 'queue-item') {
    filename = `queue-item-${sanitizeFilename(item.title)}.txt`;
    content = item.fullText || item.textExcerpt || '';
  }

  downloadFile(content, filename);
  showStatus('Downloaded!', false);
}

async function handleDelete(item, type) {
  if (!confirm('Are you sure you want to delete this item?')) return;

  try {
    if (type === 'summary') {
      const data = await chrome.storage.local.get('quizzer.summaries');
      const summaries = data['quizzer.summaries'] || [];
      const filtered = summaries.filter(s => s.id !== item.id);
      await chrome.storage.local.set({ 'quizzer.summaries': filtered });
    } else if (type === 'deck') {
      await storage.deleteDeck(item.id);
    } else if (type === 'report') {
      await storage.deleteReport(item.id);
    } else if (type === 'queue-item') {
      await storage.removeFromCollection(item.id);
    }

    await loadAllHistory();
    showStatus('Deleted successfully', false);
  } catch (error) {
    console.error('Delete error:', error);
    showStatus('Failed to delete', true);
  }
}

// Load summaries
async function loadSummaries() {
  const summariesList = document.getElementById('summaries-list');
  const data = await chrome.storage.local.get('quizzer.summaries');
  const summaries = data['quizzer.summaries'] || [];

  if (summaries.length === 0) {
    summariesList.innerHTML = '<p class="empty-state">No summaries yet. Right-click text → Quizzer: Summarize</p>';
    return;
  }

  summariesList.innerHTML = '';
  summaries.forEach(summary => {
    const item = document.createElement('div');
    item.className = 'item';

    const title = document.createElement('div');
    title.className = 'item-title';
    title.textContent = escapeHtml(summary.title || 'Untitled');

    const meta = document.createElement('div');
    meta.className = 'item-meta';
    meta.textContent = new Date(summary.createdAt).toLocaleDateString();

    const preview = document.createElement('div');
    preview.className = 'item-preview';
    preview.textContent = escapeHtml(summary.text.substring(0, 100)) + '...';

    const actions = createActionButtons(summary, 'summary');

    item.append(title, meta, preview, actions);
    summariesList.appendChild(item);
  });
}

// Load flashcard decks
async function loadDecks() {
  const decksList = document.getElementById('decks-list');
  const decks = await storage.listDecks();

  if (decks.length === 0) {
    decksList.innerHTML = '<p class="empty-state">No decks yet. Right-click text → Quizzer: Create Flashcards</p>';
    return;
  }

  decksList.innerHTML = '';
  decks.forEach(deck => {
    const item = document.createElement('div');
    item.className = 'item';

    const title = document.createElement('div');
    title.className = 'item-title';
    title.textContent = escapeHtml(deck.title || 'Untitled Deck');

    const meta = document.createElement('div');
    meta.className = 'item-meta';
    meta.textContent = `${deck.cards?.length || 0} cards • ${new Date(deck.createdAt).toLocaleDateString()}`;

    const actions = createActionButtons(deck, 'deck');

    // Add click to review
    item.style.cursor = 'pointer';
    item.onclick = async () => {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tab?.id) return;

      try {
        await chrome.tabs.sendMessage(tab.id, {
          type: 'QUIZZER_SHOW_DECK',
          deck: deck
        });
        window.close();
      } catch (error) {
        console.error('Failed to show deck:', error);
        showStatus('Failed to open deck. Try refreshing the page.', true);
      }
    };

    item.append(title, meta, actions);
    decksList.appendChild(item);
  });
}

// Load queue items
async function loadQueueItems() {
  const queueList = document.getElementById('queue-list');
  const queueCount = document.getElementById('queue-count');
  const generateBtn = document.getElementById('generate-report-btn');

  const collection = await storage.listCollection();
  const count = collection.length;

  queueCount.textContent = `${count} items in queue`;
  generateBtn.disabled = count === 0;

  if (count > 0) {
    queueCount.classList.add('has-items');
  } else {
    queueCount.classList.remove('has-items');
  }

  if (collection.length === 0) {
    queueList.innerHTML = '<p class="empty-state">No items in queue. Right-click → Add to Report Queue</p>';
    return;
  }

  queueList.innerHTML = '';
  collection.forEach(item => {
    const itemEl = document.createElement('div');
    itemEl.className = 'item';

    const title = document.createElement('div');
    title.className = 'item-title';
    title.textContent = escapeHtml(item.title || 'Untitled');

    const meta = document.createElement('div');
    meta.className = 'item-meta';
    meta.textContent = new Date(item.addedAt).toLocaleDateString();

    const preview = document.createElement('div');
    preview.className = 'item-preview';
    preview.textContent = escapeHtml(item.textExcerpt || '');

    const actions = createActionButtons(item, 'queue-item');

    itemEl.append(title, meta, preview, actions);
    queueList.appendChild(itemEl);
  });
}

// Load reports
async function loadReports() {
  const reportsList = document.getElementById('reports-list');
  const reports = await storage.listReports();

  if (reports.length === 0) {
    reportsList.innerHTML = '<p class="empty-state">No reports yet. Generate a report from queue items above.</p>';
    return;
  }

  reportsList.innerHTML = '';
  reports.forEach(report => {
    const item = document.createElement('div');
    item.className = 'item';

    const title = document.createElement('div');
    title.className = 'item-title';
    title.textContent = escapeHtml(report.title || 'Untitled Report');

    const meta = document.createElement('div');
    meta.className = 'item-meta';
    meta.textContent = new Date(report.createdAt).toLocaleDateString();

    const preview = document.createElement('div');
    preview.className = 'item-preview';
    preview.textContent = escapeHtml(report.content.substring(0, 100)) + '...';

    const actions = createActionButtons(report, 'report');

    item.append(title, meta, preview, actions);
    reportsList.appendChild(item);
  });
}

// Queue management
document.getElementById('clear-queue-btn').addEventListener('click', async () => {
  if (!confirm('Clear all items from the report queue?')) return;

  await storage.clearCollection();
  await loadQueueItems();
  showStatus('Queue cleared', false);
});

// Generate report
document.getElementById('generate-report-btn').addEventListener('click', async () => {
  const collection = await storage.listCollection();
  if (collection.length === 0) {
    showStatus('Queue is empty', true);
    return;
  }

  const generateBtn = document.getElementById('generate-report-btn');
  generateBtn.disabled = true;
  generateBtn.textContent = 'Generating...';

  try {
    const settings = await loadSettings();
    const customInstructions = document.getElementById('report-instructions').value.trim();

    const result = await processReportGeneration({
      items: collection,
      outputLanguage: settings.outputLanguage,
      customInstructions: customInstructions || undefined,
      onProgress: (message, percent) => {
        generateBtn.textContent = `Generating... ${Math.round(percent)}%`;
      }
    });

    // Save report
    const report = {
      title: `Report - ${new Date().toLocaleDateString()}`,
      content: result.report,
      sourceIds: collection.map(item => item.id),
      citations: result.citations
    };

    await storage.saveReport(report);

    // Optionally clear queue
    if (confirm('Report generated! Clear the queue?')) {
      await storage.clearCollection();
    }

    await loadAllHistory();
    showStatus('Report generated successfully!', false);

    // Open modal to view
    openModal(report.title, report.content, { type: 'report', item: report });
  } catch (error) {
    console.error('Report generation error:', error);
    showStatus('Error: ' + error.message, true);
  } finally {
    generateBtn.disabled = false;
    generateBtn.textContent = 'Generate Report from Queue';
  }
});

// Data management
document.getElementById('export-data').addEventListener('click', async () => {
  try {
    const allData = await chrome.storage.local.get(null);
    const exportObject = {
      version: '1.0',
      exportDate: new Date().toISOString(),
      data: allData
    };

    const dataStr = JSON.stringify(exportObject, null, 2);
    downloadFile(dataStr, `quizzer-export-${Date.now()}.json`);
    showStatus('Data exported successfully', false);
  } catch (error) {
    console.error('Export error:', error);
    showStatus('Failed to export data', true);
  }
});

const importFileInput = document.getElementById('import-file');
document.getElementById('import-data').addEventListener('click', () => {
  importFileInput.click();
});

importFileInput.addEventListener('change', async (e) => {
  const file = e.target.files[0];
  if (!file) return;

  try {
    const text = await file.text();
    const importObject = JSON.parse(text);

    if (!importObject.version || !importObject.data) {
      throw new Error('Invalid import file format');
    }

    if (!confirm('This will overwrite all existing data. Continue?')) {
      e.target.value = '';
      return;
    }

    await chrome.storage.local.clear();
    await chrome.storage.local.set(importObject.data);

    showStatus('Data imported successfully', false);
    await loadAllHistory();
    await initializeSettings();
  } catch (error) {
    console.error('Import error:', error);
    showStatus('Failed to import data', true);
  }

  e.target.value = '';
});

document.getElementById('clear-cache-btn').addEventListener('click', async () => {
  if (!confirm('Clear all cached summaries and flashcards?')) return;

  await storage.clearAllCache();
  showStatus('Cache cleared', false);
});

document.getElementById('clear-all-data-btn').addEventListener('click', async () => {
  if (!confirm('This will permanently delete ALL data. Are you sure?')) return;
  if (!confirm('This action cannot be undone. Continue?')) return;

  const settings = await loadSettings();
  await chrome.storage.local.clear();
  await chrome.storage.local.set({ [SETTINGS_KEY]: settings });

  showStatus('All data cleared', false);
  await loadAllHistory();
});

// Utility: escape HTML
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// Load all history
async function loadAllHistory() {
  await Promise.all([
    loadSummaries(),
    loadDecks(),
    loadQueueItems(),
    loadReports()
  ]);
}

// Check AI APIs availability
async function checkAIAPIs() {
  const apiWarning = document.getElementById('api-warning');
  const warningContent = document.getElementById('api-warning-content');
  const missingAPIs = [];

  // Check Summarizer API
  try {
    if (!('Summarizer' in self)) {
      console.log('[Quizzer Popup] Summarizer not in self');
      missingAPIs.push({
        name: 'Summarizer API',
        feature: 'Summarization',
        flag: 'optimization-guide-on-device-model'
      });
    } else {
      const availability = await Summarizer.availability();
      console.log('[Quizzer Popup] Summarizer availability:', availability);
      // Availability states: 'available', 'downloadable', 'unavailable'
      if (availability === 'unavailable') {
        missingAPIs.push({
          name: 'Summarizer API',
          feature: 'Summarization',
          flag: 'optimization-guide-on-device-model',
          reason: 'unavailable on this device'
        });
      }
    }
  } catch (e) {
    console.error('[Quizzer Popup] Summarizer API check error:', e);
    // Don't add to missing list if check itself fails - might be a temporary error
  }

  // Check Prompt API (LanguageModel)
  try {
    if (!('ai' in self) || !self.ai?.languageModel) {
      console.log('[Quizzer Popup] Prompt API not available in self.ai');
      missingAPIs.push({
        name: 'Prompt API',
        feature: 'Flashcards & Reports',
        flag: 'optimization-guide-on-device-model'
      });
    } else {
      const capabilities = await self.ai.languageModel.capabilities();
      console.log('[Quizzer Popup] Prompt API capabilities:', capabilities);
      // capabilities.available states: 'readily', 'after-download', 'no'
      if (capabilities.available === 'no') {
        missingAPIs.push({
          name: 'Prompt API',
          feature: 'Flashcards & Reports',
          flag: 'optimization-guide-on-device-model',
          reason: 'unavailable on this device'
        });
      }
    }
  } catch (e) {
    console.error('[Quizzer Popup] Prompt API check error:', e);
    // Don't add to missing list if check itself fails - might be a temporary error
  }

  // Display warnings if any APIs are missing
  if (missingAPIs.length > 0) {
    const warningHTML = `
      <div style="line-height: 1.5;">
        <div style="margin-bottom: 4px;">⚠️ <strong>AI APIs Not Available</strong></div>
        <div style="font-size: 10px; margin-bottom: 6px;">
          ${missingAPIs.map(api =>
            `• <strong>${api.name}</strong> (${api.feature})${api.reason ? ` - ${api.reason}` : ''}`
          ).join('<br>')}
        </div>
        <div style="font-size: 10px;">
          Enable <strong>"Optimization Guide On Device Model"</strong> at
          <a href="#" id="enable-ai-link" style="color: inherit; font-weight: 600;">chrome://flags</a>,
          then restart Chrome.
        </div>
      </div>
    `;

    warningContent.innerHTML = warningHTML;
    apiWarning.removeAttribute('hidden');

    // Add click handler to open flags page
    const enableLink = document.getElementById('enable-ai-link');
    if (enableLink) {
      enableLink.addEventListener('click', (e) => {
        e.preventDefault();
        chrome.tabs.create({
          url: 'chrome://flags/#optimization-guide-on-device-model'
        });
      });
    }
  } else {
    apiWarning.setAttribute('hidden', '');
  }
}

// Initialize
async function init() {
  await checkAIAPIs();
  await initializeSettings();
  setupSettingsAutoSave();
  await loadAllHistory();

  // Refresh history when storage changes
  chrome.storage.onChanged.addListener((changes, areaName) => {
    if (areaName === 'local') {
      loadAllHistory();
    }
  });
}

// Start
init();
