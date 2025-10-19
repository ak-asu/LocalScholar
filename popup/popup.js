// Popup logic: Summarizer integration with availability gating and streaming
import { setupThemeListener, setLoadingState, setTextContent } from '../utils/ui-helpers.js';
import { saveDeck, listDecks, deleteDeck, createDeckId, validateFlashcards } from '../data/storage.js';

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

// Flashcards state
let lastDeck = null;

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

  // Flashcards
  elements.fcCount = document.getElementById('fc-count');
  elements.fcDifficulty = document.getElementById('fc-difficulty');
  elements.fcLanguage = document.getElementById('fc-language');
  elements.fcGenerate = document.getElementById('fc-generate');
  elements.fcResults = document.getElementById('fc-results');
  elements.fcSave = document.getElementById('fc-save');
  elements.fcShow = document.getElementById('fc-show');
  elements.deckList = document.getElementById('deck-list');
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
  console.log('[Quizzer] Status:', msg);
}

function renderOutput(markdownOrText) {
  console.log('[Quizzer] renderOutput called with:', markdownOrText);
  console.log('[Quizzer] Output element:', elements.output);

  if (!elements.output) {
    console.error('[Quizzer] Output element not found!');
    return;
  }

  setTextContent(elements.output, markdownOrText);
  console.log('[Quizzer] Output element textContent after update:', elements.output.textContent);
  console.log('[Quizzer] Summary Output:', markdownOrText);
}

async function ensureSummarizer(type, length, format, outputLanguage) {
  if (!('Summarizer' in self)) return { error: 'Summarizer API not supported in this Chrome.' };
  const availability = await Summarizer.availability();
  if (availability === 'unavailable') return { error: 'Summarizer unavailable on this device.' };

  // Ensure outputLanguage has a valid value (default to 'en')
  const lang = outputLanguage || 'en';

  // Require user activation (button click triggers this function)
  try {
    const summarizer = await Summarizer.create({
      type,
      length,
      format,
      outputLanguage: lang,
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

  console.log('[Quizzer] Starting summarization with:', { source, type, length, format, outputLanguage });

  try {
    // Use enhanced content extraction
    await runEnhancedPipeline(source, type, length, format, outputLanguage);
    console.log('[Quizzer] Summarization complete');
  } catch (error) {
    console.error('[Quizzer] Pipeline error:', error);
    console.error('[Quizzer] Error stack:', error.stack);
    setStatus(`Error: ${error.message}`);
    renderOutput(`Error: ${error.message}\n\n${error.stack || ''}`);
  } finally {
    setLoadingState(elements.runBtn, false);
  }
}

// Flashcards helpers (top-level)
// Deck list rendering
async function refreshDeckList() {
  if (!elements.deckList) return;
  const decks = await listDecks();
  elements.deckList.innerHTML = '';
  if (!decks || decks.length === 0) {
    const li = document.createElement('li');
    li.className = 'deck-item';
    li.textContent = 'No saved decks yet.';
    elements.deckList.appendChild(li);
    return;
  }
  for (const deck of decks) {
    const li = document.createElement('li');
    li.className = 'deck-item';
    const meta = document.createElement('div');
    meta.className = 'deck-meta';
    const title = document.createElement('div');
    title.textContent = deck.title || `Deck ${deck.id}`;
    const sub = document.createElement('div');
    sub.style.fontSize = '12px';
    sub.style.color = 'var(--text-secondary)';
    sub.textContent = `${deck.language || 'en'} • ${deck.cards?.length || 0} cards`;
    meta.append(title, sub);
    const actions = document.createElement('div');
    actions.className = 'deck-actions';
    const openBtn = document.createElement('button');
    openBtn.textContent = 'Open';
    openBtn.addEventListener('click', async () => {
      try {
        await sendMessageToTab({ type: 'QUIZZER_SHOW_DECK', deck });
        window.close();
      } catch (e) {
        setStatus('Cannot show overlay here');
      }
    });
    const delBtn = document.createElement('button');
    delBtn.textContent = 'Delete';
    delBtn.addEventListener('click', async () => {
      await deleteDeck(deck.id);
      await refreshDeckList();
    });
    actions.append(openBtn, delBtn);
    li.append(meta, actions);
    elements.deckList.appendChild(li);
  }
}

async function generateFlashcards() {
  setStatus('Preparing…');
  setLoadingState(elements.fcGenerate, true);
  elements.fcSave.disabled = true;
  elements.fcShow.disabled = true;
  lastDeck = null;

  const source = elements.source?.value || 'page';
  const count = parseInt(elements.fcCount.value, 10) || 5;
  const difficulty = elements.fcDifficulty.value || 'medium';
  const outputLanguage = elements.fcLanguage.value || 'en';

  try {
    setStatus('Extracting content...');
    const extraction = await getEnhancedContent(source);
    const { chunks, metadata } = extraction;

    if (!extraction.valid) {
      throw new Error(extraction.error || 'Invalid content');
    }

    // Availability for Prompt API
    if (!('LanguageModel' in self)) {
      throw new Error('Prompt API not supported in this Chrome');
    }

    const availability = await LanguageModel.availability();
    if (availability === 'unavailable') {
      throw new Error('Language Model unavailable on this device');
    }

    // Generate per chunk and combine up to count
    const perChunk = Math.max(1, Math.ceil(count / chunks.length));
    const all = [];
    for (let i = 0; i < chunks.length; i++) {
      setStatus(`Generating cards ${i + 1}/${chunks.length}...`);
  const part = await generateFlashcardsFromChunk(chunks[i].text, { count: perChunk, difficulty, outputLanguage });
      all.push(...part);
      if (all.length >= count) break;
    }

    const flashcards = all.slice(0, count);
    const { valid, reason, cards } = validateFlashcards(flashcards);
    if (!valid) {
      setStatus('Validation issues.');
      console.warn('Flashcard validation:', reason);
    }

    // Build deck object in memory
    const deck = {
      id: createDeckId(),
      title: (metadata?.title || 'Deck') + ' – ' + new Date().toLocaleTimeString(),
      language: outputLanguage,
      sourceUrl: metadata?.url || '',
      sourceTitle: metadata?.title || '',
      cards: cards || flashcards
    };
    lastDeck = deck;
    setStatus(`Generated ${deck.cards.length} cards. Saving…`);
    await saveDeck(deck);
    await refreshDeckList();
    setStatus('Opening overlay…');
    try {
      await sendMessageToTab({ type: 'QUIZZER_SHOW_DECK', deck: lastDeck });
      window.close();
      return;
    } catch (e) {
      setStatus('Cannot show overlay here');
    }
  } catch (e) {
    console.error('Flashcard generation failed:', e);
    setStatus('Error');
  } finally {
    setLoadingState(elements.fcGenerate, false);
  }
}

async function generateFlashcardsFromChunk(text, { count = 5, difficulty = 'medium', outputLanguage = 'en' }) {
  // Ensure supported language codes only
  const supported = new Set(['en','es','ja']);
  const outLang = supported.has((outputLanguage || 'en').toLowerCase()) ? (outputLanguage || 'en').toLowerCase() : 'en';
  // Create session with structured output
  const session = await LanguageModel.create({
    temperature: 0.7,
    topK: 40,
    outputLanguage: outLang,
    systemPrompt: 'You are a skilled educator. Generate high-quality multiple-choice questions (MCQ) from the provided text.',
    responseConstraint: {
      type: 'json-schema',
      schema: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            question: { type: 'string' },
            options: { type: 'array', items: { type: 'string' }, minItems: 4, maxItems: 4 },
            answer: { type: 'integer', minimum: 0, maximum: 3 },
            explanation: { type: 'string' }
          },
          required: ['question', 'options', 'answer']
        }
      }
    }
  });

  try {
    const difficultyGuide = {
      easy: 'Focus on basic recall and comprehension. Use straightforward questions with clearly distinct answer choices.',
      medium: 'Test understanding and application. Use plausible distractors that require careful consideration.',
      hard: 'Challenge with analysis and evaluation. Use subtle distractors that test deep understanding.'
    };

    const prompt = `Generate ${count} multiple-choice questions from the following text.

Difficulty level: ${difficulty}
${difficultyGuide[difficulty]}

Requirements:
- Each question should test understanding of key concepts
- All four options should be plausible; avoid obvious distractors
- Provide a brief explanation for the correct answer
- Ensure questions are clear and unambiguous

Text:
${text}`;

    const result = await session.prompt(prompt);
    let flashcards = [];
    // Primary parse
    const tryParse = (s) => {
      const m = s.match(/\[[\s\S]*\]/);
      return JSON.parse(m ? m[0] : s);
    };
    try {
      flashcards = tryParse(result);
    } catch (e1) {
      // One retry instructing strict JSON compliance
      const retryPrompt = `Output strictly a JSON array only, following the schema. No prose. Same request as above.`;
      const retried = await session.prompt(retryPrompt);
      try {
        flashcards = tryParse(retried);
      } catch (e2) {
        throw new Error('Failed to generate valid flashcards');
      }
    }
    return flashcards;
  } finally {
    if (session.destroy) session.destroy();
  }
}

async function saveLastDeck() {
  if (!lastDeck) return;
  try {
    const saved = await saveDeck(lastDeck);
    setStatus('Deck saved');
    elements.fcSave.disabled = true;
  } catch (e) {
    console.error('Save deck failed:', e);
    setStatus('Save failed');
  }
}

async function showDeckInPage() {
  if (!lastDeck) return;
  try {
    await sendMessageToTab({ type: 'QUIZZER_SHOW_DECK', deck: lastDeck });
    setStatus('Overlay opened');
  } catch (e) {
    console.warn('Could not show overlay:', e);
    setStatus('Cannot show overlay here');
  }
}

async function runEnhancedPipeline(source, type, length, format, outputLanguage) {
  // Get enhanced content extraction from content script
  setStatus('Extracting content...');
  const extraction = await getEnhancedContent(source);

  const { chunks, metadata, needsChunking } = extraction;

  // Log source content
  console.log('[Quizzer] Source Content:', {
    source,
    metadata,
    textLength: extraction.text?.length || 0,
    chunkCount: chunks.length,
    fullText: extraction.text
  });

  // Single chunk - process directly
  if (!needsChunking || chunks.length === 1) {
    setStatus('Summarizing...');
    console.log('[Quizzer] Starting single chunk summarization...', {
      chunkText: chunks[0].text,
      type, length, format, outputLanguage
    });
    const summary = await summarizeChunk(chunks[0].text, type, length, format, outputLanguage);
    console.log('[Quizzer] Summary result:', summary);
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
  console.log('[Quizzer] summarizeChunk called with text length:', text?.length);

  const { summarizer, error } = await ensureSummarizer(type, length, format, outputLanguage);
  if (error) {
    console.error('[Quizzer] Summarizer creation error:', error);
    throw new Error(error);
  }

  console.log('[Quizzer] Summarizer created successfully');

  try {
    console.log('[Quizzer] Starting summarization...');
    // Use direct summarize (not streaming) for popup - faster and simpler
    const result = await summarizer.summarize(text, {
      context: 'Audience: general web reader.'
    });
    console.log('[Quizzer] Summarization complete. Result length:', result?.length);
    console.log('[Quizzer] Result:', result);
    return result;
  } catch (streamError) {
    console.error('[Quizzer] Streaming error:', streamError);
    throw streamError;
  } finally {
    if (summarizer.destroy) {
      console.log('[Quizzer] Destroying summarizer');
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
    const result = await summarizer.summarize(text, {
      context: 'Audience: general web reader.',
    });
    renderOutput(result);
    setStatus('Done.');
    lastSummary = result;
    lastSummaryLang = outputLanguage;
    setTranslateControlsVisible(true, outputLanguage);
  } finally {
    if (summarizer.destroy) {
      summarizer.destroy();
    }
  }
}

async function translateSummary() {
  console.log('[Quizzer] Translation API check:', {
    hasTranslation: 'translation' in self,
    hasCreateTranslator: 'translation' in self && 'createTranslator' in self.translation,
    translationObject: typeof self.translation
  });

  if (!('translation' in self) || !('createTranslator' in self.translation)) {
    const errorMsg = 'Translator API not supported. Please enable chrome://flags/#translation-api and restart Chrome.';
    setStatus(errorMsg);
    console.error('[Quizzer]', errorMsg);
    return;
  }

  const targetLang = elements.translateLanguage.value;
  if (!lastSummary || lastSummaryLang === targetLang) {
    console.log('[Quizzer] Skipping translation - no summary or same language');
    return;
  }

  console.log('[Quizzer] Starting translation:', { from: lastSummaryLang, to: targetLang });
  setStatus('Translating…');
  setLoadingState(elements.translateBtn, true);

  let translator = null;

  try {
    // Check availability
    console.log('[Quizzer] Checking translation availability...');
    const availability = await self.translation.canTranslate({
      sourceLanguage: lastSummaryLang,
      targetLanguage: targetLang
    });
    console.log('[Quizzer] Translation availability:', availability);

    if (availability === 'no') {
      throw new Error(`Translation from ${lastSummaryLang} to ${targetLang} is not supported.`);
    }

    // Create translator instance
    console.log('[Quizzer] Creating translator...');
    translator = await self.translation.createTranslator({
      sourceLanguage: lastSummaryLang,
      targetLanguage: targetLang
    });
    console.log('[Quizzer] Translator created successfully');

    // Download model if needed
    if (availability === 'after-download') {
      setStatus('Downloading translation model...');
      console.log('[Quizzer] Waiting for model download...');
      await translator.ready;
      console.log('[Quizzer] Model ready');
    }

    // Perform translation
    console.log('[Quizzer] Translating text...');
    const translated = await translator.translate(lastSummary);
    console.log('[Quizzer] Translation complete');
    renderOutput(translated);
    setStatus('Done.');
    lastSummaryLang = targetLang;
  } catch (e) {
    const errorMsg = `Translation error: ${e?.message || String(e)}`;
    setStatus(errorMsg);
    console.error('[Quizzer]', errorMsg, e);
  } finally {
    // Clean up translator instance
    if (translator && translator.destroy) {
      console.log('[Quizzer] Destroying translator');
      translator.destroy();
    }
    setLoadingState(elements.translateBtn, false);
  }
}

// Initialize on DOM load
document.addEventListener('DOMContentLoaded', async () => {
  initElements();

  // Setup theme listener
  setupThemeListener((isDark) => {
    document.body.setAttribute('data-theme', isDark ? 'dark' : 'light');
  });

  // Check if there's a selection when popup opens and update UI accordingly
  try {
    const tabId = await getActiveTabId();
    if (tabId) {
      const result = await chrome.tabs.sendMessage(tabId, { type: 'QUIZZER_CHECK_SELECTION' });
      if (result?.hasSelection) {
        // Auto-select "Selection" option if text is selected
        elements.source.value = 'selection';
        console.log('[Quizzer] Selection detected on page open, auto-selected "Selection" source');
      }
    }
  } catch (error) {
    // Silently fail - content script might not be loaded yet
    console.log('[Quizzer] Could not check for selection:', error.message);
  }

  // Attach event listeners
  elements.runBtn.addEventListener('click', run);
  elements.translateBtn.addEventListener('click', translateSummary);
  elements.fcGenerate.addEventListener('click', generateFlashcards);
  elements.fcSave.addEventListener('click', saveLastDeck);
  elements.fcShow.addEventListener('click', showDeckInPage);

  // Load deck list
  await refreshDeckList();
});
