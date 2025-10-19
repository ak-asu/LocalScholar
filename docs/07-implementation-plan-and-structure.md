# Implementation Plan and Structure

Last updated: 2025-10-18


## Phases

### 1. Skeleton & Summaries ✅ COMPLETE
   - ✅ manifest.json (MV3)
   - ✅ service worker (context menus)
   - ✅ popup (Analyze UI)
   - ✅ content script (text extraction)
   - ✅ Summarizer API integration with streaming
   - ✅ Availability gating and user activation
   - ✅ Output language selector (en, es, ja, fr, de)
   - ✅ Translation support (Translator API)
   - ✅ **Content extraction pipeline** (`utils/content-extractor.js`)
   - ✅ **Multi-chunk processing with summary-of-summaries**
   - ✅ **Error handling and graceful fallbacks**

### 2. Flashcards & Overlay ⏳ IN PROGRESS
   - ✅ Prompt API module ready (`utils/ai-pipeline.js`)
   - ✅ Structured output schema for MCQ
   - ✅ Popup UI for flashcard generation
   - ✅ Overlay UI with keyboard a11y
   - ✅ Local storage for decks
   - ✅ Output language selector integration

### 3. Report Queue & Writer 📋 PLANNED
   - Collection model
   - Queue UI
   - Prompt API synthesis
   - Report export/history
   - Output language selector

### 4. Options & Optional APIs 📋 PLANNED
   - Options page
   - Feature toggles
   - Origin trial tokens for Writer/Rewriter/Proofreader
   - Optional API integrations

### 5. QA & Polish 📋 PLANNED
   - ✅ Basic error handling complete
   - ✅ Chunking implemented
   - ⏳ Caching per URL+hash
   - ⏳ Data export/import
   - ⏳ A11y audit
   - ⏳ Performance optimization


## Current file structure

### Implemented Files ✅
```
manifest.json                       # MV3 extension config
background/service-worker.js        # Context menus, message routing
popup/
  ├── popup.html                    # Main UI
  ├── popup.js                      # Summarization logic (ES module)
  └── popup.css                     # Popup styles
content/
  └── content.js                    # Text extraction (inlined pipeline)
utils/
  ├── content-extractor.js          # Reference implementation (not imported)
  └── ai-pipeline.js                # AI processing coordination (for popup)
```

**Note**: Content extraction is inlined in `content/content.js` due to Chrome extension limitations with ES module imports in content scripts. The `utils/content-extractor.js` serves as reference documentation.

### Planned Files 📋
```
options/
  ├── options.html                  # Settings UI
  ├── options.js                    # Settings logic
  └── options.css                   # Settings styles
content/
  └── overlay.css                   # Flashcard overlay styles
data/
  ├── storage.js                    # chrome.storage wrapper
  ├── db.js                         # IndexedDB wrapper
  └── models.js                     # Data models
assets/
  └── icons/                        # Extension icons
```

## Coding conventions
- JavaScript ES modules (no build step currently)
- No inline scripts/styles; MV3 CSP compliant
- Small, focused modules; clear separation of UI, AI, data
- Extensive JSDoc comments for documentation
- Graceful error handling with fallbacks

## Testing
- Unit tests for chunking, schema validation, storage; light UI tests
- Manual exploratory for streaming and overlay interactions

## Build & tooling
- Simple build (esbuild/tsup) or no-build for early phases if we keep to JS
- Keep dependencies minimal
