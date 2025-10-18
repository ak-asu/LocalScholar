# Risks and Mitigations

Last updated: 2025-10-18

## Availability & hardware
- Risk: AI APIs unavailable due to OS/VRAM/RAM/storage
- Mitigation: Feature detection, clear UI messaging, links to chrome://on-device-internals, disable actions gracefully

## User activation
- Risk: Model download blocked without a click
- Mitigation: Always start actions from a click; show small in-page confirm overlay when invoked via context menu

## Long content
- Risk: Timeouts or poor quality for very long inputs
- Mitigation: Chunking + summary-of-summaries; per-URL caching

## Worker-context limitation
- Risk: Calling AI in service worker fails
- Mitigation: Centralize AI calls in document contexts only; worker routes messages

## Content scripts blocked/restricted pages
- Risk: Some pages block injection
- Mitigation: Fallback to popup-only; notify user

## Storage growth
- Risk: Unlimited local growth
- Mitigation: Caps + LRU prune; user cleanup tools

## Origin trials (optional APIs)
- Risk: Tokens expire / API shape changes
- Mitigation: Feature detection; toggles; degrade gracefully to Prompt API

## Accessibility and UX
- Risk: Overlay/popup not accessible
- Mitigation: Keyboard traps, ARIA roles, high-contrast support
