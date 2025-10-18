# UX Flows

Last updated: 2025-10-18

## Popup
- Tabs: Analyze | Flashcards | Report | History (optional) | Settings
- Analyze: select summary type/length/format; run; stream results; copy/save
- Flashcards: choose source (selection/page); N cards; generate; play overlay
- Report: show queue (items: title/url/excerpt); compose; stream; export
- Settings: open options page

## Overlay (content script)
- Floating panel (shadow DOM); draggable; close button; keyboard shortcuts
- Card UI: question, options (A–D), reveal, explanation, next/prev
- Stats saved locally

## Context menu
- On selection: Summarize selection | Create flashcards from selection | Add selection to report queue
- On page: Summarize page | Create flashcards from page | Add page to report queue | Write report

## Availability and download
- If API availability is 'downloadable'/'downloading': show progress and require a click to start
- If 'unavailable': show requirements and disable action

## Errors and feedback
- Toasts or inline banners in popup/overlay
- Copyable error details

## Accessibility
- Focus traps; ARIA roles for dialog/list; keyboard navigation
- High-contrast friendly styles
