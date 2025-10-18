# Data Model and Storage

Last updated: 2025-10-18

## Storage backends
- chrome.storage.local: settings, indexes, small artifacts
- IndexedDB: large text blobs (full page texts, long reports)

## Types
- Settings
  - userProfile: { name, role, language, tone, styleNotes, customInstructions }
  - defaults: { summaryType, summaryLength, format, flashcardCount, reportLength, reportOutline }
  - features: { useWriter, useRewriter, useProofreader, useTranslator, showOverlayHints }
- CollectionItem
  - id, url, title, addedAt
  - sourceType: 'selection' | 'page'
  - textHash, textExcerpt, fullTextRef (IDB key)
- Summary
  - id, sourceId, type, length, format, content
- Flashcard
  - id, sourceId, question, options[], correctIndex, explanation
  - performance: { correctCount, wrongCount, lastAnsweredAt }
- Report
  - id, createdAt, sourceIds[], content (IDB ref if large), citations[]

## Keys and indexing
- storage.local
  - settings: single key 'settings'
  - items index: 'items' -> array of {id,url,title,addedAt,textHash}
  - summaries index: 'summaries' -> by sourceId
  - flashcards index: 'flashcards' -> by sourceId
  - reports index: 'reports' -> by createdAt
- IndexedDB stores
  - 'texts': { key: fullTextRef, value: text }
  - 'reports': { key: reportId, value: content }

## Limits and pruning
- Cap items to e.g. 200; prune LRU beyond cap
- Cap flashcard sets per URL; prune oldest
- Allow user-initiated cleanup from Settings

## Export/import
- Export a compact JSON (settings + indexes)
- Optionally include large blobs; or re-fetch from IDB on import

## Privacy
- All local; no network calls for inference
- Allow user to clear all data at any time
