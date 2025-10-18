# Implementation Plan and Structure

Last updated: 2025-10-18

## Phases
1. Skeleton & Summaries
   - manifest.json, service worker (menus), popup (Analyze), content script (extract), Summarizer API integration, availability gating, streaming UI
2. Flashcards & Overlay
   - Prompt API structured output for MCQ; overlay UI with keyboard a11y; local storage for decks
3. Report Queue & Writer
   - Collection model; queue UI; Prompt API synthesis; report export/history
4. Options & Optional APIs
   - Options page; feature toggles; origin trial tokens; Translator/Proofreader passes (optional)
5. QA & Polish
   - Error handling; caching/chunking; data export/import; a11y & performance polish

## Minimal file layout
- manifest.json
- background/service-worker.ts
- popup/{popup.html,popup.ts,popup.css}
- options/{options.html,options.ts,options.css}
- content/{content.ts,overlay.css}
- ai/{summarizer.ts,prompt.ts,(writer.ts),(rewriter.ts)}
- data/{storage.ts,db.ts,models.ts}
- utils/{dom.ts,chunk.ts,errors.ts}
- assets/icons/*

## Coding conventions
- TypeScript for logic files; ES modules
- No inline scripts/styles; MV3 CSP compliant
- Small, focused modules; clear separation of UI, AI, data

## Testing
- Unit tests for chunking, schema validation, storage; light UI tests
- Manual exploratory for streaming and overlay interactions

## Build & tooling
- Simple build (esbuild/tsup) or no-build for early phases if we keep to JS
- Keep dependencies minimal
