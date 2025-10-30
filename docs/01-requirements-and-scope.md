# Requirements and Scope

Last updated: 2025-01-29

## Summary
A Chrome MV3 extension that analyzes web pages or selected text, provides summaries in the popup, generates MCQ/flash cards and displays them as an overlay, and aggregates content across multiple pages to synthesize a report in the user's style. All data is stored locally. Context menu integrates all actions and is selection-aware. Extended with Translation, Proofreader, and Rewriter APIs for enhanced text processing.

## In-scope
- Analyze selection vs. whole page (rendered text only)
- Summaries via Summarizer API (tldr, key-points, headline/teaser; short/medium/long)
- MCQ/flash cards generation and overlay UI
- Multi-page collection queue and report synthesis in user style with custom instructions
- Context menus for all actions; selection-aware (6 items: Summarize, Flashcards, Add to Queue, Translate, Proofread, Rewrite)
- Translation API integration for selected text with configurable target language
- Proofreader API integration for grammar/spelling checking with detailed corrections
- Rewriter API integration with configurable tone, length, and format
- Popup UI with unified settings (no separate options page)
- Local-only storage and privacy-first design
- Availability gating, model download progress, graceful fallbacks

## Out-of-scope (initial)
- Cloud inference or external APIs
- Account login/sync
- Complex spaced-repetition algorithms (basic stats only)
- Full side panel app (may add later)


## Detailed requirements
- Selection-aware: if user selects text, all actions operate on selection; else on page text
- Popup actions: Analyze (summaries), Flashcards (generate/play), Report (queue and compose with custom instructions), History (optional), Settings link
- Overlay: Draggable, closable, keyboard navigable; shows flashcards, translation, proofreading, and rewriting results without breaking page styles; uses Shadow DOM for isolation
- Context menu: Summarize, Create Flashcards, Add to Report Queue, Translate Selection, Proofread Selection, Rewrite Selection
- Settings: user profile, tone, language (output language selector, top 10 languages, default en), custom instructions for reports; translation target language; rewriter tone/length/format; defaults for summary/flashcards/report; data export/import; clear data
- Local storage: settings, collected items, summaries, flashcards, reports; chrome.storage.local for all data
- AI usage: built-in APIs (Summarizer, Prompt/LanguageModel, Translator, Proofreader, Rewriter); no workers; user activation required; inform about download
- Output language: All AI outputs (summaries, flashcards, reports) must specify a supported output language code ([en, es, ja, ...]); user can switch output language and view translations using the Translator API.
- Content extraction pipeline: Before summarization or other AI calls, extract and clean up page content (remove unneeded tags, scripts, nav, ads, etc.), then chunk content as needed; process in phases/chunks and merge results for large pages.
- Translation: Works on selected text only; displays original and translated text in overlay; no history saved; configurable target language (10 languages supported)
- Proofreading: Works on selected text only; displays original, corrected text, and detailed corrections list; no history saved; uses Proofreader API (requires Chrome 141+ and origin trial)
- Rewriting: Works on selected text only; displays original and rewritten text; configurable tone (more-formal/as-is/more-casual), length (shorter/as-is/longer), format (as-is/markdown/plain-text); no history saved; uses Rewriter API (requires Chrome 137+ and origin trial)

## Acceptance criteria
- Actions use selection when present; otherwise page
- Summaries render within 2–5s for typical articles with streaming updates; respects type/length/format
- Flashcards returned as structured JSON; playable overlay with at least 10 cards by default; correctness recorded locally
- Report synthesizes from 2–10 collected items; includes citations/links; respects custom instructions and output language
- Context menus visible on pages (6 items total); operate correctly with selection/full-page
- Translation completes within 1-3s; displays both original and translated text in overlay
- Proofreading identifies grammar/spelling errors; displays corrected text and detailed corrections list
- Rewriting respects configured tone/length/format; displays original and rewritten text side-by-side
- All data remains local; no network calls for inference
- Translation, Proofreading, and Rewriting do not create history entries (overlay display only)

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
- Chrome 128+ for Summarizer/Prompt; Chrome 137+ for Rewriter; Chrome 141+ for Proofreader; Translator stable
- Windows 10/11, macOS 13+, Linux, or Chromebook Plus per API docs
- Summarizer/Prompt/Translator available in stable; Writer/Rewriter/Proofreader in origin trials (require enrollment)
- Built-in AI not available in workers; requires top-level or same-origin iframes
- Correct API namespaces: `LanguageModel`, `Translator`, `Summarizer`, `Rewriter`, `Proofreader` (all global objects)
- Availability states:
  - LanguageModel & Translator: Return `'available'`
  - Summarizer/Rewriter/Proofreader: Return `'readily'`, `'after-download'`, or `'no'`
