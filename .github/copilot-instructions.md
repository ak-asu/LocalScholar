# Copilot Instructions for LocalScholar Chrome Extension

## Project Overview
- **LocalScholar** is a Chrome Manifest V3 extension for summarizing web pages or selections, generating MCQ/flashcards, and synthesizing reports from multiple sources. All data is stored locally; no cloud inference is used.
- Major components: service worker (background), popup UI, options page, content script (with overlay), and optional offscreen document for long tasks.

## Architecture & Data Flow
- **Service worker**: Only for context menu creation and message routing. Never runs AI APIs.
- **Popup**: Main UI for summaries, flashcards, and reports. Runs AI APIs with user activation and streams results.
- **Content script**: Extracts text, injects overlay (shadow DOM), and can run AI APIs for in-page actions.
- **Data storage**: Uses `chrome.storage.local` for settings/indexes and IndexedDB for large text blobs. Prune items with LRU policy; all data is local and privacy-first.

## AI API Integration
- Use Chrome built-in Summarizer and Prompt APIs (stable in Chrome 138+). Writer/Rewriter/Proofreader require origin trials and are optional.
- **Never** call AI APIs from the service worker. Only use document contexts (popup, options, content script, offscreen doc).
- Always check `availability()` before running AI. If model is `downloadable`/`downloading`, show progress and require user click to start `create()`.
- For long content, chunk by paragraph/heading, summarize chunks, then merge.
- Flashcards: Use Prompt API with JSON Schema for structured output. Validate and reprompt on parse errors.

## Developer Workflows
- **Build**: Use simple build tools (esbuild/tsup) or no-build for early JS phases. Keep dependencies minimal.
- **Testing**: Unit tests for chunking, schema validation, and storage. Manual exploratory for streaming/overlay.
- **Run locally**: Load unpacked extension in `chrome://extensions`. Popup shows API/model status.

## Project Conventions
- TypeScript for logic; ES modules; no inline scripts/styles (MV3 CSP compliant).
- Small, focused modules. Clear separation: UI, AI, data, utils.
- Overlay UI uses shadow DOM, is keyboard accessible, and does not break page styles.
- Context menus are selection-aware: actions operate on selection if present, else on full page.
- All AI actions require user activation (click/gesture).

## Key Files & Directories
- `manifest.json`: Extension manifest and permissions
- `background/service-worker.ts`: Context menu and routing logic
- `popup/`, `options/`, `content/`: UI and content script logic
- `ai/`: Summarizer, Prompt, and (optionally) Writer modules
- `data/`: Storage, IndexedDB, and models
- `utils/`: DOM helpers, chunking, error handling

## Integration & Edge Cases
- If content script injection fails (e.g., restricted page), degrade gracefully to popup-only actions.
- For very long pages, use chunking and summary-of-summaries.
- If AI APIs are unavailable, show requirements and disable actions.
- All data remains local; user can export/import or clear data from settings.

## References
- See `docs/` for requirements, architecture, data model, AI strategy, and UX flows.
- For AI API details, see `docs/10-ai-apis-research.md` and Chrome official docs.
