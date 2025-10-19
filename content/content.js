// Content script: text extraction and basic overlay placeholder

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

/**
 * Creates modern Chrome-themed overlay styles
 */
function getOverlayStyles() {
  const isDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;

  return {
    host: {
      position: 'fixed',
      top: '16px',
      right: '16px',
      zIndex: '2147483647',
      background: isDark ? '#202124' : '#ffffff',
      color: isDark ? '#e8eaed' : '#202124',
      border: `1px solid ${isDark ? '#5f6368' : '#dadce0'}`,
      borderRadius: '12px',
      boxShadow: isDark
        ? '0 4px 8px 3px rgba(0, 0, 0, 0.15)'
        : '0 2px 6px 2px rgba(60, 64, 67, 0.15)',
      padding: '16px',
      maxWidth: '380px',
      minWidth: '280px',
      font: "13px/1.5 'Segoe UI', system-ui, -apple-system, Roboto, Helvetica, Arial, sans-serif",
      transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)'
    },
    closeBtn: {
      position: 'absolute',
      top: '12px',
      right: '12px',
      border: 'none',
      background: 'transparent',
      fontSize: '20px',
      cursor: 'pointer',
      color: isDark ? '#9aa0a6' : '#5f6368',
      padding: '4px',
      borderRadius: '4px',
      transition: 'background 0.2s ease',
      lineHeight: '1',
      width: '28px',
      height: '28px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center'
    },
    title: {
      fontWeight: '500',
      fontSize: '16px',
      marginBottom: '12px',
      paddingRight: '32px',
      color: isDark ? '#e8eaed' : '#202124',
      letterSpacing: '-0.2px'
    },
    body: {
      fontSize: '13px',
      lineHeight: '1.6',
      color: isDark ? '#9aa0a6' : '#5f6368',
      background: isDark ? '#292a2d' : '#f8f9fa',
      padding: '12px',
      borderRadius: '8px',
      border: `1px solid ${isDark ? '#5f6368' : '#dadce0'}`
    }
  };
}

function mountOverlay() {
  if (document.getElementById('quizzer-overlay-root')) return;

  const styles = getOverlayStyles();

  const host = document.createElement('div');
  host.id = 'quizzer-overlay-root';
  Object.assign(host.style, styles.host);

  const close = document.createElement('button');
  close.textContent = '×';
  close.setAttribute('aria-label', 'Close overlay');
  close.setAttribute('type', 'button');
  Object.assign(close.style, styles.closeBtn);

  // Hover effect
  close.addEventListener('mouseenter', () => {
    close.style.background = styles.host.background === '#202124' ? '#35363a' : '#f1f3f4';
  });
  close.addEventListener('mouseleave', () => {
    close.style.background = 'transparent';
  });
  close.addEventListener('click', () => {
    host.style.opacity = '0';
    host.style.transform = 'translateY(-8px)';
    setTimeout(() => host.remove(), 200);
  });

  const title = document.createElement('div');
  title.textContent = 'Quizzer';
  Object.assign(title.style, styles.title);

  const body = document.createElement('div');
  body.id = 'quizzer-overlay-body';
  body.textContent = 'Overlay ready.';
  Object.assign(body.style, styles.body);

  host.append(close, title, body);

  // Fade in animation
  host.style.opacity = '0';
  host.style.transform = 'translateY(-8px)';
  document.documentElement.appendChild(host);

  requestAnimationFrame(() => {
    host.style.opacity = '1';
    host.style.transform = 'translateY(0)';
  });

  // Update styles when theme changes
  if (window.matchMedia) {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const updateTheme = () => {
      const newStyles = getOverlayStyles();
      Object.assign(host.style, newStyles.host);
      Object.assign(close.style, newStyles.closeBtn);
      Object.assign(title.style, newStyles.title);
      Object.assign(body.style, newStyles.body);
    };
    mediaQuery.addEventListener('change', updateTheme);
  }
}

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
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
    mountOverlay();
    const { menuId, selectionText } = msg.payload || {};
    const body = document.getElementById('quizzer-overlay-body');
    if (body) {
      body.textContent = `Action: ${menuId}. ${(selectionText ? 'Using selection.' : 'Using full page.')}`;
    }
  }
});
