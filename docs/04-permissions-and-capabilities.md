# Permissions and Capabilities

Last updated: 2025-10-18

## Manifest V3 permissions
- permissions: [
  - "storage",
  - "contextMenus",
  - "scripting",
  - "activeTab"
]
- optional_permissions: [
  - "offscreen",
  - "sidePanel" (future)
]
- host_permissions: Prefer none; rely on activeTab for user-initiated access

## Rationale
- storage: persist settings and indexes
- contextMenus: right-click actions
- scripting: programmatically inject content script if needed
- activeTab: act on current page on user action without broad host access
- offscreen (optional): long-running DOM-required tasks if popup closes

## Built-in AI APIs usage
- Summarizer and Prompt are stable in Chrome 138+
- Writer/Rewriter/Proofreader require origin trials (optional)
- Translator and Language Detector are stable and optional
- AI must run in document contexts (popup, options, content script, offscreen doc) — not in service worker

## CSP and packaging
- No remote code; bundle assets
- Avoid inline scripts/styles

## Icons and branding
- Provide 16/32/48/128 icons
- Short and long extension descriptions
