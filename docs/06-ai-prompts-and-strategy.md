# AI Prompts and Strategy

Last updated: 2025-01-29


## API mapping
- **Summaries**: Summarizer API (type: tldr/key-points/teaser/headline; length: short/medium/long; format: markdown/plain-text; outputLanguage: user-selected, default en)
- **MCQ/Flashcards**: Prompt API (LanguageModel) with structured output (JSON Schema; outputLanguage: user-selected)
- **Reports**: Prompt API synthesis across multiple sources with custom instructions (outputLanguage: user-selected)
- **Translation**: Translator API for selected text; displays in overlay; no history saved
- **Proofreading**: Proofreader API for selected text; shows corrections with explanations; displays in overlay; no history saved; requires Chrome 141+ and origin trial
- **Rewriting**: Rewriter API for selected text with tone/length/format options; displays in overlay; no history saved; requires Chrome 137+ and origin trial
- **Writer API**: Not currently used (reserved for future features)

## Correct API Namespaces (CRITICAL)
- ❌ WRONG: `self.ai.languageModel`, `self.translation`, `window.ai`
- ✅ CORRECT: `LanguageModel` (global), `Translator` (global), `Summarizer` (global), `Rewriter` (global), `Proofreader` (global)

## Availability and user activation
- Call availability() before creating sessions/translators
- **Correct availability states**:
  - LanguageModel: Returns `'available'` when ready
  - Translator: Returns `'available'` (hides download status for privacy)
  - Summarizer/Rewriter/Proofreader: Return `'readily'`, `'after-download'`, or `'no'`
- If not available: show requirements and disable action
- Never run in service worker; only document contexts (popup, content script)


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

### Summaries (Summarizer API)
- Set type/length/format/outputLanguage at create()
- Pass sharedContext for audience if needed
- Always specify outputLanguage (defaults to 'en')

### Flashcards (Prompt API)
- System: "You are a skilled educator. Generate high-quality multiple-choice questions (MCQ) from the provided text."
- User: text + constraints (count, difficulty, no trivia, plausible distractors)
- ResponseConstraint: JSON schema with question/options/answer/explanation
- Specify outputLanguage in session creation

### Report Synthesis (Prompt API)
- System: "You are a senior analyst. Write a cohesive report synthesizing multiple sources."
- User: list of sources {title, url, summary}, custom instructions (from textarea), citation style, language
- Custom instructions appended to prompt: "Additional Instructions:\n{customInstructions}"
- Ask for markdown output with section headings and inline links
- References section automatically added at end

### Translation (Translator API)
- Used for selected text only
- createTranslator({ sourceLanguage: 'en', targetLanguage: userSelected })
- Display original and translated text in overlay
- No history saved

### Proofreading (Proofreader API)
- Used for selected text only
- create({ expectedInputLanguages: ['en'] })
- Result contains: `correctedInput` (string) and `corrections` (array)
- Each correction has: startIndex, endIndex, explanation, type
- Display original, corrected text, and corrections list in overlay
- No history saved

### Rewriting (Rewriter API)
- Used for selected text only
- create({ tone, length, format, expectedInputLanguages: ['en'] })
- Tone: 'more-formal' | 'as-is' | 'more-casual'
- Length: 'shorter' | 'as-is' | 'longer'
- Format: 'as-is' | 'markdown' | 'plain-text'
- Display original and rewritten text in overlay
- No history saved

## Safety and content policy
- Respect Google Generative AI Prohibited Uses Policy
- Avoid generating harmful content; if risky inputs, show a warning and reduce functionality

## Localization
- If user language != page language, optionally translate summary (Translator API) after summarization
