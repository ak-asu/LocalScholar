# Requirements and Scope

Last updated: 2025-10-18

## Summary
A Chrome MV3 extension that analyzes web pages or selected text, provides summaries in the popup, generates MCQ/flash cards and displays them as an overlay, and aggregates content across multiple pages to synthesize a report in the user’s style. All data is stored locally. Context menu integrates all actions and is selection-aware.

## In-scope
- Analyze selection vs. whole page (rendered text only)
- Summaries via Summarizer API (tldr, key-points, headline/teaser; short/medium/long)
- MCQ/flash cards generation and overlay UI
- Multi-page collection queue and report synthesis in user style
- Context menus for all actions; selection-aware
- Popup UI and Options page for settings
- Local-only storage and privacy-first design
- Availability gating, model download progress, graceful fallbacks

## Out-of-scope (initial)
- Cloud inference or external APIs
- Account login/sync
- Complex spaced-repetition algorithms (basic stats only)
- Full side panel app (may add later)


## Detailed requirements
- Selection-aware: if user selects text, all actions operate on selection; else on page text
- Popup actions: Analyze (summaries), Flashcards (generate/play), Report (queue and compose), History (optional), Settings link
- Overlay: Draggable, closable, keyboard navigable; shows flashcards without breaking page styles
- Context menu: Summarize, Create Flashcards, Add to Report Queue, Write Report
- Settings: user profile, tone, language (output language selector, top 5, default en, switchable with Translator API), custom instructions; defaults for summary/flashcards/report; data export/import; clear data
- Local storage: settings, collected items, summaries, flashcards, reports; IndexedDB for large text blobs
- AI usage: built-in APIs; no workers; user activation required; inform about download
- Output language: All AI outputs (summaries, flashcards, reports) must specify a supported output language code ([en, es, ja, ...]); user can switch output language and view translations using the Translator API.
- Content extraction pipeline: Before summarization or other AI calls, extract and clean up page content (remove unneeded tags, scripts, nav, ads, etc.), then chunk content as needed; process in phases/chunks and merge results for large pages.

## Acceptance criteria
- Actions use selection when present; otherwise page
- Summaries render within 2–5s for typical articles with streaming updates; respects type/length/format
- Flashcards returned as structured JSON; playable overlay with at least 10 cards by default; correctness recorded locally
- Report synthesizes from 2–10 collected items; includes citations/links; respects tone and style
- Context menus visible on pages; operate correctly with selection/full-page
- All data remains local; no network calls for inference

## Edge cases
- Very long pages: chunking and summary-of-summaries
- Restricted pages or blocked content scripts: degrade gracefully; allow popup-only
- No model or unsupported device: show requirements and disable actions
- Offline before model download: inform; after download: works offline

## Non-functional
- Privacy: no external calls for AI; explicit messaging about model download size/requirements
- Performance: stream responses; cache per URL+hash; avoid heavy DOM operations
- Accessibility: keyboard and screen-reader friendly popup/overlay

## Dependencies and constraints
- Chrome 138+; Windows 10/11, macOS 13+, Linux, or Chromebook Plus per API docs
- Summarizer/Prompt available in stable; Writer/Rewriter/Proofreader in origin trials; Translator/Language Detector stable
- Built-in AI not available in workers; requires top-level or same-origin iframes
