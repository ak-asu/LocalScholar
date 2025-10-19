/**
 * Content Extraction and Cleanup Module
 *
 * Provides robust content extraction, cleanup, and chunking for AI processing.
 * Handles large/complex web pages by extracting main content, removing noise,
 * and splitting into manageable chunks.
 */

/**
 * Configuration for content extraction
 */
const CONFIG = {
  // Maximum characters per chunk for AI processing
  MAX_CHUNK_SIZE: 10000,
  // Minimum chunk size to avoid tiny fragments
  MIN_CHUNK_SIZE: 500,
  // Overlap between chunks to maintain context
  CHUNK_OVERLAP: 200,
  // Selectors for elements to remove (noise)
  NOISE_SELECTORS: [
    'script', 'style', 'noscript', 'iframe', 'embed',
    'nav', 'header', 'footer', 'aside',
    '.advertisement', '.ad', '.ads', '.social-share',
    '.comments', '.cookie-banner', '.modal', '.popup',
    '[role="banner"]', '[role="navigation"]', '[role="complementary"]'
  ],
  // Selectors for main content (in priority order)
  CONTENT_SELECTORS: [
    'article',
    'main',
    '[role="main"]',
    '.main-content',
    '.content',
    '#content',
    '.post-content',
    '.entry-content',
    '.article-content'
  ]
};

/**
 * Extracts and cleans main content from the document
 * @param {Document} doc - The document object (defaults to current document)
 * @returns {Object} - { text: string, metadata: object }
 */
export function extractMainContent(doc = document) {
  const metadata = {
    title: doc.title || '',
    url: doc.location?.href || '',
    extractedFrom: 'body',
    hasMainContent: false
  };

  // Try to find main content area
  let contentRoot = null;
  for (const selector of CONFIG.CONTENT_SELECTORS) {
    contentRoot = doc.querySelector(selector);
    if (contentRoot && contentRoot.innerText?.trim().length > 100) {
      metadata.extractedFrom = selector;
      metadata.hasMainContent = true;
      break;
    }
  }

  // Fallback to body if no main content found
  if (!contentRoot) {
    contentRoot = doc.body;
  }

  // Clone the content to avoid modifying the DOM
  const clone = contentRoot.cloneNode(true);

  // Remove noise elements
  CONFIG.NOISE_SELECTORS.forEach(selector => {
    clone.querySelectorAll(selector).forEach(el => el.remove());
  });

  // Extract text
  const text = cleanupText(clone.innerText || clone.textContent || '');

  metadata.characterCount = text.length;
  metadata.wordCount = text.split(/\s+/).filter(w => w.length > 0).length;

  return { text, metadata };
}

/**
 * Cleans up extracted text by normalizing whitespace and removing artifacts
 * @param {string} text - Raw text to clean
 * @returns {string} - Cleaned text
 */
export function cleanupText(text) {
  if (!text) return '';

  return text
    // Normalize line breaks
    .replace(/\r\n/g, '\n')
    // Remove excessive blank lines (more than 2)
    .replace(/\n{3,}/g, '\n\n')
    // Remove multiple spaces
    .replace(/ {2,}/g, ' ')
    // Remove spaces at line starts/ends
    .replace(/^ +| +$/gm, '')
    // Remove tabs
    .replace(/\t+/g, ' ')
    // Trim overall
    .trim();
}

/**
 * Extracts content from a user selection
 * @returns {Object} - { text: string, metadata: object }
 */
export function extractSelection() {
  const selection = window.getSelection();
  const text = selection && String(selection).trim() ? String(selection).trim() : '';

  const metadata = {
    title: document.title || '',
    url: document.location?.href || '',
    extractedFrom: 'selection',
    characterCount: text.length,
    wordCount: text.split(/\s+/).filter(w => w.length > 0).length,
    hasSelection: text.length > 0
  };

  return { text: cleanupText(text), metadata };
}

/**
 * Splits content by semantic boundaries (headings and paragraphs)
 * @param {string} text - Text to split
 * @returns {Array} - Array of { text: string, type: string, heading?: string }
 */
export function splitBySemanticBoundaries(text) {
  const sections = [];
  const lines = text.split('\n');

  let currentSection = { text: '', type: 'paragraph', heading: null };

  for (const line of lines) {
    const trimmed = line.trim();

    // Detect heading-like lines (short lines in all caps, or lines ending with :)
    const looksLikeHeading = (
      (trimmed.length > 0 && trimmed.length < 80 && trimmed === trimmed.toUpperCase()) ||
      (trimmed.length > 0 && trimmed.length < 100 && trimmed.endsWith(':'))
    );

    if (looksLikeHeading && currentSection.text.trim().length > 0) {
      // Save current section and start new one
      sections.push({ ...currentSection, text: currentSection.text.trim() });
      currentSection = { text: '', type: 'paragraph', heading: trimmed };
    } else {
      currentSection.text += line + '\n';
    }
  }

  // Add final section
  if (currentSection.text.trim().length > 0) {
    sections.push({ ...currentSection, text: currentSection.text.trim() });
  }

  return sections;
}

/**
 * Chunks text into smaller pieces for AI processing
 * @param {string} text - Text to chunk
 * @param {Object} options - Chunking options
 * @returns {Array} - Array of { text: string, index: number, metadata: object }
 */
export function chunkContent(text, options = {}) {
  const maxSize = options.maxSize || CONFIG.MAX_CHUNK_SIZE;
  const minSize = options.minSize || CONFIG.MIN_CHUNK_SIZE;
  const overlap = options.overlap || CONFIG.CHUNK_OVERLAP;

  if (text.length <= maxSize) {
    return [{ text, index: 0, metadata: { total: 1, size: text.length } }];
  }

  // First, try to split by semantic boundaries
  const sections = splitBySemanticBoundaries(text);
  const chunks = [];
  let currentChunk = { text: '', sections: [] };

  for (const section of sections) {
    const sectionText = (section.heading ? section.heading + '\n' : '') + section.text;

    // If adding this section would exceed max size, save current chunk
    if (currentChunk.text.length > 0 &&
        currentChunk.text.length + sectionText.length > maxSize) {
      chunks.push({
        text: currentChunk.text.trim(),
        index: chunks.length,
        metadata: {
          sections: currentChunk.sections,
          size: currentChunk.text.length
        }
      });

      // Start new chunk with overlap from previous chunk
      const overlapText = currentChunk.text.slice(-overlap);
      currentChunk = { text: overlapText + '\n', sections: [] };
    }

    currentChunk.text += sectionText + '\n\n';
    currentChunk.sections.push(section.heading || 'Untitled section');
  }

  // Add final chunk
  if (currentChunk.text.trim().length >= minSize) {
    chunks.push({
      text: currentChunk.text.trim(),
      index: chunks.length,
      metadata: {
        sections: currentChunk.sections,
        size: currentChunk.text.length
      }
    });
  }

  // Add total count to all chunks
  chunks.forEach(chunk => {
    chunk.metadata.total = chunks.length;
  });

  return chunks;
}

/**
 * Main extraction pipeline - decides whether to use selection or full page
 * @param {string} source - 'selection' or 'page'
 * @param {Object} options - Extraction options
 * @returns {Object} - { text: string, chunks: array, metadata: object, needsChunking: boolean }
 */
export function extractContent(source = 'page', options = {}) {
  let extraction;

  if (source === 'selection') {
    extraction = extractSelection();
    // If no selection, fall back to page
    if (!extraction.text || extraction.text.length < 10) {
      extraction = extractMainContent();
    }
  } else {
    extraction = extractMainContent();
  }

  const { text, metadata } = extraction;

  // Determine if chunking is needed
  const needsChunking = text.length > (options.maxChunkSize || CONFIG.MAX_CHUNK_SIZE);

  let chunks = [];
  if (needsChunking) {
    chunks = chunkContent(text, options);
  } else {
    chunks = [{
      text,
      index: 0,
      metadata: { total: 1, size: text.length }
    }];
  }

  return {
    text,
    chunks,
    metadata: {
      ...metadata,
      needsChunking,
      chunkCount: chunks.length
    },
    needsChunking
  };
}

/**
 * Estimates token count (rough approximation: 1 token ≈ 4 characters)
 * @param {string} text - Text to estimate
 * @returns {number} - Approximate token count
 */
export function estimateTokens(text) {
  return Math.ceil(text.length / 4);
}

/**
 * Validates if content is suitable for AI processing
 * @param {Object} extraction - Extraction result from extractContent
 * @returns {Object} - { valid: boolean, reason?: string, warnings: array }
 */
export function validateContent(extraction) {
  const warnings = [];
  const { text, metadata } = extraction;

  // Check minimum length
  if (text.length < 50) {
    return {
      valid: false,
      reason: 'Content too short (minimum 50 characters)',
      warnings
    };
  }

  // Check if mostly gibberish
  const wordCount = metadata.wordCount || 0;
  const avgWordLength = text.length / Math.max(wordCount, 1);
  if (avgWordLength > 20) {
    warnings.push('Content may contain unusual formatting or non-text characters');
  }

  // Check token estimate
  const tokens = estimateTokens(text);
  if (tokens > 50000) {
    warnings.push(`Very large content (~${tokens} tokens). Consider using a more specific selection.`);
  }

  // Check if extraction found main content
  if (!metadata.hasMainContent && metadata.extractedFrom === 'body') {
    warnings.push('Could not identify main content area. Results may include navigation or ads.');
  }

  return { valid: true, warnings };
}

// Export configuration for customization
export { CONFIG };
