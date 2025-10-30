# Architecture

Last updated: 2025-01-29

## Overview
Manifest V3 extension, keeping AI execution in document contexts (popup, content script) and using the service worker for routing and menus only. Supports 6 context menu actions with 3 different processing patterns: history-saved (summaries, flashcards, reports) and overlay-only (translation, proofreading, rewriting).

## Components
- Service worker (background)
  - Creates 6 context menu items (Summarize, Flashcards, Add to Queue, Translate, Proofread, Rewrite)
  - Routes messages to active tab content script
  - No AI calls here
- Popup page
  - Main UI to run summaries, flashcards, and reports
  - Unified settings panel (no separate options page)
  - Custom instructions textarea for report generation
  - Runs AI APIs with user activation and streaming
  - Translation, Rewriter, and Proofreader settings
- Content script
  - Extracts text (selection/full-page) with smart cleanup
  - Handles 6 context menu actions
  - Injects unified overlay (shadow DOM) for all results
  - Runs AI APIs when launched from user action
  - Translation, Proofreading, and Rewriting processed in content script context
  - Results displayed in overlay without saving to history
- Task management system
  - Centralized task tracking with status and progress
  - Duplicate prevention via content hashing
  - Automatic cleanup of completed tasks
- Progress overlay system
  - Draggable, cancellable progress indicators
  - Time estimation with learning algorithm
  - Multiple concurrent tasks supported

## Data flow and messaging
- User clicks popup or context menu
- Service worker determines intent, messages content script (active tab)
- Content script extracts text; either:
  - Runs AI locally (if initiated in-page)
  - Or sends text to popup (via runtime messaging) to run AI
- Results stored locally (storage.local + IndexedDB)
- Overlay renders flashcards on page via content script

## AI placement
- Summarizer API: popup/content script (for summaries, multi-chunk processing)
- Prompt API (LanguageModel): popup/content script for MCQ/report generation
- Translator API: content script only (for selected text translation)
- Proofreader API: content script only (for selected text proofreading, requires origin trial)
- Rewriter API: content script only (for selected text rewriting, requires origin trial)
- Writer API: not currently used (reserved for future features)

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
- `manifest.json` - Extension configuration (MV3, ES module support)
- `background/service-worker.js` - 6 context menu items and message routing
- `popup/popup.html` - Main UI with unified settings, custom instructions textarea
- `popup/popup.js` - Popup logic, report generation, settings management
- `popup/popup.css` - Popup styles with modal dialogs
- `content/content.js` - Main content script with 6 action handlers
- `content/content-loader.js` - Module loader for content script
- `content/task-manager.js` - Task tracking and duplicate prevention
- `content/unified-overlay.js` - Unified overlay for all results (progress + display)
- `utils/content-extractor.js` - Content extraction, cleanup, chunking (reference)
- `utils/ai-pipeline.js` - AI processing coordination (summaries, flashcards, reports)
- `utils/timing-estimator.js` - Learning time estimation system
- `data/storage.js` - Storage management with caching

### Current Status
- ✅ Complete summarization with Summarizer API
- ✅ Enhanced content extraction with smart cleanup
- ✅ Multi-chunk processing with summary-of-summaries
- ✅ Flashcard generation and playable overlay (Prompt API)
- ✅ Report queue and synthesis with custom instructions
- ✅ Translation for selected text (Translator API, overlay-only)
- ✅ Proofreading for selected text (Proofreader API, overlay-only)
- ✅ Rewriting for selected text (Rewriter API, overlay-only)
- ✅ Unified settings in popup (no separate options page)
- ✅ Task management with duplicate prevention
- ✅ Progress overlays with time estimation
- ✅ Modal dialogs (no alerts)
- ✅ Data export/import functionality
- ✅ Chrome.storage.local for all persistence

## Alternatives considered
- Side panel instead of popup (defer for simplicity)
- Offscreen-only AI (user activation problems)

## Open questions
- Do we want a side panel for report editor in a later phase?
