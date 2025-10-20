/**
 * Quizzer Popup - History & Settings UI
 * Main actions happen via right-click context menu
 * Popup is for viewing history and configuring settings
 */

import * as storage from '../data/storage.js';

// Tab switching
const tabHistory = document.getElementById('tab-history');
const tabSettings = document.getElementById('tab-settings');
const viewHistory = document.getElementById('view-history');
const viewSettings = document.getElementById('view-settings');

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

// Settings management
const DEFAULT_SETTINGS = {
  summaryType: 'key-points',
  summaryLength: 'medium',
  summaryFormat: 'markdown',
  outputLanguage: 'en',
  fcCount: '5',
  fcDifficulty: 'medium',
  fcLanguage: 'en',
  enableCaching: true,
  cacheExpiration: 24,
  chunkSize: 4000,
};

const SETTINGS_KEY = 'quizzer.settings';

async function loadSettings() {
  const data = await chrome.storage.local.get(SETTINGS_KEY);
  return { ...DEFAULT_SETTINGS, ...(data[SETTINGS_KEY] || {}) };
}

async function saveSettings(settings) {
  await chrome.storage.local.set({ [SETTINGS_KEY]: settings });
}

async function initializeSettings() {
  const settings = await loadSettings();

  // Apply settings to form
  document.getElementById('sum-type').value = settings.summaryType;
  document.getElementById('sum-length').value = settings.summaryLength;
  document.getElementById('sum-format').value = settings.summaryFormat;
  document.getElementById('output-language').value = settings.outputLanguage;
  document.getElementById('fc-count').value = settings.fcCount;
  document.getElementById('fc-difficulty').value = settings.fcDifficulty;
  document.getElementById('fc-language').value = settings.fcLanguage;
  document.getElementById('enable-caching').checked = settings.enableCaching;
  document.getElementById('cache-expiration').value = settings.cacheExpiration;
  document.getElementById('chunk-size').value = settings.chunkSize;
}

// Auto-save settings on change
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
        enableCaching: document.getElementById('enable-caching').checked,
        cacheExpiration: parseInt(document.getElementById('cache-expiration').value),
        chunkSize: parseInt(document.getElementById('chunk-size').value),
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

// History - Summaries
async function loadSummaries() {
  const summariesList = document.getElementById('summaries-list');

  // Get summaries from storage
  const data = await chrome.storage.local.get('quizzer.summaries');
  const summaries = data['quizzer.summaries'] || [];

  if (summaries.length === 0) {
    summariesList.innerHTML = '<p class="empty-state">No summaries yet. Right-click text → Quizzer: Summarize</p>';
    return;
  }

  summariesList.innerHTML = summaries.map((summary, index) => `
    <div class="item" data-index="${index}">
      <div class="item-title">${escapeHtml(summary.title || 'Untitled')}</div>
      <div class="item-meta">${new Date(summary.createdAt).toLocaleDateString()}</div>
      <div class="item-preview">${escapeHtml(summary.text.substring(0, 100))}...</div>
    </div>
  `).join('');

  // Add click handlers to show full summary
  summariesList.querySelectorAll('.item').forEach(item => {
    item.addEventListener('click', () => {
      const index = parseInt(item.dataset.index);
      showSummaryDialog(summaries[index]);
    });
  });
}

function showSummaryDialog(summary) {
  alert(`${summary.title}\n\n${summary.text}`);
}

// History - Flashcard Decks
async function loadDecks() {
  const decksList = document.getElementById('decks-list');
  const decks = await storage.listDecks();

  if (decks.length === 0) {
    decksList.innerHTML = '<p class="empty-state">No decks yet. Right-click text → Quizzer: Create Flashcards</p>';
    return;
  }

  decksList.innerHTML = decks.map(deck => `
    <div class="item" data-deck-id="${deck.id}">
      <div class="item-title">${escapeHtml(deck.title || 'Untitled Deck')}</div>
      <div class="item-meta">${deck.cards?.length || 0} cards • ${new Date(deck.createdAt).toLocaleDateString()}</div>
    </div>
  `).join('');

  // Add click handlers to review deck
  decksList.querySelectorAll('.item').forEach(item => {
    item.addEventListener('click', async () => {
      const deckId = item.dataset.deckId;
      const deck = await storage.getDeck(deckId);
      if (deck) {
        reviewDeck(deck);
      }
    });
  });
}

async function reviewDeck(deck) {
  // Send message to content script to show overlay
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id) return;

  try {
    await chrome.tabs.sendMessage(tab.id, {
      type: 'QUIZZER_SHOW_DECK',
      deck: deck
    });
    window.close(); // Close popup after opening deck
  } catch (error) {
    console.error('Failed to show deck:', error);
    showStatus('Failed to open deck. Try refreshing the page.', true);
  }
}

// History - Reports
async function loadReports() {
  const reportsList = document.getElementById('reports-list');
  const reports = await storage.listReports();

  if (reports.length === 0) {
    reportsList.innerHTML = '<p class="empty-state">No reports yet. Right-click → Add to Report Queue, then generate.</p>';
    return;
  }

  reportsList.innerHTML = reports.map(report => `
    <div class="item" data-report-id="${report.id}">
      <div class="item-title">${escapeHtml(report.title || 'Untitled Report')}</div>
      <div class="item-meta">${new Date(report.createdAt).toLocaleDateString()}</div>
      <div class="item-preview">${escapeHtml(report.content.substring(0, 100))}...</div>
    </div>
  `).join('');

  // Add click handlers
  reportsList.querySelectorAll('.item').forEach(item => {
    item.addEventListener('click', async () => {
      const reportId = item.dataset.reportId;
      const report = await storage.getReport(reportId);
      if (report) {
        showReportDialog(report);
      }
    });
  });
}

function showReportDialog(report) {
  alert(`${report.title}\n\n${report.content}`);
}

// Queue management
document.getElementById('clear-queue-btn').addEventListener('click', async () => {
  if (!confirm('Clear all items from the report queue?')) return;

  await storage.clearCollection();
  await updateQueueInfo();
  showStatus('Queue cleared', false);
});

document.getElementById('generate-report-btn').addEventListener('click', async () => {
  const collection = await storage.listCollection();
  if (collection.length === 0) {
    showStatus('Queue is empty', true);
    return;
  }

  showStatus('Report generation coming soon...', false);
});

// Data management
document.getElementById('export-data').addEventListener('click', async () => {
  try {
    const allData = await chrome.storage.local.get(null);
    const exportObject = {
      version: '1.0',
      exportDate: new Date().toISOString(),
      data: allData,
    };

    const dataStr = JSON.stringify(exportObject, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = `quizzer-export-${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

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
    loadReports(),
    updateQueueInfo(),
  ]);
}

// Check Translation API availability
async function checkTranslationAPI() {
  const apiWarning = document.getElementById('api-warning');
  const enableLink = document.getElementById('enable-translation-link');

  // Check if Translation API is available
  if (!('translation' in self) && !('Translator' in self)) {
    apiWarning.removeAttribute('hidden');

    // Handle click on enable link
    enableLink.addEventListener('click', (e) => {
      e.preventDefault();
      // Open chrome://flags in a new tab
      chrome.tabs.create({
        url: 'chrome://flags/#translation-api'
      });
    });
  }
}

// Update queue count color
async function updateQueueInfo() {
  const queueCount = document.getElementById('queue-count');
  const generateBtn = document.getElementById('generate-report-btn');

  const collection = await storage.listCollection();
  const count = collection.length;

  queueCount.textContent = `${count} items in queue`;
  generateBtn.disabled = count === 0;

  // Add green color when there are items
  if (count > 0) {
    queueCount.classList.add('has-items');
  } else {
    queueCount.classList.remove('has-items');
  }
}

// Initialize
async function init() {
  await checkTranslationAPI();
  await initializeSettings();
  setupSettingsAutoSave();
  await loadAllHistory();

  // Refresh history when popup is opened
  chrome.storage.onChanged.addListener((changes, areaName) => {
    if (areaName === 'local') {
      loadAllHistory();
    }
  });
}

// Start
init();
