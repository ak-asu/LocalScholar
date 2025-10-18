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

## Content extraction
- Prefer selection text
- Else read document.body.innerText
- Optional readability heuristics later

## Caching and chunking
- For long pages, chunk by size/paragraphs, summarize chunks, then merge
- Cache per URL+textHash

## Files layout (high level)
- manifest.json
- background/service-worker.ts
- popup/popup.html, popup.ts, popup.css
- options/options.html, options.ts, options.css
- content/content.ts, overlay.css
- ai/summarizer.ts, ai/prompt.ts, (optional writer.ts, rewriter.ts)
- data/storage.ts, data/db.ts, data/models.ts
- utils/dom.ts, utils/chunk.ts, utils/errors.ts

## Alternatives considered
- Side panel instead of popup (defer for simplicity)
- Offscreen-only AI (user activation problems)

## Open questions
- Do we want a side panel for report editor in a later phase?
