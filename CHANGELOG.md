# Changelog

## [Phase 1] - 2025-10-18

### Added
- **Content Extraction Pipeline** (inlined in `content/content.js`)
  - Semantic main content detection using `<article>`, `<main>`, `[role="main"]`, etc.
  - Automatic noise removal (nav, ads, scripts, headers, footers, social widgets)
  - Text cleanup and normalization (whitespace, line breaks, excessive blanks)
  - Semantic chunking by headings and paragraphs
  - Content validation with warnings for edge cases
  - **Implementation Note**: Logic inlined in content script to avoid ES module import issues
  - Reference implementation maintained in `utils/content-extractor.js` for documentation

- **AI Processing Pipeline** (`utils/ai-pipeline.js`)
  - Multi-chunk processing for large documents (>10,000 chars)
  - Summary-of-summaries strategy for cohesive results
  - Flashcard generation module with JSON Schema validation
  - Progress tracking with callback support
  - Configurable chunking parameters (size, overlap, strategy)
  - **Note**: Used in popup context only (not content script)

- **Enhanced Content Script** (`content/content.js`)
  - Inlined content extraction pipeline (full implementation)
  - Support for both simple and enhanced text extraction
  - Backward compatibility with legacy extraction
  - Rich metadata in extraction responses
  - No external dependencies or imports required

- **Improved Popup Logic** (`popup/popup.js`)
  - Multi-chunk summarization with progress display
  - Summary combination strategies (concatenate vs hierarchical)
  - Enhanced error handling with user-friendly messages
  - Real-time chunk processing feedback
  - Fallback to legacy pipeline if needed

- **Error Handling**
  - Fixed: "Could not establish connection. Receiving end does not exist"
  - Graceful handling of inaccessible pages (chrome://, etc.)
  - Try-catch blocks around all API calls
  - User-friendly error messages

- **Documentation Updates**
  - Updated `02-architecture.md` with pipeline implementation details
  - Updated `06-ai-prompts-and-strategy.md` with extraction/chunking specs
  - Updated `07-implementation-plan-and-structure.md` with current status
  - Updated `docs/README.md` with project status and highlights
  - Created `TESTING.md` with comprehensive testing guide

### Changed
- `manifest.json`: Added ES module support for content script
- `manifest.json`: Added web_accessible_resources for utils/*.js
- Popup now uses enhanced content extraction by default
- Content script now returns rich extraction metadata

### Fixed
- Connection error when trying to access chrome:// pages
- Improved error messages for content script failures
- Better handling of edge cases (no content, minimal text, etc.)

### Technical Details
**Chunking Configuration**:
- Max chunk size: 10,000 characters
- Min chunk size: 500 characters
- Chunk overlap: 200 characters
- Semantic boundaries: headings, paragraphs

**Processing Performance**:
- Single chunk: ~2-5 seconds
- Multi-chunk (3-5 chunks): ~10-20 seconds
- Token estimation: ~1 token per 4 characters

**Error Recovery**:
- Enhanced extraction → simple extraction fallback
- No main content → use full body with warning
- Content script unavailable → friendly error message

### Known Limitations
- No caching yet (planned for future)
- Large pages (>500,000 chars) may hit memory limits
- Dynamic content loaded after page idle may be missed
- Cannot extract from cross-origin iframes

### Next Steps
- Phase 2: Flashcard UI implementation
- Add caching layer for extracted content
- Implement data persistence (IndexedDB)
- Create options page for user preferences
- Add progress bar UI component
