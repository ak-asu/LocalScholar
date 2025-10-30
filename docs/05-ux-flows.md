# UX Flows

Last updated: 2025-01-29


## Popup
- Sections: Summaries | Flashcards | Reports (Queue Items + Generated Reports) | Settings
- Summaries: View history, actions (view/copy/download/delete)
- Flashcards: View decks, play in overlay, actions (view/copy/download/delete)
- Reports:
  - Queue Items: Show collected sources with preview, remove items
  - Custom Instructions: Textarea above "Generate Report from Queue" button
  - Generated Reports: View history, actions (view/copy/download/delete)
- Settings (unified, no separate page):
  - Summary: type/length/format/output language (10 languages)
  - Flashcards: count/difficulty/output language
  - Translation: target language (10 languages)
  - Rewriter: tone (more-formal/as-is/more-casual), length (shorter/as-is/longer), format (as-is/markdown/plain-text)
  - Performance: caching, expiration, chunk size
  - Data management: export/import/clear cache


## Overlay (content script)
- Floating panel (shadow DOM); draggable; close button; keyboard shortcuts
- Multiple display modes:
  1. **Flashcards**: Question, options (A–D), reveal, explanation, next/prev; stats saved locally
  2. **Translation**: Original text and translated text side-by-side; no history saved
  3. **Proofreading**: Original, corrected text, and detailed corrections list; no history saved
  4. **Rewriting**: Original and rewritten text with settings display; no history saved
  5. **Progress**: Task name, progress bar, time estimate, cancel button
- All overlays use unified system with consistent styling

## Context menu (6 items)
- **On selection or page**:
  - Summarize (selection or page)
  - Create flashcards (selection or page)
  - Add to report queue (selection or page)
- **On selection only**:
  - Translate selection (overlay display only, no history)
  - Proofread selection (overlay display only, no history)
  - Rewrite selection (overlay display only, no history)


## Availability and download
- If API availability is 'after-download': show progress and inform user model will download on first use
- If 'no': show requirements and disable action
- For all AI calls, specify output language (default en, user-selectable from 10 languages)
- Correct availability states used: 'readily', 'after-download', 'no'

## Errors and feedback
- Modal dialogs instead of alerts for user-friendly interaction
- Temporary notification messages for quick feedback
- Console logging for debugging
- Graceful fallbacks when APIs unavailable

## Accessibility
- Focus traps; ARIA roles for dialog/list; keyboard navigation
- High-contrast friendly styles
- Modal dialogs keyboard-accessible
- Overlay draggable and closable

## AI pipeline for large/complex pages
- Extract and clean up main content (remove nav, ads, scripts, etc.) before AI calls
- Chunk content as needed (default: 10,000 char chunks with 200 char overlap)
- Process in phases; merge results with summary-of-summaries for coherence
- Smart semantic splitting by headings and paragraphs

## Task Management
- Background processing with draggable progress overlays
- Multiple concurrent tasks supported across tabs
- Duplicate prevention via content hashing
- Time estimation that learns from actual processing times
- Cancel button on progress overlays to stop tasks
- Tasks continue when switching tabs
