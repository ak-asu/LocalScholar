# AI Prompts and Strategy

Last updated: 2025-10-18


## API mapping
- Summaries: Summarizer API (type: tldr/key-points/teaser/headline; length: short/medium/long; format: markdown/plain-text; outputLanguage: user-selected, default en)
- MCQ/Flashcards: Prompt API with structured output (JSON Schema; outputLanguage: user-selected)
- Reports: Prompt API synthesis across multiple sources (outputLanguage: user-selected)
- Optional: Writer/Rewriter for polishing; Proofreader/Translator for cleanup/translation; Translator API for switching output language on demand

## Availability and user activation
- Call availability() first; if downloadable/downloading, show monitor(downloadprogress) and request a click to start create()
- Never run in service worker; only document contexts


## AI pipeline: content extraction, cleanup, and chunking

### Implementation Status: ✅ Complete

The AI pipeline has been fully implemented in `utils/content-extractor.js` and integrated into the extension.

### Content Extraction (`utils/content-extractor.js`)

**Main Content Detection**:
- Prioritizes semantic selectors: `<article>`, `<main>`, `[role="main"]`, `.content`, etc.
- Falls back to `<body>` if no main content area found
- Returns metadata about extraction source and content statistics

**Noise Removal** - automatically removes:
- Scripts, styles, iframes, embeds
- Navigation, headers, footers, asides
- Advertisements (`.ad`, `.advertisement`, `.ads`)
- Social widgets, comments, cookie banners, modals
- ARIA navigation and complementary roles

**Text Cleanup**:
- Normalizes line breaks and whitespace
- Removes excessive blank lines (max 2 consecutive)
- Trims leading/trailing spaces
- Removes tabs and normalizes spacing

### Chunking Strategy

**Configuration** (default):
- `MAX_CHUNK_SIZE`: 10,000 characters
- `MIN_CHUNK_SIZE`: 500 characters
- `CHUNK_OVERLAP`: 200 characters for context preservation

**Semantic Splitting**:
- Splits by headings and paragraph boundaries
- Detects heading-like patterns (all caps lines, lines ending with `:`)
- Preserves section context with metadata
- Maintains overlap between chunks for continuity

**Chunk Metadata**:
- Each chunk includes: text, index, total count, size, section headings
- Overall extraction metadata: source, character/word count, needs chunking flag

### Processing Strategies

**Single-Chunk** (content ≤ 10,000 chars):
1. Extract and clean content
2. Validate (min 50 chars, checks for gibberish)
3. Summarize in one pass with requested parameters
4. Display result

**Multi-Chunk** (content > 10,000 chars):
1. Extract and split into semantic chunks
2. Process each chunk with Summarizer API (using `short` length)
3. Combine summaries based on type:
   - **key-points**: Concatenate with section headings (markdown `###` or plain text)
   - **tldr/teaser/headline**: Summary-of-summaries approach
4. Display final combined result with metadata

**Summary-of-Summaries**:
- Generate short summary for each chunk
- Combine all chunk summaries into intermediate text
- If combined text < 32,000 chars, run Summarizer again with original requested length
- Produces cohesive final summary across entire document

### Validation and Error Handling

**Content Validation**:
- Minimum 50 characters required
- Warns if average word length > 20 (unusual formatting)
- Warns if estimated tokens > 50,000 (~200,000 chars)
- Warns if main content area not identified

**Graceful Fallbacks**:
- Enhanced extraction fails → simple `innerText` fallback
- No selection → automatically use full page
- Content script unavailable → user-friendly error message
- Main content not found → use body with warning

### Caching Strategy (Future)
- Cache extracted content per URL+hash
- Invalidate on content changes
- Store in chrome.storage.local with size limits
- Re-use for multiple operations (summarize, flashcards, reports)

## Structured output schema (flashcards)
- ResponseConstraint example:
  - Array of objects: { question: string, options: string[4], answer: number (0-3), explanation?: string }
- Validate and fallback on parse errors (reprompt with stricter guidance)


## Prompts
- All prompts must specify output language (outputLanguage: user-selected, default en)
- Flashcards (Prompt API):
  - System: "You are a skilled educator. Generate high-quality multiple-choice questions (MCQ) from the provided text."
  - User: text + constraints (count, difficulty, no trivia, plausible distractors)
  - ResponseConstraint: schema
- Report synthesis (Prompt API):
  - System: "You are a senior analyst. Write a cohesive report using the style and tone from the user's profile."
  - User: list of sources {title, url, excerpt or per-source summary}; desired outline/length; citation style; language
  - Ask for markdown output with section headings and inline links
- Summaries (Summarizer API): set type/length/format/outputLanguage at create(); pass sharedContext for audience
- Translator API: allow user to switch output language for any result; translate summaries, flashcards, or reports on demand

## Safety and content policy
- Respect Google Generative AI Prohibited Uses Policy
- Avoid generating harmful content; if risky inputs, show a warning and reduce functionality

## Localization
- If user language != page language, optionally translate summary (Translator API) after summarization
