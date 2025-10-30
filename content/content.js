/**
 * LocalScholar Content Script
 *
 * Handles:
 * - Context menu actions (summarize, flashcards, add to queue)
 * - Task management with progress overlays
 * - Flashcard deck display
 * - Content extraction using utilities
 */

import { extractContent, validateContent } from '../utils/content-extractor.js';
import { processSummarization, processFlashcardGeneration } from '../utils/ai-pipeline.js';
import { createTask, getTask } from './task-manager.js';
import { showProgressOverlay, getOverlay, showResultsOverlay } from './unified-overlay.js';
import * as storage from '../data/storage.js';

/**
 * Handles context menu actions
 */
async function handleContextAction(payload) {
  const { menuId, selectionText } = payload || {};
  const source = selectionText ? 'selection' : 'page';

  console.log('[LocalScholar] Context menu action:', menuId, source);

  try {
    if (menuId === 'localscholar_summarize') {
      await handleSummarize(source);
    } else if (menuId === 'localscholar_flashcards') {
      await handleFlashcards(source);
    } else if (menuId === 'localscholar_add_to_queue') {
      await handleAddToQueue(source);
    } else if (menuId === 'localscholar_translate') {
      await handleTranslate();
    } else if (menuId === 'localscholar_proofread') {
      await handleProofread();
    } else if (menuId === 'localscholar_rewrite') {
      await handleRewrite();
    }
  } catch (error) {
    console.error('[LocalScholar] Action error:', error);
    showTemporaryMessage('Error: ' + error.message, true);
  }
}

/**
 * Handles summarization
 *
 * NOTE: Currently uses batch summarization. Streaming mode could be implemented
 * for real-time progressive results by using summarizeStreaming() and updating
 * the overlay incrementally. See ai-pipeline.js for streaming documentation.
 */
async function handleSummarize(source) {
  // Extract text content - use innerText for whole page
  let text;
  if (source === 'page') {
    text = document.body.innerText;
  } else {
    const selection = window.getSelection();
    text = selection.toString();
  }

  if (!text || text.trim().length === 0) {
    showTemporaryMessage('Error: No text content found', true);
    return;
  }

  // Check for duplicate task
  const task = createTask('summarize', text, {
    source,
    url: document.location.href,
    title: document.title
  });

  if (!task) {
    showTemporaryMessage('A summary is already being generated for this content.');
    return;
  }

  // Show progress overlay
  const overlay = showProgressOverlay(task.id);

  try {
    // Load settings
    const settings = await storage.getSettings({
      summaryType: 'key-points',
      summaryLength: 'medium',
      summaryFormat: 'markdown',
      outputLanguage: 'en'
    });

    // Check cache
    const cacheKey = storage.generateCacheKey(
      document.location.href,
      storage.hashContent(text),
      'summary'
    );

    const cached = await storage.getCachedItem(cacheKey);
    if (cached) {
      console.log('[LocalScholar] Using cached summary');
      await task.complete(cached.content);

      // Show cached result in overlay
      if (overlay) {
        overlay.showSummary(cached.content, 'Summary');
      }

      // Save to history
      await saveSummaryToHistory(cached.content, source);
      return;
    }

    // Start task
    await task.start(1);

    // Process summarization (batch mode)
    const result = await processSummarization({
      text,
      type: settings.summaryType,
      length: settings.summaryLength,
      format: settings.summaryFormat,
      outputLanguage: settings.outputLanguage,
      onProgress: (message, percent) => {
        task.updateProgress(percent, message);
      }
    });

    // Complete task
    await task.complete(result.summary);

    // Cache result
    await storage.setCachedItem(cacheKey, result.summary);

    // Save to history
    await saveSummaryToHistory(result.summary, source);

    // Show result in overlay
    if (overlay) {
      overlay.showSummary(result.summary, 'Summary');
    }

  } catch (error) {
    task.setError(error);
    throw error;
  }
}

/**
 * Handles flashcard generation
 */
async function handleFlashcards(source) {
  // Extract text content - use innerText for whole page
  let text;
  if (source === 'page') {
    text = document.body.innerText;
  } else {
    const selection = window.getSelection();
    text = selection.toString();
  }

  if (!text || text.trim().length === 0) {
    showTemporaryMessage('Error: No text content found', true);
    return;
  }

  // Check for cached summary to optimize
  const summaryCacheKey = storage.generateCacheKey(
    document.location.href,
    storage.hashContent(text),
    'summary'
  );

  const cachedSummary = await storage.getCachedItem(summaryCacheKey);
  let contentForFlashcards = text;

  // If we have a cached summary for the whole page, use it for efficiency
  if (cachedSummary && source === 'page') {
    console.log('[LocalScholar] Using cached summary for flashcard generation');
    contentForFlashcards = cachedSummary.content;
  }

  // Check for duplicate task
  const task = createTask('flashcards', contentForFlashcards, {
    source,
    url: document.location.href,
    title: document.title
  });

  if (!task) {
    showTemporaryMessage('Flashcards are already being generated for this content.');
    return;
  }

  // Show progress overlay
  showProgressOverlay(task.id);

  try {
    // Load settings
    const settings = await storage.getSettings({
      fcCount: 5,
      fcDifficulty: 'medium',
      fcLanguage: 'en'
    });

    // Check cache
    const cacheKey = storage.generateCacheKey(
      document.location.href,
      storage.hashContent(contentForFlashcards),
      'flashcards'
    );

    const cached = await storage.getCachedItem(cacheKey);
    if (cached) {
      console.log('[LocalScholar] Using cached flashcards');
      await task.complete(cached.content);

      // Save and show deck
      const deck = await saveDeckToHistory(cached.content, source);
      const overlay = getOverlay(task.id);
      if (overlay) {
        overlay.showFlashcards(deck);
      }
      return;
    }

    // Start task
    await task.start(1);

    // Process flashcard generation
    const result = await processFlashcardGeneration({
      text: contentForFlashcards,
      count: parseInt(settings.fcCount),
      difficulty: settings.fcDifficulty,
      outputLanguage: settings.fcLanguage,
      onProgress: (message, percent) => {
        task.updateProgress(percent, message);
      }
    });

    // Validate flashcards
    const validation = storage.validateFlashcards(result.flashcards);
    if (!validation.valid) {
      throw new Error('Generated flashcards are invalid: ' + validation.reason);
    }

    // Complete task
    await task.complete(validation.cards);

    // Cache result
    await storage.setCachedItem(cacheKey, validation.cards);

    // Save and show deck
    const deck = await saveDeckToHistory(validation.cards, source);
    const overlay = getOverlay(task.id);
    if (overlay) {
      overlay.showFlashcards(deck);
    }

  } catch (error) {
    task.setError(error);
    throw error;
  }
}

/**
 * Handles adding to report queue
 */
async function handleAddToQueue(source) {
  // Extract content
  const extraction = extractContent(source);
  const validation = validateContent(extraction);

  if (!validation.valid) {
    showTemporaryMessage('Error: ' + validation.reason, true);
    return;
  }

  try {
    // Check if we have a cached summary for optimization
    const summaryCacheKey = storage.generateCacheKey(
      document.location.href,
      storage.hashContent(extraction.text),
      'summary'
    );

    const cachedSummary = await storage.getCachedItem(summaryCacheKey);

    // Add to collection
    const item = await storage.addToCollection({
      url: document.location.href,
      title: document.title,
      sourceType: source,
      text: extraction.text,
      textExcerpt: extraction.text.substring(0, 200),
      summary: cachedSummary?.content || null // Store summary if available
    });

    if (item) {
      showTemporaryMessage('Added to report queue! Open the extension to generate a report.');
    } else {
      showTemporaryMessage('This content is already in the queue.');
    }
  } catch (error) {
    console.error('[LocalScholar] Add to queue error:', error);
    showTemporaryMessage('Error: ' + error.message, true);
  }
}

/**
 * Handles translation of selected text
 */
async function handleTranslate() {
  // Get selected text
  const selection = window.getSelection();
  const text = selection?.toString().trim();

  if (!text) {
    showTemporaryMessage('Please select text to translate.', true);
    return;
  }

  if (text.length > 5000) {
    showTemporaryMessage('Selected text is too long. Please select less than 5000 characters.', true);
    return;
  }

  // Load settings to get target language
  const settings = await storage.getSettings({
    translationTargetLang: 'es'
  });

  const targetLang = settings.translationTargetLang;

  // Show progress overlay
  const overlay = showResultsOverlay();
  overlay.showResults(
    '<div style="text-align: center; padding: 40px;"><div style="margin-bottom: 8px;">Translating...</div><div style="font-size: 12px; opacity: 0.7;">Using Chrome Translation API</div></div>',
    'Translation'
  );

  try {
    // Check Translator API availability
    if (!('Translator' in self)) {
      throw new Error('Translation API not available. Enable "Translation API" in chrome://flags and restart Chrome');
    }

    // Check if translation is available for this language pair
    const availability = await Translator.availability({
      sourceLanguage: 'en', // Auto-detect would be ideal but we'll use English as default
      targetLanguage: targetLang
    });

    console.log('[LocalScholar] Translation availability:', availability);

    // The API may return 'readily', 'after-download', or 'no'
    if (availability === 'no') {
      throw new Error(`Translation to ${targetLang} is not supported on this device`);
    }

    // If download is needed, show progress
    let downloadInProgress = false;
    if (availability === 'after-download') {
      downloadInProgress = true;
      overlay.showResults(
        '<div style="text-align: center; padding: 40px;"><div style="margin-bottom: 8px;">Downloading translation model...</div><div id="download-progress" style="font-size: 12px; opacity: 0.7;">0%</div></div>',
        'Translation'
      );
    }

    // Create translator with download monitor
    const translator = await Translator.create({
      sourceLanguage: 'en',
      targetLanguage: targetLang,
      monitor(m) {
        m.addEventListener('downloadprogress', (e) => {
          const percent = Math.round(e.loaded * 100);
          console.log(`[LocalScholar] Translation model download: ${percent}%`);
          
          if (downloadInProgress) {
            const progressEl = document.getElementById('download-progress');
            if (progressEl) {
              progressEl.textContent = `${percent}%`;
            }
          }
        });
      }
    });

    // Update UI when translation starts
    if (downloadInProgress) {
      overlay.showResults(
        '<div style="text-align: center; padding: 40px;"><div style="margin-bottom: 8px;">Translating...</div><div style="font-size: 12px; opacity: 0.7;">Using Chrome Translation API</div></div>',
        'Translation'
      );
    }

    // Translate
    const translatedText = await translator.translate(text);

    console.log('[LocalScholar] Translation complete');

    // Show result in overlay
    overlay.showResults(
      `<div>
        <div class="qz-section-divider">
          <div class="qz-section-label">ORIGINAL</div>
          <div class="qz-content-text">${escapeHtml(text)}</div>
        </div>
        <div>
          <div class="qz-section-label">TRANSLATED (${targetLang.toUpperCase()})</div>
          <div class="qz-content-text qz-highlight-text">${escapeHtml(translatedText)}</div>
        </div>
      </div>`,
      'Translation'
    );

  } catch (error) {
    console.error('[LocalScholar] Translation error:', error);
    overlay.showResults(
      `<div class="qz-error-text" style="text-align: center; padding: 20px;">${escapeHtml('Error: ' + error.message)}</div>`,
      'Translation Error'
    );
  }
}

/**
 * Handles proofreading of selected text
 */
async function handleProofread() {
  // Get selected text
  const selection = window.getSelection();
  const text = selection?.toString().trim();

  if (!text) {
    showTemporaryMessage('Please select text to proofread.', true);
    return;
  }

  if (text.length > 5000) {
    showTemporaryMessage('Selected text is too long. Please select less than 5000 characters.', true);
    return;
  }

  // Show progress overlay
  const overlay = showResultsOverlay();
  overlay.showResults(
    '<div style="text-align: center; padding: 40px;"><div style="margin-bottom: 8px;">Proofreading...</div><div style="font-size: 12px; opacity: 0.7;">Checking for errors</div></div>',
    'Proofreading'
  );

  try {
    // Check Proofreader API availability
    if (!('Proofreader' in self)) {
      throw new Error('Proofreader API not available. This requires Chrome 141+ and origin trial enrollment.');
    }

    const availability = await Proofreader.availability();
    console.log('[LocalScholar] Proofreader availability:', availability);

    if (availability === 'downloadable') {
      overlay.showResults(
        '<div style="text-align: center; padding: 40px;"><div style="margin-bottom: 8px;">Downloading proofreader model...</div><div style="font-size: 12px; opacity: 0.7;">This may take a moment</div></div>',
        'Proofreading'
      );
    }

    // Create proofreader
    const proofreader = await Proofreader.create({
      expectedInputLanguages: ['en']
    });

    // Proofread
    const result = await proofreader.proofread(text);

    console.log('[LocalScholar] Proofreading complete:', result);

    // Format corrections
    let correctionsHTML = '';
    if (result.corrections && result.corrections.length > 0) {
      correctionsHTML = '<div class="qz-section-divider-thin">';
      correctionsHTML += '<div class="qz-section-label" style="margin-bottom: 12px;">CORRECTIONS (' + result.corrections.length + ')</div>';

      result.corrections.forEach((correction, idx) => {
        const errorText = text.substring(correction.startIndex, correction.endIndex);
        correctionsHTML += `<div class="qz-correction-box">
          <div style="font-weight: 600; margin-bottom: 4px;">${idx + 1}. "${escapeHtml(errorText)}"</div>
          <div style="font-size: 12px; opacity: 0.8;">${escapeHtml(correction.explanation || correction.type || 'Error detected')}</div>
        </div>`;
      });

      correctionsHTML += '</div>';
    }

    // Show result in overlay
    overlay.showResults(
      `<div>
        <div style="margin-bottom: 16px;">
          <div class="qz-section-label">ORIGINAL TEXT</div>
          <div class="qz-original-bg">${escapeHtml(text)}</div>
        </div>
        <div>
          <div class="qz-section-label" style="color: ${result.corrections.length === 0 ? 'var(--success-color, #34a853)' : 'inherit'};">
            ${result.corrections.length === 0 ? '✓ NO ERRORS FOUND' : 'CORRECTED TEXT'}
          </div>
          <div class="qz-corrected-bg">${escapeHtml(result.correctedInput)}</div>
        </div>
        ${correctionsHTML}
      </div>`,
      'Proofreading Results'
    );

    // Cleanup
    if (proofreader.destroy) {
      proofreader.destroy();
    }

  } catch (error) {
    console.error('[LocalScholar] Proofreading error:', error);
    overlay.showResults(
      `<div class="qz-error-text" style="text-align: center; padding: 20px;">${escapeHtml('Error: ' + error.message)}</div>`,
      'Proofreading Error'
    );
  }
}

/**
 * Handles rewriting of selected text
 */
async function handleRewrite() {
  // Get selected text
  const selection = window.getSelection();
  const text = selection?.toString().trim();

  if (!text) {
    showTemporaryMessage('Please select text to rewrite.', true);
    return;
  }

  if (text.length > 5000) {
    showTemporaryMessage('Selected text is too long. Please select less than 5000 characters.', true);
    return;
  }

  // Load settings for rewriter options
  const settings = await storage.getSettings({
    rewriterTone: 'as-is',
    rewriterLength: 'as-is',
    rewriterFormat: 'as-is'
  });

  // Show progress overlay
  const overlay = showResultsOverlay();
  overlay.showResults(
    '<div style="text-align: center; padding: 40px;"><div style="margin-bottom: 8px;">Rewriting...</div><div style="font-size: 12px; opacity: 0.7;">Using Chrome Rewriter API</div></div>',
    'Rewriting'
  );

  try {
    // Check Rewriter API availability
    if (!('Rewriter' in self)) {
      throw new Error('Rewriter API not available. This requires Chrome 137+ and origin trial enrollment.');
    }

    const availability = await Rewriter.availability();
    console.log('[LocalScholar] Rewriter availability:', availability);

    if (availability === 'downloadable' || availability === 'after-download') {
      overlay.showResults(
        '<div style="text-align: center; padding: 40px;"><div style="margin-bottom: 8px;">Downloading rewriter model...</div><div style="font-size: 12px; opacity: 0.7;">This may take a moment</div></div>',
        'Rewriting'
      );
    }

    // Create rewriter
    const rewriter = await Rewriter.create({
      tone: settings.rewriterTone,
      length: settings.rewriterLength,
      format: settings.rewriterFormat,
      expectedInputLanguages: ['en', 'es'],
      outputLanguage: 'en'
    });

    // Rewrite
    const rewrittenText = await rewriter.rewrite(text);

    console.log('[LocalScholar] Rewriting complete');

    // Show result in overlay
    overlay.showResults(
      `<div>
        <div class="qz-section-divider">
          <div class="qz-section-label">ORIGINAL</div>
          <div class="qz-content-text">${escapeHtml(text)}</div>
        </div>
        <div>
          <div class="qz-section-label">REWRITTEN</div>
          <div class="qz-content-text qz-highlight-text">${escapeHtml(rewrittenText)}</div>
          <div style="margin-top: 12px; font-size: 11px; opacity: 0.7;">
            Tone: ${settings.rewriterTone} • Length: ${settings.rewriterLength} • Format: ${settings.rewriterFormat}
          </div>
        </div>
      </div>`,
      'Rewriting Results'
    );

    // Cleanup
    if (rewriter.destroy) {
      rewriter.destroy();
    }

  } catch (error) {
    console.error('[LocalScholar] Rewriting error:', error);
    overlay.showResults(
      `<div class="qz-error-text" style="text-align: center; padding: 20px;">${escapeHtml('Error: ' + error.message)}</div>`,
      'Rewriting Error'
    );
  }
}

/**
 * Shows temporary message (for actions that don't need progress)
 */
function showTemporaryMessage(message, isError = false) {
  const overlay = showResultsOverlay();
  const color = isError ? '#d93025' : '#34a853';
  overlay.showResults(
    `<div style="color: ${color}; text-align: center; padding: 20px;">${escapeHtml(message)}</div>`,
    isError ? 'Error' : 'Success'
  );

  setTimeout(() => {
    overlay.remove();
  }, 3000);
}

/**
 * Escapes HTML to prevent XSS
 */
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

/**
 * Saves summary to history
 */
async function saveSummaryToHistory(summary, source) {
  const summaries = await chrome.storage.local.get('localscholar.summaries');
  const list = summaries['localscholar.summaries'] || [];

  list.unshift({
    id: Date.now().toString(),
    title: document.title || 'Untitled',
    url: document.location.href,
    sourceType: source,
    text: summary,
    createdAt: new Date().toISOString()
  });

  // Keep last 100
  await chrome.storage.local.set({
    'localscholar.summaries': list.slice(0, 100)
  });
}

/**
 * Saves flashcard deck to history
 */
async function saveDeckToHistory(cards, source) {
  const deck = {
    id: storage.createDeckId(),
    title: document.title || 'Untitled Deck',
    sourceUrl: document.location.href,
    sourceTitle: document.title,
    sourceType: source,
    cards,
    createdAt: new Date().toISOString()
  };

  await storage.saveDeck(deck);
  return deck;
}

// Legacy showDeck function removed - now using unified overlay

// Auto-start functionality (runs silently in background)
async function checkAutoStart() {
  // Wait a bit for page to load
  await new Promise(resolve => setTimeout(resolve, 2000));

  try {
    const settings = await storage.getSettings({
      autoSummarize: false,
      autoFlashcards: false
    });

    // Auto-summarize if enabled
    if (settings.autoSummarize) {
      console.log('[LocalScholar] Auto-summarize enabled, starting...');
      // Run silently without showing progress overlay
      try {
        await handleSummarize('page');
      } catch (error) {
        console.error('[LocalScholar] Auto-summarize error:', error);
      }
    }

    // Auto-flashcards if enabled
    if (settings.autoFlashcards) {
      console.log('[LocalScholar] Auto-flashcards enabled, starting...');
      // Run silently without showing progress overlay
      try {
        await handleFlashcards('page');
      } catch (error) {
        console.error('[LocalScholar] Auto-flashcards error:', error);
      }
    }
  } catch (error) {
    console.error('[LocalScholar] Auto-start check error:', error);
  }
}

// Run auto-start on page load
if (document.readyState === 'complete') {
  checkAutoStart();
} else {
  window.addEventListener('load', checkAutoStart);
}

// Message listeners
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg?.type === 'LOCALSCHOLAR_CHECK_SELECTION') {
    const selection = window.getSelection();
    const hasSelection = selection && selection.toString().trim().length > 0;
    sendResponse({ hasSelection });
    return true;
  }

  if (msg?.type === 'LOCALSCHOLAR_GET_TEXT') {
    const { source, enhanced = true } = msg;
    if (enhanced) {
      const extraction = extractContent(source);
      sendResponse(extraction);
    } else {
      const sel = window.getSelection();
      const text = source === 'selection' && sel ? sel.toString().trim() : document.body.innerText;
      sendResponse({ text });
    }
    return true;
  }

  if (msg?.type === 'LOCALSCHOLAR_CONTEXT_ACTION') {
    handleContextAction(msg.payload);
  }

  if (msg?.type === 'LOCALSCHOLAR_SHOW_DECK') {
    try {
      const overlay = showResultsOverlay();
      overlay.showFlashcards(msg.deck);
      sendResponse({ ok: true });
    } catch (e) {
      console.error('Failed to show deck:', e);
      sendResponse({ ok: false, error: e.message });
    }
    return true;
  }

  if (msg?.type === 'LOCALSCHOLAR_SHOW_CONTENT') {
    try {
      const { item, contentType } = msg;
      const overlay = showResultsOverlay();

      if (contentType === 'summary') {
        overlay.showSummary(item.text || '', 'Summary');
      } else if (contentType === 'deck') {
        overlay.showFlashcards(item);
      } else if (contentType === 'report') {
        overlay.showSummary(item.content || '', 'Report');
      } else if (contentType === 'queue-item') {
        overlay.showSummary(item.fullText || item.textExcerpt || '', 'Queue Item');
      }

      sendResponse({ ok: true });
    } catch (e) {
      console.error('Failed to show content:', e);
      sendResponse({ ok: false, error: e.message });
    }
    return true;
  }
});

console.log('[LocalScholar] Content script loaded');
