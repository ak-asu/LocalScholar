// Popup logic: Summarizer integration with availability gating and streaming
import { setupThemeListener, setLoadingState, setTextContent } from '../utils/ui-helpers.js';

// DOM Elements cache
const elements = {
  status: null,
  output: null,
  runBtn: null,
  translateControls: null,
  translateLanguage: null,
  translateBtn: null,
  source: null,
  sumType: null,
  sumLength: null,
  sumFormat: null,
  outputLanguage: null
};

// Initialize DOM elements
function initElements() {
  elements.status = document.getElementById('status');
  elements.output = document.getElementById('output');
  elements.runBtn = document.getElementById('run');
  elements.translateControls = document.getElementById('translate-controls');
  elements.translateLanguage = document.getElementById('translate-language');
  elements.translateBtn = document.getElementById('translate-btn');
  elements.source = document.getElementById('source');
  elements.sumType = document.getElementById('sum-type');
  elements.sumLength = document.getElementById('sum-length');
  elements.sumFormat = document.getElementById('sum-format');
  elements.outputLanguage = document.getElementById('output-language');
}

// Tab utilities
async function getActiveTabId() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  return tab?.id;
}

async function sendMessageToTab(message) {
  const tabId = await getActiveTabId();
  if (!tabId) {
    throw new Error('No active tab found');
  }
  try {
    return await chrome.tabs.sendMessage(tabId, message);
  } catch (error) {
    console.warn('Failed to communicate with content script:', error);
    throw new Error('Cannot access this page. Try reloading the page or use a different tab.');
  }
}

// Content extraction
async function getPageText(source) {
  const resp = await sendMessageToTab({ type: 'QUIZZER_GET_TEXT', source, enhanced: false });
  return resp?.text || '';
}

async function getEnhancedContent(source) {
  const resp = await sendMessageToTab({ type: 'QUIZZER_GET_TEXT', source, enhanced: true });

  if (!resp.valid) {
    throw new Error(resp.error || 'Invalid content');
  }

  // Display warnings if any
  if (resp.warnings?.length > 0) {
    console.warn('Content warnings:', resp.warnings);
    resp.warnings.forEach(w => console.warn('- ' + w));
  }

  return resp;
}

// UI utilities
function setStatus(msg) {
  setTextContent(elements.status, msg);
}

function renderOutput(markdownOrText) {
  setTextContent(elements.output, markdownOrText);
}

async function ensureSummarizer(type, length, format, outputLanguage) {
  if (!('Summarizer' in self)) return { error: 'Summarizer API not supported in this Chrome.' };
  const availability = await Summarizer.availability();
  if (availability === 'unavailable') return { error: 'Summarizer unavailable on this device.' };

  // Require user activation (button click triggers this function)
  try {
    const summarizer = await Summarizer.create({
      type, length, format, outputLanguage,
      monitor(m) {
        m.addEventListener('downloadprogress', (e) => {
          setStatus(`Downloading model: ${(e.loaded * 100).toFixed(0)}%`);
        });
      }
    });
    return { summarizer };
  } catch (e) {
    return { error: e?.message || String(e) };
  }
}

let lastSummary = '';
let lastSummaryLang = 'en';

// Get form values
function getFormValues() {
  return {
    source: elements.source.value,
    type: elements.sumType.value,
    length: elements.sumLength.value,
    format: elements.sumFormat.value,
    outputLanguage: elements.outputLanguage.value
  };
}

// Show/hide translate controls
function setTranslateControlsVisible(visible, language = 'en') {
  if (elements.translateControls) {
    elements.translateControls.style.display = visible ? '' : 'none';
    if (visible && elements.translateLanguage) {
      elements.translateLanguage.value = language;
    }
  }
}

async function run() {
  renderOutput('');
  setStatus('Checking availability…');
  setTranslateControlsVisible(false);
  setLoadingState(elements.runBtn, true);

  const { source, type, length, format, outputLanguage } = getFormValues();

  try {
    // Use enhanced content extraction
    await runEnhancedPipeline(source, type, length, format, outputLanguage);
  } catch (error) {
    console.error('Pipeline error:', error);
    setStatus(`Error: ${error.message}`);
  } finally {
    setLoadingState(elements.runBtn, false);
  }
}

async function runEnhancedPipeline(source, type, length, format, outputLanguage) {
  // Get enhanced content extraction from content script
  setStatus('Extracting content...');
  const extraction = await getEnhancedContent(source);

  const { chunks, metadata, needsChunking } = extraction;

  // Single chunk - process directly
  if (!needsChunking || chunks.length === 1) {
    setStatus('Summarizing...');
    const summary = await summarizeChunk(chunks[0].text, type, length, format, outputLanguage);
    renderOutput(summary);
    setStatus('Done.');
    lastSummary = summary;
    lastSummaryLang = outputLanguage;
    setTranslateControlsVisible(true, outputLanguage);
    return;
  }

  // Multiple chunks - process and combine
  setStatus(`Processing ${chunks.length} chunks...`);
  const chunkSummaries = [];

  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i];
    setStatus(`Summarizing chunk ${i + 1}/${chunks.length}...`);

    // Use shorter summaries for individual chunks
    const chunkSummary = await summarizeChunk(
      chunk.text,
      type,
      'short', // Force short for chunks
      format,
      outputLanguage
    );

    chunkSummaries.push({
      summary: chunkSummary,
      sections: chunk.metadata.sections || []
    });

    // Show intermediate progress
    renderOutput(`Processing chunks: ${i + 1}/${chunks.length}...\n\n${chunkSummary}`);
  }

  // Combine summaries
  setStatus('Combining summaries...');
  const finalSummary = await combineSummaries(chunkSummaries, type, length, format, outputLanguage);

  renderOutput(finalSummary);
  setStatus(`Done. Processed ${chunks.length} chunks.`);

  lastSummary = finalSummary;
  lastSummaryLang = outputLanguage;
  setTranslateControlsVisible(true, outputLanguage);
}

/**
 * Summarizes a single chunk of text
 */
async function summarizeChunk(text, type, length, format, outputLanguage) {
  const { summarizer, error } = await ensureSummarizer(type, length, format, outputLanguage);
  if (error) {
    throw new Error(error);
  }

  try {
    const stream = summarizer.summarizeStreaming(text, {
      context: 'Audience: general web reader.'
    });
    let result = '';
    for await (const chunk of stream) {
      result = chunk;
    }
    return result;
  } finally {
    if (summarizer.destroy) {
      summarizer.destroy();
    }
  }
}

/**
 * Combines multiple chunk summaries into a final summary
 */
async function combineSummaries(chunkSummaries, type, length, format, outputLanguage) {
  // For key-points, concatenate with headers
  if (type === 'key-points') {
    if (format === 'markdown') {
      return chunkSummaries.map((cs, idx) => {
        const heading = cs.sections?.[0] || `Part ${idx + 1}`;
        return `### ${heading}\n\n${cs.summary}`;
      }).join('\n\n');
    } else {
      return chunkSummaries.map((cs, idx) => {
        const heading = cs.sections?.[0] || `Part ${idx + 1}`;
        return `${heading}\n${cs.summary}`;
      }).join('\n\n');
    }
  }

  // For tldr, teaser, headline - summarize the summaries
  const combinedText = chunkSummaries.map(cs => cs.summary).join('\n\n');

  // If combined summaries are reasonable size, create summary-of-summaries
  if (combinedText.length < 32000) {
    return await summarizeChunk(combinedText, type, length, format, outputLanguage);
  }

  // Fallback to concatenation if too large
  return combinedText;
}

async function runLegacyPipeline(source, type, length, format, outputLanguage) {
  const text = await getPageText(source);

  if (!text?.trim()) {
    throw new Error('No readable text found.');
  }

  const { summarizer, error } = await ensureSummarizer(type, length, format, outputLanguage);
  if (error) {
    throw new Error(error);
  }

  setStatus('Summarizing…');

  try {
    const stream = summarizer.summarizeStreaming(text, {
      context: 'Audience: general web reader.',
    });
    let acc = '';
    for await (const chunk of stream) {
      acc = chunk;
      renderOutput(acc);
    }
    setStatus('Done.');
    lastSummary = acc;
    lastSummaryLang = outputLanguage;
    setTranslateControlsVisible(true, outputLanguage);
  } finally {
    if (summarizer.destroy) {
      summarizer.destroy();
    }
  }
}

async function translateSummary() {
  if (!('Translator' in self)) {
    setStatus('Translator API not supported in this Chrome.');
    return;
  }

  const targetLang = elements.translateLanguage.value;
  if (!lastSummary || lastSummaryLang === targetLang) return;

  setStatus('Translating…');
  setLoadingState(elements.translateBtn, true);

  try {
    const translated = await Translator.translate(lastSummary, { from: lastSummaryLang, to: targetLang });
    renderOutput(translated);
    setStatus('Done.');
    lastSummaryLang = targetLang;
  } catch (e) {
    setStatus(e?.message || String(e));
  } finally {
    setLoadingState(elements.translateBtn, false);
  }
}

// Initialize on DOM load
document.addEventListener('DOMContentLoaded', () => {
  initElements();

  // Setup theme listener
  setupThemeListener((isDark) => {
    document.body.setAttribute('data-theme', isDark ? 'dark' : 'light');
  });

  // Attach event listeners
  elements.runBtn.addEventListener('click', run);
  elements.translateBtn.addEventListener('click', translateSummary);
});
