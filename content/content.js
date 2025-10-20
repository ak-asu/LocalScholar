// Content script: text extraction and shadow-DOM overlay

// Content extraction configuration (inlined to avoid ES module issues)
const CONFIG = {
  MAX_CHUNK_SIZE: 10000,
  MIN_CHUNK_SIZE: 500,
  CHUNK_OVERLAP: 200,
  NOISE_SELECTORS: [
    'script', 'style', 'noscript', 'iframe', 'embed',
    'nav', 'header', 'footer', 'aside',
    '.advertisement', '.ad', '.ads', '.social-share',
    '.comments', '.cookie-banner', '.modal', '.popup',
    '[role="banner"]', '[role="navigation"]', '[role="complementary"]'
  ],
  CONTENT_SELECTORS: [
    'article', 'main', '[role="main"]',
    '.main-content', '.content', '#content',
    '.post-content', '.entry-content', '.article-content'
  ]
};

function getSelectionText() {
  const sel = window.getSelection();
  return sel && String(sel).trim() ? String(sel) : '';
}

function getPageText() {
  return document.body ? document.body.innerText || '' : '';
}

function cleanupText(text) {
  if (!text) return '';
  return text
    .replace(/\r\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/ {2,}/g, ' ')
    .replace(/^ +| +$/gm, '')
    .replace(/\t+/g, ' ')
    .trim();
}

function extractMainContent(doc = document) {
  const metadata = {
    title: doc.title || '',
    url: doc.location?.href || '',
    extractedFrom: 'body',
    hasMainContent: false
  };

  let contentRoot = null;
  for (const selector of CONFIG.CONTENT_SELECTORS) {
    contentRoot = doc.querySelector(selector);
    if (contentRoot && contentRoot.innerText?.trim().length > 100) {
      metadata.extractedFrom = selector;
      metadata.hasMainContent = true;
      break;
    }
  }

  if (!contentRoot) {
    contentRoot = doc.body;
  }

  const clone = contentRoot.cloneNode(true);
  CONFIG.NOISE_SELECTORS.forEach(selector => {
    clone.querySelectorAll(selector).forEach(el => el.remove());
  });

  const text = cleanupText(clone.innerText || clone.textContent || '');
  metadata.characterCount = text.length;
  metadata.wordCount = text.split(/\s+/).filter(w => w.length > 0).length;

  return { text, metadata };
}

function extractSelection() {
  const selection = window.getSelection();
  const text = selection && String(selection).trim() ? String(selection).trim() : '';

  return {
    text: cleanupText(text),
    metadata: {
      title: document.title || '',
      url: document.location?.href || '',
      extractedFrom: 'selection',
      characterCount: text.length,
      wordCount: text.split(/\s+/).filter(w => w.length > 0).length,
      hasSelection: text.length > 0
    }
  };
}

function splitBySemanticBoundaries(text) {
  const sections = [];
  const lines = text.split('\n');
  let currentSection = { text: '', type: 'paragraph', heading: null };

  for (const line of lines) {
    const trimmed = line.trim();
    const looksLikeHeading = (
      (trimmed.length > 0 && trimmed.length < 80 && trimmed === trimmed.toUpperCase()) ||
      (trimmed.length > 0 && trimmed.length < 100 && trimmed.endsWith(':'))
    );

    if (looksLikeHeading && currentSection.text.trim().length > 0) {
      sections.push({ ...currentSection, text: currentSection.text.trim() });
      currentSection = { text: '', type: 'paragraph', heading: trimmed };
    } else {
      currentSection.text += line + '\n';
    }
  }

  if (currentSection.text.trim().length > 0) {
    sections.push({ ...currentSection, text: currentSection.text.trim() });
  }

  return sections;
}

function chunkContent(text) {
  if (text.length <= CONFIG.MAX_CHUNK_SIZE) {
    return [{ text, index: 0, metadata: { total: 1, size: text.length } }];
  }

  const sections = splitBySemanticBoundaries(text);
  const chunks = [];
  let currentChunk = { text: '', sections: [] };

  for (const section of sections) {
    const sectionText = (section.heading ? section.heading + '\n' : '') + section.text;

    if (currentChunk.text.length > 0 &&
        currentChunk.text.length + sectionText.length > CONFIG.MAX_CHUNK_SIZE) {
      chunks.push({
        text: currentChunk.text.trim(),
        index: chunks.length,
        metadata: { sections: currentChunk.sections, size: currentChunk.text.length }
      });

      const overlapText = currentChunk.text.slice(-CONFIG.CHUNK_OVERLAP);
      currentChunk = { text: overlapText + '\n', sections: [] };
    }

    currentChunk.text += sectionText + '\n\n';
    currentChunk.sections.push(section.heading || 'Untitled section');
  }

  if (currentChunk.text.trim().length >= CONFIG.MIN_CHUNK_SIZE) {
    chunks.push({
      text: currentChunk.text.trim(),
      index: chunks.length,
      metadata: { sections: currentChunk.sections, size: currentChunk.text.length }
    });
  }

  chunks.forEach(chunk => { chunk.metadata.total = chunks.length; });
  return chunks;
}

function getEnhancedText(source) {
  try {
    let extraction;

    if (source === 'selection') {
      extraction = extractSelection();
      if (!extraction.text || extraction.text.length < 10) {
        extraction = extractMainContent();
      }
    } else {
      extraction = extractMainContent();
    }

    const { text, metadata } = extraction;
    const needsChunking = text.length > CONFIG.MAX_CHUNK_SIZE;
    const chunks = needsChunking ? chunkContent(text) : [{
      text,
      index: 0,
      metadata: { total: 1, size: text.length }
    }];

    const warnings = [];
    if (!metadata.hasMainContent && metadata.extractedFrom === 'body') {
      warnings.push('Could not identify main content area. Results may include navigation or ads.');
    }

    const valid = text.length >= 50;
    const error = valid ? null : 'Content too short (minimum 50 characters)';

    return {
      text,
      chunks,
      metadata: { ...metadata, needsChunking, chunkCount: chunks.length },
      needsChunking,
      valid,
      warnings,
      error
    };
  } catch (error) {
    console.error('Content extraction error:', error);
    const text = source === 'selection' ? getSelectionText() : getPageText();
    return {
      text,
      metadata: { extractedFrom: source, fallback: true },
      chunks: [{ text, index: 0, metadata: { total: 1 } }],
      needsChunking: false,
      valid: text.length > 0,
      warnings: ['Using fallback extraction due to error: ' + error.message],
      error: error.message
    };
  }
}

// Shadow DOM overlay helpers
let overlayRoot = null;
let overlayShadow = null;
let currentOperation = null; // Track current AI operation for cancellation

function ensureShadowOverlay() {
  if (overlayRoot && document.body.contains(overlayRoot)) return overlayRoot;
  overlayRoot = document.createElement('div');
  overlayRoot.id = 'quizzer-overlay-root';
  overlayRoot.style.position = 'fixed';
  overlayRoot.style.top = '16px';
  overlayRoot.style.right = '16px';
  overlayRoot.style.zIndex = '2147483647';
  overlayRoot.style.isolation = 'isolate';
  overlayShadow = overlayRoot.attachShadow({ mode: 'open' });

  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = chrome.runtime.getURL('content/overlay.css');
  overlayShadow.appendChild(link);

  const container = document.createElement('div');
  container.className = 'qz-container';

  const card = document.createElement('div');
  card.className = 'qz-card';

  const header = document.createElement('div');
  header.className = 'qz-header';
  const title = document.createElement('h3');
  title.className = 'qz-title';
  title.textContent = 'Quizzer';
  const actions = document.createElement('div');
  actions.className = 'qz-actions';
  const close = document.createElement('button');
  close.type = 'button'; // Prevent form submission
  close.className = 'qz-close qz-btn secondary';
  close.setAttribute('aria-label', 'Close overlay');
  close.textContent = '×';
  close.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    e.stopImmediatePropagation(); // Stop all event propagation
    closeOverlay();
  }, { capture: true });
  actions.appendChild(close);
  header.append(title, actions);

  const body = document.createElement('div');
  body.id = 'qz-body';
  body.className = 'qz-body';
  body.tabIndex = 0;

  card.append(header, body);
  container.appendChild(card);
  overlayShadow.appendChild(container);

  document.documentElement.appendChild(overlayRoot);
  return overlayRoot;
}

function updateOverlayBody(html) {
  ensureShadowOverlay();
  const body = overlayShadow.getElementById('qz-body');
  if (body) body.innerHTML = html;
}

function showLoadingInOverlay(message) {
  updateOverlayBody(`
    <div class="qz-loading">
      <div class="qz-spinner"></div>
      <span>${message}</span>
    </div>
  `);
}

function closeOverlay() {
  console.log('[Quizzer] Closing overlay...');

  // Cancel any ongoing operation
  if (currentOperation) {
    console.log('[Quizzer] Cancelling operation:', currentOperation.type);

    // Mark as cancelled first (prevents race conditions)
    currentOperation.cancelled = true;

    // Destroy AI session if exists
    if (currentOperation.session && typeof currentOperation.session.destroy === 'function') {
      try {
        currentOperation.session.destroy();
        console.log('[Quizzer] AI session destroyed');
      } catch (e) {
        // Ignore abort errors - they're expected
        if (e.name !== 'AbortError' && !e.message?.includes('abort')) {
          console.warn('[Quizzer] Error destroying session:', e);
        }
      }
    }

    currentOperation = null;
  }

  // Remove overlay from DOM
  if (overlayRoot && overlayRoot.parentNode) {
    try {
      overlayRoot.parentNode.removeChild(overlayRoot);
      overlayRoot = null;
      overlayShadow = null;
      console.log('[Quizzer] Overlay removed from DOM');
    } catch (e) {
      console.warn('[Quizzer] Error removing overlay:', e);
    }
  }

  console.log('[Quizzer] Overlay closed and cleaned up');
}

async function handleContextAction(payload) {
  const { menuId, selectionText } = payload || {};
  ensureShadowOverlay();

  const actionName = menuId.replace('quizzer_', '').replace(/_/g, ' ');
  const source = selectionText ? 'selection' : 'page';

  console.log('[Quizzer] Context menu action:', {
    action: menuId,
    source: source,
    hasSelection: !!selectionText,
    selectionLength: selectionText?.length || 0
  });

  // Only handle summarize action for now
  if (menuId === 'quizzer_summarize') {
    // Initialize operation tracking
    currentOperation = {
      type: 'summarize',
      cancelled: false,
      session: null
    };

    showLoadingInOverlay(`Summarizing ${source}...`);

    try {
      // Get the content
      const extraction = getEnhancedText(source);

      // Check if cancelled
      if (currentOperation?.cancelled) {
        console.log('[Quizzer] Operation cancelled by user');
        return;
      }

      console.log('[Quizzer] Extracted content:', {
        textLength: extraction.text?.length || 0,
        source: extraction.metadata.extractedFrom
      });

      if (!extraction.valid || !extraction.text) {
        updateOverlayBody(`<span style="color: #d93025;">Error: ${extraction.error || 'No content to summarize'}</span>`);
        currentOperation = null;
        return;
      }

      // Check if Summarizer API is available
      if (!('Summarizer' in self)) {
        updateOverlayBody(`<span style="color: #d93025;">Summarizer API not available in this Chrome version.</span>`);
        currentOperation = null;
        return;
      }

      // Check if cancelled
      if (currentOperation?.cancelled) {
        console.log('[Quizzer] Operation cancelled by user');
        return;
      }

      showLoadingInOverlay('Creating summarizer...');
      const availability = await self.Summarizer.availability();
      if (availability === 'unavailable') {
        updateOverlayBody(`<span style="color: #d93025;">Summarizer unavailable on this device.</span>`);
        currentOperation = null;
        return;
      }

      // Check if cancelled before creating session
      if (currentOperation?.cancelled) {
        console.log('[Quizzer] Operation cancelled by user');
        return;
      }

      const summarizer = await self.Summarizer.create({
        type: 'key-points',
        length: 'medium',
        format: 'markdown',
        outputLanguage: 'en'
      });

      // Store session for potential cleanup
      currentOperation.session = summarizer;

      // Check if cancelled after creating session
      if (currentOperation?.cancelled) {
        console.log('[Quizzer] Operation cancelled by user');
        if (summarizer.destroy) summarizer.destroy();
        return;
      }

      showLoadingInOverlay('Generating summary...');

      // Summarize
      const summary = await summarizer.summarize(extraction.text, {
        context: 'Audience: general web reader.'
      });

      // Check if cancelled after summarization
      if (currentOperation?.cancelled) {
        console.log('[Quizzer] Operation cancelled by user');
        if (summarizer.destroy) summarizer.destroy();
        return;
      }

      // Log results
      console.log('[Quizzer] Summary generated:', summary);

      // Display summary in overlay
      updateOverlayBody(`<div style="white-space: pre-wrap; max-height: 300px; overflow: auto;">${summary}</div>`);

      // Cleanup
      if (summarizer.destroy) {
        summarizer.destroy();
      }

      // Clear operation tracking
      currentOperation = null;
    } catch (error) {
      // Check if error is due to cancellation
      if (currentOperation?.cancelled) {
        console.log('[Quizzer] Operation cancelled by user');
        return;
      }

      // Check if error is an abort error (happens when AI session is destroyed)
      if (error.name === 'AbortError' || error.message?.includes('abort')) {
        console.log('[Quizzer] Operation aborted');
        currentOperation = null;
        return;
      }

      console.error('[Quizzer] Summarization error:', error);
      updateOverlayBody(`<span style="color: #d93025;">Error: ${error.message}</span>`);
      currentOperation = null;
    }
  } else if (menuId === 'quizzer_add_to_queue') {
    // Add to queue action - delegate to popup
    showLoadingInOverlay('Adding to report queue...');
    try {
      // Send message to background to open popup with add-to-queue action
      updateOverlayBody(`<span style="color: #1a73e8;">Added to queue! Open the extension to view.</span>`);

      // Auto-dismiss after 2 seconds
      setTimeout(() => {
        const overlay = overlayShadow?.host;
        if (overlay && overlay.style.display !== 'none') {
          overlay.style.display = 'none';
        }
      }, 2000);
    } catch (error) {
      console.error('[Quizzer] Add to queue error:', error);
      updateOverlayBody(`<span style="color: #d93025;">Error: ${error.message}</span>`);
    }
  } else if (menuId === 'quizzer_flashcards') {
    updateOverlayBody(`<span>Flashcard generation - Open the extension popup to generate flashcards!</span>`);
    setTimeout(() => {
      const overlay = overlayShadow?.host;
      if (overlay && overlay.style.display !== 'none') {
        overlay.style.display = 'none';
      }
    }, 2000);
  } else if (menuId === 'quizzer_write_report') {
    updateOverlayBody(`<span>Report generation - Open the extension popup to generate a report from your queue!</span>`);
    setTimeout(() => {
      const overlay = overlayShadow?.host;
      if (overlay && overlay.style.display !== 'none') {
        overlay.style.display = 'none';
      }
    }, 2000);
  } else {
    updateOverlayBody(`<span>${actionName} - Feature coming soon!</span>`);
  }
}

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg?.type === 'QUIZZER_CHECK_SELECTION') {
    // Check if there's an active selection
    const selection = window.getSelection();
    const hasSelection = selection && selection.toString().trim().length > 0;
    sendResponse({ hasSelection });
    return true;
  }

  if (msg?.type === 'QUIZZER_GET_TEXT') {
    const { source, enhanced = true } = msg;

    if (enhanced) {
      // Use enhanced extraction with cleanup and metadata
      const extraction = getEnhancedText(source);
      sendResponse(extraction);
    } else {
      // Fallback to simple extraction
      const text = source === 'selection' ? (getSelectionText() || getPageText()) : getPageText();
      sendResponse({ text });
    }
    return true;
  }

  if (msg?.type === 'QUIZZER_GET_TEXT_SIMPLE') {
    // Simple extraction for backward compatibility
    const { source } = msg;
    const text = source === 'selection' ? (getSelectionText() || getPageText()) : getPageText();
    sendResponse({ text });
    return true;
  }

  if (msg?.type === 'QUIZZER_CONTEXT_ACTION') {
    handleContextAction(msg.payload);
  }
  if (msg?.type === 'QUIZZER_SHOW_DECK') {
    try {
      showDeckOverlay(msg.deck);
      sendResponse({ ok: true });
    } catch (e) {
      console.error('Failed to show deck:', e);
      sendResponse({ ok: false, error: e.message });
    }
    return true;
  }
});

// Flashcards overlay
function showDeckOverlay(deck) {
  if (!deck || !Array.isArray(deck.cards) || deck.cards.length === 0) {
    updateOverlayBody('<em>No flashcards to display.</em>');
    return;
  }
  ensureShadowOverlay();
  const body = overlayShadow.getElementById('qz-body');
  if (!body) return;

  let index = 0;

  function render() {
    const card = deck.cards[index];
    const options = card.options.map((opt, i) => {
      return `
        <label class="qz-option">
          <input class="qz-radio" type="radio" name="qz-opt" value="${i}" ${i===0?'checked':''} />
          <span>${opt}</span>
        </label>`;
    }).join('');

    body.innerHTML = `
      <div class="qz-flashcard" role="group" aria-label="Flashcard ${index+1} of ${deck.cards.length}">
        <div class="qz-question"><strong>Q${index+1}.</strong> ${card.question}</div>
        <div class="qz-options">${options}</div>
        <div class="qz-footer">
          <div class="qz-index">${index+1} / ${deck.cards.length}</div>
          <div class="qz-actions">
            <button class="qz-btn secondary" id="qz-prev" ${index===0?'disabled':''}>Prev</button>
            <button class="qz-btn" id="qz-reveal">Reveal</button>
            <button class="qz-btn secondary" id="qz-next" ${index===deck.cards.length-1?'disabled':''}>Next</button>
          </div>
        </div>
        <div id="qz-explanation" style="display:none; margin-top:8px;">💡 ${card.explanation || ''}</div>
      </div>`;

    overlayShadow.getElementById('qz-reveal').onclick = () => {
      const exp = overlayShadow.getElementById('qz-explanation');
      exp.style.display = exp.style.display === 'none' ? 'block' : 'none';
    };
    const prev = overlayShadow.getElementById('qz-prev');
    const next = overlayShadow.getElementById('qz-next');
    if (prev) prev.onclick = () => { if (index>0) { index--; render(); } };
    if (next) next.onclick = () => { if (index<deck.cards.length-1) { index++; render(); } };

    // Keyboard a11y: left/right to navigate, space to reveal
    body.onkeydown = (e) => {
      if (e.key === 'ArrowLeft') { if (index>0) { index--; render(); e.preventDefault(); } }
      if (e.key === 'ArrowRight') { if (index<deck.cards.length-1) { index++; render(); e.preventDefault(); } }
      if (e.key === ' ') { const exp = overlayShadow.getElementById('qz-explanation'); exp.style.display = exp.style.display === 'none' ? 'block' : 'none'; e.preventDefault(); }
      if (e.key === 'Escape') { closeOverlay(); }
    };
  }

  render();
  body.focus();
}
