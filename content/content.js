/**
 * Quizzer Content Script
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

  console.log('[Quizzer] Context menu action:', menuId, source);

  try {
    if (menuId === 'quizzer_summarize') {
      await handleSummarize(source);
    } else if (menuId === 'quizzer_flashcards') {
      await handleFlashcards(source);
    } else if (menuId === 'quizzer_add_to_queue') {
      await handleAddToQueue(source);
    } else if (menuId === 'quizzer_translate') {
      await handleTranslate();
    } else if (menuId === 'quizzer_proofread') {
      await handleProofread();
    } else if (menuId === 'quizzer_rewrite') {
      await handleRewrite();
    }
  } catch (error) {
    console.error('[Quizzer] Action error:', error);
    showTemporaryMessage('Error: ' + error.message, true);
  }
}

/**
 * Handles summarization
 */
async function handleSummarize(source) {
  // Extract content
  const extraction = extractContent(source);
  const validation = validateContent(extraction);

  if (!validation.valid) {
    showTemporaryMessage('Error: ' + validation.reason, true);
    return;
  }

  // Check for duplicate task
  const task = createTask('summarize', extraction.text, {
    source,
    url: document.location.href,
    title: document.title
  });

  if (!task) {
    showTemporaryMessage('A summary is already being generated for this content.');
    return;
  }

  // Show progress overlay
  showProgressOverlay(task.id);

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
      storage.hashContent(extraction.text),
      'summary'
    );

    const cached = await storage.getCachedItem(cacheKey);
    if (cached) {
      console.log('[Quizzer] Using cached summary');
      await task.complete(cached.content);

      // Save to history
      await saveSummaryToHistory(cached.content, source);
      return;
    }

    // Start task
    await task.start(extraction.chunks.length);

    // Process summarization
    const result = await processSummarization({
      source,
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

    // Show result in the same overlay that showed progress
    const overlay = getOverlay(task.id);
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
  // Extract content
  const extraction = extractContent(source);
  const validation = validateContent(extraction);

  if (!validation.valid) {
    showTemporaryMessage('Error: ' + validation.reason, true);
    return;
  }

  // Check for cached summary to optimize
  const summaryCacheKey = storage.generateCacheKey(
    document.location.href,
    storage.hashContent(extraction.text),
    'summary'
  );

  const cachedSummary = await storage.getCachedItem(summaryCacheKey);
  let contentForFlashcards = extraction.text;

  // If we have a cached summary for the whole page, use it for efficiency
  if (cachedSummary && source === 'page') {
    console.log('[Quizzer] Using cached summary for flashcard generation');
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
      console.log('[Quizzer] Using cached flashcards');
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
    const chunkCount = Math.ceil(contentForFlashcards.length / 6000);
    await task.start(chunkCount);

    // Process flashcard generation - use the extraction with potentially optimized content
    const optimizedExtraction = {
      ...extraction,
      text: contentForFlashcards,
      chunks: contentForFlashcards.length > 6000
        ? extraction.chunks
        : [{ text: contentForFlashcards, index: 0, metadata: { total: 1 } }]
    };

    const result = await processFlashcardGeneration({
      source,
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
    console.error('[Quizzer] Add to queue error:', error);
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

    console.log('[Quizzer] Translation availability:', availability);

    if (availability !== 'available') {
      throw new Error(`Translation to ${targetLang} is not available on this device`);
    }

    // Create translator
    const translator = await Translator.create({
      sourceLanguage: 'en',
      targetLanguage: targetLang
    });

    // Translate
    const translatedText = await translator.translate(text);

    console.log('[Quizzer] Translation complete');

    // Show result in overlay
    overlay.showResults(
      `<div>
        <div style="margin-bottom: 16px; padding-bottom: 16px; border-bottom: 1px solid rgba(128,128,128,0.2);">
          <div style="font-size: 11px; font-weight: 600; opacity: 0.6; margin-bottom: 8px;">ORIGINAL</div>
          <div style="line-height: 1.6;">${escapeHtml(text)}</div>
        </div>
        <div>
          <div style="font-size: 11px; font-weight: 600; opacity: 0.6; margin-bottom: 8px;">TRANSLATED (${targetLang.toUpperCase()})</div>
          <div style="line-height: 1.6; font-weight: 500;">${escapeHtml(translatedText)}</div>
        </div>
      </div>`,
      'Translation'
    );

  } catch (error) {
    console.error('[Quizzer] Translation error:', error);
    overlay.showResults(
      `<div style="color: #d93025; text-align: center; padding: 20px;">${escapeHtml('Error: ' + error.message)}</div>`,
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
    console.log('[Quizzer] Proofreader availability:', availability);

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

    console.log('[Quizzer] Proofreading complete:', result);

    // Format corrections
    let correctionsHTML = '';
    if (result.corrections && result.corrections.length > 0) {
      correctionsHTML = '<div style="margin-top: 16px; padding-top: 16px; border-top: 1px solid rgba(128,128,128,0.2);">';
      correctionsHTML += '<div style="font-size: 11px; font-weight: 600; opacity: 0.6; margin-bottom: 12px;">CORRECTIONS (' + result.corrections.length + ')</div>';

      result.corrections.forEach((correction, idx) => {
        const errorText = text.substring(correction.startIndex, correction.endIndex);
        correctionsHTML += `<div style="margin-bottom: 12px; padding: 12px; background: rgba(217,48,37,0.1); border-radius: 6px;">
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
          <div style="font-size: 11px; font-weight: 600; opacity: 0.6; margin-bottom: 8px;">ORIGINAL TEXT</div>
          <div style="line-height: 1.6; padding: 12px; background: rgba(128,128,128,0.05); border-radius: 6px;">${escapeHtml(text)}</div>
        </div>
        <div>
          <div style="font-size: 11px; font-weight: 600; opacity: 0.6; margin-bottom: 8px; color: ${result.corrections.length === 0 ? '#34a853' : '#1a73e8'};">
            ${result.corrections.length === 0 ? '✓ NO ERRORS FOUND' : 'CORRECTED TEXT'}
          </div>
          <div style="line-height: 1.6; font-weight: 500; padding: 12px; background: rgba(52,168,83,0.1); border-radius: 6px;">${escapeHtml(result.correctedInput)}</div>
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
    console.error('[Quizzer] Proofreading error:', error);
    overlay.showResults(
      `<div style="color: #d93025; text-align: center; padding: 20px;">${escapeHtml('Error: ' + error.message)}</div>`,
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
    console.log('[Quizzer] Rewriter availability:', availability);

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
      expectedInputLanguages: ['en']
    });

    // Rewrite
    const rewrittenText = await rewriter.rewrite(text);

    console.log('[Quizzer] Rewriting complete');

    // Show result in overlay
    overlay.showResults(
      `<div>
        <div style="margin-bottom: 16px; padding-bottom: 16px; border-bottom: 1px solid rgba(128,128,128,0.2);">
          <div style="font-size: 11px; font-weight: 600; opacity: 0.6; margin-bottom: 8px;">ORIGINAL</div>
          <div style="line-height: 1.6;">${escapeHtml(text)}</div>
        </div>
        <div>
          <div style="font-size: 11px; font-weight: 600; opacity: 0.6; margin-bottom: 8px;">REWRITTEN</div>
          <div style="line-height: 1.6; font-weight: 500;">${escapeHtml(rewrittenText)}</div>
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
    console.error('[Quizzer] Rewriting error:', error);
    overlay.showResults(
      `<div style="color: #d93025; text-align: center; padding: 20px;">${escapeHtml('Error: ' + error.message)}</div>`,
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
  const summaries = await chrome.storage.local.get('quizzer.summaries');
  const list = summaries['quizzer.summaries'] || [];

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
    'quizzer.summaries': list.slice(0, 100)
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
      console.log('[Quizzer] Auto-summarize enabled, starting...');
      // Run silently without showing progress overlay
      try {
        await handleSummarize('page');
      } catch (error) {
        console.error('[Quizzer] Auto-summarize error:', error);
      }
    }

    // Auto-flashcards if enabled
    if (settings.autoFlashcards) {
      console.log('[Quizzer] Auto-flashcards enabled, starting...');
      // Run silently without showing progress overlay
      try {
        await handleFlashcards('page');
      } catch (error) {
        console.error('[Quizzer] Auto-flashcards error:', error);
      }
    }
  } catch (error) {
    console.error('[Quizzer] Auto-start check error:', error);
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
  if (msg?.type === 'QUIZZER_CHECK_SELECTION') {
    const selection = window.getSelection();
    const hasSelection = selection && selection.toString().trim().length > 0;
    sendResponse({ hasSelection });
    return true;
  }

  if (msg?.type === 'QUIZZER_GET_TEXT') {
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

  if (msg?.type === 'QUIZZER_CONTEXT_ACTION') {
    handleContextAction(msg.payload);
  }

  if (msg?.type === 'QUIZZER_SHOW_DECK') {
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

  if (msg?.type === 'QUIZZER_SHOW_CONTENT') {
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

console.log('[Quizzer] Content script loaded');
