# Architecture

Last updated: 2025-10-18

## Overview
Manifest V3 extension, keeping AI execution in document contexts (popup, options, content script, optional offscreen) and using the service worker for routing and menus only.

## Components
- Service worker (background)
  - Creates context menus
  - Routes messages to active tab content script or opens popup
  - No AI calls here
- Popup page
  - Main UI to run summaries, flashcards, and reports
  - Runs AI APIs with user activation and streaming
- Options page
  - Settings UI
  - May run small AI tasks (e.g., test style) but optional
- Content script
  - Extracts text (selection/full-page)
  - Injects overlay (shadow DOM) for flashcards
  - Can run AI APIs when launched from user action
- Offscreen document (optional)
  - Background DOM-capable page for long tasks if popup closed

## Data flow and messaging
- User clicks popup or context menu
- Service worker determines intent, messages content script (active tab)
- Content script extracts text; either:
  - Runs AI locally (if initiated in-page)
  - Or sends text to popup (via runtime messaging) to run AI
- Results stored locally (storage.local + IndexedDB)
- Overlay renders flashcards on page via content script

## AI placement
- Summarizer API: popup/content script
- Prompt API: popup/content script for MCQ/report
- Writer/Rewriter/Proofreader/Translator: optional, feature-detected, behind origin trial tokens where required

## Permissions Policy
- These APIs are not usable in workers; keep calls in document contexts
- Top-level extension pages can call directly


## Content extraction and AI pipeline

### Implementation Status: ✅ Complete

**Content Script**: `content/content.js` - Inlined extraction, cleanup, and chunking functions
**Module**: `utils/content-extractor.js` - Reference implementation (not imported due to ES module limitations)
**Module**: `utils/ai-pipeline.js` - Coordinates AI processing in popup context (flashcards, future report synthesis)

### Extraction Flow

1. **Selection or Page**:
   - Prefer selection text if available
   - Fall back to full page extraction

2. **Main Content Detection**:
   - Use semantic selectors (`<article>`, `<main>`, `[role="main"]`, etc.)
   - Remove noise elements (nav, ads, scripts, headers, footers, social widgets)
   - Extract clean `innerText` from main content area

3. **Text Cleanup**:
   - Normalize whitespace and line breaks
   - Remove excessive blank lines
   - Strip tabs and normalize spacing

4. **Validation**:
   - Check minimum length (50 chars)
   - Detect unusual formatting or gibberish
   - Warn about very large content (>50,000 tokens)

### Chunking Strategy

**When**: Content > 10,000 characters (configurable)

**How**:
- Split by semantic boundaries (headings, paragraphs)
- Detect heading patterns (all caps, ending with `:`)
- Chunk size: 500-10,000 characters
- Overlap: 200 characters between chunks for context
- Track section headings and metadata per chunk

**Metadata Included**:
- Source (article/main/body/selection)
- Character and word counts
- Chunk count and indices
- Section headings per chunk
- Warnings about content quality

### Processing Strategies

**Single-Chunk** (≤ 10,000 chars):
- Direct pass to Summarizer or Prompt API
- Uses requested length and format

**Multi-Chunk** (> 10,000 chars):
- Process each chunk with AI (using `short` length)
- Combine based on operation type:
  - **Summarization (key-points)**: Concatenate with section headings
  - **Summarization (tldr/teaser/headline)**: Summary-of-summaries
  - **Flashcards**: Generate per chunk, combine results

### Caching and Performance

**Caching** (planned for future):
- Cache per URL+textHash in chrome.storage.local
- Invalidate on content changes
- Re-use for multiple operations

**Performance**:
- Token estimation: ~1 token per 4 characters
- Processing time: ~2 seconds per chunk (summarization)
- Memory management: Destroy API instances after use

### Output Language

- All AI calls specify `outputLanguage` (default: `en`)
- User-selectable from top 5 languages (en, es, ja, fr, de)
- Switchable post-generation with Translator API

## Files layout (actual implementation)

### Core Files
- `manifest.json` - Extension configuration (MV3)
- `background/service-worker.js` - Context menus and message routing
- `popup/popup.html`, `popup.js`, `popup.css` - Main UI
- `content/content.js` - Text extraction and overlay
- `utils/content-extractor.js` - ✅ Content extraction, cleanup, chunking
- `utils/ai-pipeline.js` - ✅ AI processing coordination

### Current Status
- ✅ Basic summarization working (Summarizer API)
- ✅ Enhanced content extraction implemented
- ✅ Multi-chunk processing with summary-of-summaries
- ✅ Translation support (Translator API)
- ✅ Error handling and fallbacks
- ⏳ Flashcard generation (Prompt API) - module ready, UI pending
- ⏳ Report synthesis - planned
- ⏳ Options page - planned
- ⏳ Offscreen document - planned
- ⏳ Storage/IndexedDB - planned

## Alternatives considered
- Side panel instead of popup (defer for simplicity)
- Offscreen-only AI (user activation problems)

## Open questions
- Do we want a side panel for report editor in a later phase?
