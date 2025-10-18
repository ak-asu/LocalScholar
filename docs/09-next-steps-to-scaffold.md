# Next Steps to Scaffold

Last updated: 2025-10-18

## Immediate steps
1. Create minimal MV3 manifest with permissions (storage, contextMenus, scripting, activeTab)
2. Add service worker that registers context menus and routes messages
3. Add popup (Analyze tab) with Summarizer availability check and streaming
4. Add content script with selection/full-page text extraction and simple overlay shell
5. Implement storage wrapper and basic models

## Developer runbook (local)
- Load unpacked in chrome://extensions
- Requirements panel in popup shows API availability and model download progress

## Criteria for completion of Phase 1
- From popup, run a summary on selection/page
- From context menu, summarize selection/page via content script routing
- Streaming output renders; saved to local history

## Prep for Phase 2
- Add Prompt API module and JSON Schema validator for MCQ
- Design overlay card UI interactions
