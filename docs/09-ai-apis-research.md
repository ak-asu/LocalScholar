# Chrome Built-in AI APIs in MV3 Extensions – Research & Integration Guide

Last updated: 2025-10-18

This document summarizes how to enable and integrate the Chrome built‑in AI APIs in a Manifest V3 extension, with links to official docs and practical extension-specific notes.


APIs covered
- Prompt API (LanguageModel)
- Summarizer API (Summarizer)
- Writer API (Writer) – origin trial
- Rewriter API (Rewriter) – origin trial
- Proofreader API (Proofreader) – origin trial
- Translator API (Translator) – also used for switching output language of results
- Language Detector API (LanguageDetector)

## 1) Eligibility, hardware, and availability
- Browser: Chrome 138+ (Windows 10/11, macOS 13+, Linux, or Chromebook Plus per docs)
- Storage: ~22 GB free on Chrome profile volume for model downloads (varies)
- Hardware: GPU >4 GB VRAM or CPU with 16 GB RAM and 4+ cores
- Availability states: `available`, `downloadable`, `downloading`, `unavailable`
- Models download once per origin/extension; check `chrome://on-device-internals` for status
- Built-in AI does NOT run in service workers; use document contexts (popup, options, content script, offscreen doc)

References
- Built-in AI APIs: developer.chrome.com/docs/ai/built-in-apis
- Get started + requirements: developer.chrome.com/docs/ai/get-started
- On-device internals: chrome://on-device-internals

## 2) Permissions policy and where to run
- Allowed: top-level windows, same-origin iframes (extension pages, content scripts)
- Delegation to cross-origin iframes via allow attribute (not common for extensions)
- Not supported in Web Workers (including extension service workers)
- Strategy: route events in background SW, execute AI in popup/options/content/offscreen

References
- Summarizer: Permission Policy section
- Prompt: Permission Policy section

## 3) User activation & model download
- The first `create()` requires a user gesture (click/tap/key). Plan UX to start from user interaction.
- Use `availability()` to detect state; if `downloadable/downloading`, show `monitor(downloadprogress)` hook and communicate progress.
- For context menu flows: forward to content script and display a small inline consent button to satisfy user activation before creating the model.

References
- Summarizer, Prompt, Writer, Rewriter pages: user activation and monitor examples


## 4) Output language and AI pipeline
- All AI API calls (Summarizer, Prompt, etc.) must specify an output language code (outputLanguage: [en, es, ja, ...]); default is en, but user can select from top 5 and switch using Translator API.
- For large/complex pages, implement an AI pipeline: extract and clean up main content (remove nav, ads, scripts, etc.), chunk content as needed, process in phases, and merge results.

## 5) API-by-API integration


### Prompt API
- Status: Stable for extensions in Chrome 138+
- Namespace: `LanguageModel`
- Steps: `await LanguageModel.availability()` -> `await LanguageModel.create({ ... })` -> `session.prompt()` or `promptStreaming()`
- Features: sessions, temperature/topK, initial prompts, structured output via `responseConstraint` (JSON Schema), streaming, outputLanguage
- Use cases in this project: MCQ generation with JSON Schema; report synthesis; always specify outputLanguage (default en, user-selectable)
- Extension notes: run in popup or content script; manage session lifecycle; avoid SW

Docs: developer.chrome.com/docs/ai/prompt-api


### Summarizer API
- Status: Stable in Chrome 138+
- Namespace: `Summarizer`
- Steps: `await Summarizer.availability()` -> `await Summarizer.create({ type, length, format, outputLanguage, sharedContext, monitor })` -> `summarize()` or `summarizeStreaming()`
- Immutable options per summarizer instance; create a new instance for different parameters
- Use cases: tldr, key-points, headline/teaser with short/medium/long
- Extension notes: prefer `innerText` over `innerHTML`; chunk long pages; stream output; always specify outputLanguage (default en, user-selectable)

Docs: developer.chrome.com/docs/ai/summarizer-api

### Writer API (origin trial)
- Status: Origin trial (Chrome ~137–142). Requires token.
- Namespace: `Writer`
- Steps: Register origin trial with your extension ID, add token to manifest, feature-detect `'Writer' in self`, then use `Writer.availability()`, `Writer.create()`, `writer.write()`/`writeStreaming()`
- Use cases: compose prose in user’s tone/style; optional polishing for reports

Docs: developer.chrome.com/docs/ai/writer-api

### Rewriter API (origin trial)
- Status: Origin trial (Chrome ~137–142). Requires token.
- Namespace: `Rewriter`
- Steps: Same pattern as Writer
- Use cases: make text more formal/casual, shorter/longer; optional pass on outputs

Docs: developer.chrome.com/docs/ai/rewriter-api

### Proofreader API (origin trial)
- Status: Origin trial
- Namespace: `Proofreader`
- Use cases: correctness, grammar suggestions on user text
- Extension notes: gate behind feature toggle; rely on Prompt/Writer as fallback

Docs: developer.chrome.com/docs/ai/proofreader-api


### Translator API
- Status: Stable in Chrome 138+
- Namespace: `Translator`
- Use cases: translate summaries/reports/flashcards to user-selected language; allow user to quickly switch output language for any result
- Extension notes: always offer top 5 language choices (en, es, ja, fr, de or similar); integrate quick switch in popup/overlay

Docs: developer.chrome.com/docs/ai/translator-api

### Language Detector API
- Status: Stable in Chrome 138+
- Namespace: `LanguageDetector`
- Use cases: auto-detect source language and set Translator target/source

Docs: developer.chrome.com/docs/ai/language-detection

## 5) Origin trials for extensions (Writer/Rewriter/Proofreader)
- Register trial with your extension ID (chrome-extension://<EXTENSION_ID>)
- Add the token to the manifest per docs (Origin Trials in extensions)
- Feature-detect at runtime and degrade gracefully if missing
- Localhost dev: enable the respective chrome://flags entries (Writer/Rewriter) when testing

Docs: developer.chrome.com/docs/web-platform/origin-trials#extensions

## 6) Common pitfalls and patterns
- Don’t call APIs from the service worker
- Always guard with availability() and user activation
- Streaming UX: display partials promptly; allow cancel via AbortController
- Structured output: use JSON Schema with Prompt API; validate and reprompt on errors
- Chunk long inputs and summarize summaries
- Cache per URL+hash to avoid re-inferencing unchanged pages

## 7) Minimal example placements in an extension (no code, just placement)
- Popup: create sessions/summarizers and render streaming results
- Content script: get selection/page text, inject overlay, optionally run AI after user confirmation
- Options: settings and optional test prompts; not required for core
- Background SW: create context menus, route messages to documents only
- Offscreen (optional): use for long tasks if popup must be closed, still needs prior user activation

## 8) Testing & debugging tips
- Use DevTools Console in popup/content pages; inspect streaming chunks
- `chrome://on-device-internals` to monitor model download and status
- Feature-detection branches for graceful fallbacks
- Provide an in-app diagnostics panel to surface availability and quotas

## 9) References
- AI overview: developer.chrome.com/docs/ai
- Built-in APIs status: developer.chrome.com/docs/ai/built-in-apis
- Prompt API: developer.chrome.com/docs/ai/prompt-api
- Summarizer API: developer.chrome.com/docs/ai/summarizer-api
- Writer API: developer.chrome.com/docs/ai/writer-api
- Rewriter API: developer.chrome.com/docs/ai/rewriter-api
- Proofreader API: developer.chrome.com/docs/ai/proofreader-api
- Translator API: developer.chrome.com/docs/ai/translator-api
- Language Detector API: developer.chrome.com/docs/ai/language-detection
- Extensions & AI: developer.chrome.com/docs/extensions/ai
- MV3 Develop: developer.chrome.com/docs/extensions/develop
- Samples: developer.chrome.com/docs/extensions/samples
