# Chrome Built-in AI APIs - Comprehensive Reference

Last updated: 2025-01-29

This document provides detailed technical specifications for Chrome's built-in AI APIs, including correct API patterns, parameters, and integration guidelines for Manifest V3 extensions.

## Table of Contents
1. [Overview & Requirements](#overview--requirements)
2. [Prompt API (LanguageModel)](#prompt-api-languagemodel)
3. [Summarizer API](#summarizer-api)
4. [Writer API](#writer-api-origin-trial)
5. [Rewriter API](#rewriter-api-origin-trial)
6. [Translator API](#translator-api)
7. [Language Detector API](#language-detector-api)
8. [Proofreader API](#proofreader-api-origin-trial)
9. [Common Patterns & Best Practices](#common-patterns--best-practices)

---

## Overview & Requirements

### Browser & Hardware Requirements

**Chrome Version:** 138+ (some APIs require 141+)

**Operating Systems:**
- Windows 10/11
- macOS 13+ (Ventura onwards)
- Linux
- ChromeOS (Chromebook Plus, Platform 16389.0.0+)
- ❌ NOT SUPPORTED: Android, iOS, non-Chromebook Plus devices

**Storage:** Minimum 22 GB free space on Chrome profile volume

**Processing Power (either):**
- GPU: Strictly >4 GB VRAM
- CPU: 16+ GB RAM with 4+ cores

**Network:** Unmetered connection required (Wi-Fi/Ethernet preferred)

### Execution Context

**✅ Supported:**
- Top-level windows (extension pages, webpages)
- Same-origin iframes
- Extension popup, options, content scripts, offscreen documents

**❌ NOT Supported:**
- Service Workers (including extension background)
- Web Workers
- Cross-origin iframes (without Permissions Policy delegation)

**Strategy for Extensions:**
- Route events in background service worker
- Execute AI in popup/options/content script/offscreen document
- Use messaging to coordinate between contexts

### User Activation & Downloads

- **First call to `create()`** requires user gesture (click, tap, key press)
- Models download on first use (one-time per origin/extension)
- Use `monitor` callback with `downloadprogress` event for tracking
- Check `chrome://on-device-internals` for model status

---

## Prompt API (LanguageModel)

**Status:** Stable in Chrome 138+
**Namespace:** `LanguageModel` (global object, NOT `self.ai.languageModel` or `window.ai`)
**Model:** Gemini Nano

### Feature Detection

```javascript
if ('LanguageModel' in self) {
  // API is supported
}
```

### Availability States

```javascript
// Correct pattern
const availability = await LanguageModel.availability();
// Returns: 'available' (ready to use)
```

**Note:** Unlike other APIs, LanguageModel.availability() returns string 'available' when ready.

### Parameters Query

```javascript
const params = await LanguageModel.params();
// Returns: { defaultTopK, maxTopK, defaultTemperature, maxTemperature }
```

### Create Session

```javascript
const session = await LanguageModel.create({
  temperature: 0.7,              // 0-2, controls randomness (default varies)
  topK: 40,                      // 1-maxTopK, token selection diversity (default: defaultTopK)
  signal: abortSignal,           // Optional AbortSignal for cancellation
  initialPrompts: [              // Optional conversation history
    {role: 'system', content: 'Context'},
    {role: 'user', content: 'Question'},
    {role: 'assistant', content: 'Answer'}
  ],
  expectedInputs: [              // Optional: specify modalities and languages
    { type: 'text', languages: ['en', 'ja', 'es'] }
  ],
  expectedOutputs: [             // Optional: specify output types and languages
    { type: 'text', languages: ['en', 'ja', 'es'] }
  ]
});
```

**Session Options:**
- `temperature`: Controls randomness (higher = more creative)
- `topK`: Limits token diversity (lower = more focused)
- `signal`: AbortSignal for cancellation
- `initialPrompts`: Pre-populate conversation context
- `expectedInputs`: Specify modalities (text, image, audio) and languages
- `expectedOutputs`: Specify output types and supported languages

### Prompting Methods

**Batch (non-streaming):**
```javascript
const result = await session.prompt('Your question');
```

**Streaming:**
```javascript
const stream = session.promptStreaming('Your question');
for await (const chunk of stream) {
  console.log(chunk); // Progressive output
}
```

**With Options:**
```javascript
const result = await session.prompt(message, {
  signal: abortSignal,              // Stop execution
  responseConstraint: JSONSchema,   // Constrain output format
  omitResponseConstraintInput: true // Exclude schema from quota calculation
});
```

### Structured Output (JSON Schema)

```javascript
const schema = {
  type: "object",
  properties: {
    answer: { type: "boolean" },
    confidence: { type: "number" }
  },
  required: ["answer"]
};

const result = await session.prompt(
  'Is this about pottery?',
  {
    responseConstraint: schema,
    omitResponseConstraintInput: true  // Recommended for efficiency
  }
);
```

### Advanced Features

**Append Context:**
```javascript
// Add contextual prompts after session creation
await session.append([
  { role: 'user', content: 'Additional context' },
  { role: 'assistant', content: 'Understood', prefix: true }  // prefix prefills response
]);
```

**Response Prefix:**
```javascript
// Prefill assistant response formatting
const prompts = [
  { role: 'user', content: 'List three colors:' },
  { role: 'assistant', content: '1.', prefix: true }  // Guides formatting
];
const session = await LanguageModel.create({ initialPrompts: prompts });
```

### Session Management

```javascript
// Check token usage
console.log(session.inputUsage, session.inputQuota);

// Clone session (preserves initial prompts, resets context, efficient)
const newSession = await session.clone({ signal: newAbortSignal });

// Destroy session (frees resources, session becomes unusable)
session.destroy();
```

**Important:** Always destroy sessions when done to free resources. Cloning is more efficient than creating new sessions for the same task.

### Supported Languages

**Input & Output:** English (en), Japanese (ja), Spanish (es)

**Extension Usage:**
- Always specify `systemPrompt` for task context
- Use structured output for consistent data formats
- Manage token limits by checking `inputUsage`
- Destroy sessions when done to free memory

---

## Summarizer API

**Status:** Stable in Chrome 138+
**Namespace:** `Summarizer` (global object)

### Feature Detection & Availability

```javascript
if ('Summarizer' in self) {
  // API is supported
}

const availability = await Summarizer.availability();
// Returns: 'available', 'downloadable', or 'unavailable'
```

**Availability States:**
- `'available'`: Model is ready for immediate use
- `'downloadable'`: Model will download on first use
- `'unavailable'`: Model not supported on this device

### Create Summarizer

```javascript
const summarizer = await Summarizer.create({
  type: 'key-points',           // 'key-points' (default), 'tldr', 'teaser', 'headline'
  length: 'medium',             // 'short', 'medium' (default), 'long'
  format: 'markdown',           // 'markdown' (default), 'plain-text'
  outputLanguage: 'en',         // REQUIRED: 'en', 'es', 'ja', etc.
  sharedContext: 'Optional context for better summaries',
  expectedInputLanguages: ['en', 'es'],  // Optional
  expectedContextLanguages: ['en'],      // Optional
  monitor(m) {
    m.addEventListener('downloadprogress', (e) => {
      console.log(`Downloaded ${e.loaded * 100}%`);
    });
  }
});
```

### Summarization Methods

**Batch:**
```javascript
const summary = await summarizer.summarize(longText, {
  context: 'Additional context for this specific summarization'
});
```

**Streaming:**
```javascript
const stream = summarizer.summarizeStreaming(longText, {
  context: 'Optional context'
});
for await (const chunk of stream) {
  console.log(chunk);
}
```

**Important:** `outputLanguage` is set ONLY in `create()`, not in `summarize()` or `summarizeStreaming()`.

### Extension Usage

- Always specify `outputLanguage` to avoid warnings
- Use `sharedContext` for domain-specific summaries
- Prefer `innerText` over `innerHTML` for cleaner input
- Chunk long documents (>8000 chars) and summarize hierarchically
- One summarizer instance per configuration (immutable options)

---

## Writer API (Origin Trial)

**Status:** Origin Trial (Chrome 137-148)
**Namespace:** `Writer` (global object)
**Registration Required:** Must acknowledge Google's Generative AI Prohibited Uses Policy

### Availability

```javascript
if (!('Writer' in self)) {
  throw new Error('Writer API not available');
}

const availability = await Writer.availability();
// Returns: 'available', 'downloadable', or 'unavailable'
```

### Create Writer

```javascript
const writer = await Writer.create({
  tone: 'neutral',              // 'formal', 'neutral' (default), 'casual'
  format: 'markdown',           // 'markdown' (default), 'plain-text'
  length: 'medium',             // 'short' (default), 'medium', 'long'
  outputLanguage: 'en',         // Output language code
  sharedContext: 'Context for all writes',
  expectedInputLanguages: ['en'],
  expectedContextLanguages: ['en'],
  signal: abortSignal
});
```

### Writing Methods

**Batch:**
```javascript
const result = await writer.write(prompt, {
  context: 'Optional context for this write'
});
```

**Streaming:**
```javascript
const stream = writer.writeStreaming(prompt, {
  context: 'Optional context'
});
for await (const chunk of stream) {
  console.log(chunk);
}
```

### Extension Usage

- Reuse writer instances for multiple pieces
- Use `sharedContext` for consistent style/tone
- Call `writer.destroy()` when done
- Requires origin trial token in manifest

---

## Rewriter API (Origin Trial)

**Status:** Origin Trial (Chrome 137-148)
**Namespace:** `Rewriter` (global object)
**Registration Required:** Joint trial with Writer API

### Availability

```javascript
if (!('Rewriter' in self)) {
  throw new Error('Rewriter API not available');
}

const availability = await Rewriter.availability();
// Returns: 'available', 'downloadable', or 'unavailable'
```

### Create Rewriter

```javascript
const rewriter = await Rewriter.create({
  tone: 'as-is',                // 'more-formal', 'as-is' (default), 'more-casual'
  format: 'as-is',              // 'as-is' (default), 'markdown', 'plain-text'
  length: 'as-is',              // 'shorter', 'as-is' (default), 'longer'
  outputLanguage: 'en',         // Output language code
  sharedContext: 'Context for rewrites',
  expectedInputLanguages: ['en'],
  expectedContextLanguages: ['en']
});
```

### Rewriting Methods

**Batch:**
```javascript
const result = await rewriter.rewrite(text, {
  context: 'Optional context for this rewrite'
});
```

**Streaming:**
```javascript
const stream = rewriter.rewriteStreaming(text, {
  context: 'Optional context'
});
for await (const chunk of stream) {
  console.log(chunk);
}
```

### Extension Usage

- Use for tone adjustment (formal ↔ casual)
- Use for length modification (shorter ↔ longer)
- One rewriter can process multiple texts
- Call `rewriter.destroy()` when done
- Requires origin trial token in manifest

---

## Translator API

**Status:** Stable in Chrome 138+
**Namespace:** `Translator` (global object, NOT `self.translation`)

### Feature Detection

```javascript
if ('Translator' in self) {
  // API is supported
}
```

### Availability Check

```javascript
const capabilities = await Translator.availability({
  sourceLanguage: 'es',        // BCP 47 language code
  targetLanguage: 'fr'         // BCP 47 language code
});
// Returns: 'available' (hides download status for privacy)
```

**Privacy Note:** The API deliberately hides download status of specific language pairs to protect user privacy. It returns 'available' when a translation is possible.

### Create Translator

```javascript
const translator = await Translator.create({
  sourceLanguage: 'en',         // BCP 47 language code (e.g., 'en', 'es', 'fr')
  targetLanguage: 'es',         // BCP 47 language code
  monitor(m) {                  // Optional download progress monitor
    m.addEventListener('downloadprogress', (e) => {
      console.log(`Downloaded ${e.loaded * 100}%`);
    });
  }
});
```

### Translation Methods

**Batch (standard):**
```javascript
const translated = await translator.translate('Where is the next bus stop, please?');
// Returns: "Où est le prochain arrêt de bus, s'il vous plaît ?"
```

**Streaming (for longer content):**
```javascript
const stream = translator.translateStreaming(longText);
for await (const chunk of stream) {
  console.log(chunk);  // Progressive translation output
}
```

### Important Limitations

**Sequential Processing:** Translations are processed sequentially. If you send large amounts of text, subsequent translations are blocked until earlier ones complete.

**Best Practice for Large Text:**
- Implement chunking with loading interfaces
- Inform users about processing time
- Consider using streaming for better UX

### Language Codes

Use BCP 47 short codes: `'en'`, `'es'`, `'fr'`, `'de'`, `'ja'`, `'zh'`, `'ko'`, `'it'`, `'pt'`, `'ru'`, etc.

### Extension Usage Recommendations

- Always check `Translator.availability()` before creating translator
- User activation required before first `Translator.create()`
- Models download per language pair (monitored via `monitor` callback)
- Reuse translator instances for same language pair
- Use Language Detector API when source language is unknown
- Handle failed downloads gracefully (rejected promise)

---

## Language Detector API

**Status:** Stable in Chrome 138+
**Namespace:** `LanguageDetector` (global object)

### Availability

```javascript
if (!('LanguageDetector' in self)) {
  throw new Error('Language Detector not available');
}

const availability = await LanguageDetector.availability();
// Returns: 'downloadable' if needs download
```

### Create Detector

```javascript
const detector = await LanguageDetector.create({
  monitor(m) {
    m.addEventListener('downloadprogress', (e) => {
      console.log(`Downloaded ${e.loaded * 100}%`);
    });
  }
});
```

### Detection

```javascript
const results = await detector.detect('Bonjour le monde!');

// Returns array sorted by confidence:
// [
//   { detectedLanguage: 'fr', confidence: 0.95 },
//   { detectedLanguage: 'en', confidence: 0.05 }
// ]

// Get most likely language
const primaryLang = results[0].detectedLanguage;
```

### Extension Usage

- Use for auto-detecting source language before translation
- Less accurate for very short text
- Model is small and downloads quickly
- Results ranked from most to least probable

---

## Proofreader API (Origin Trial)

**Status:** Origin Trial (Chrome 141-145)
**Namespace:** `Proofreader` (global object)
**Registration Required:** Must acknowledge Google's Generative AI Prohibited Uses Policy

### Availability

```javascript
if (!('Proofreader' in self)) {
  throw new Error('Proofreader API not available');
}

const availability = await Proofreader.availability();
// Returns: 'downloadable' or availability status
```

### Create Proofreader

```javascript
const proofreader = await Proofreader.create({
  expectedInputLanguages: ['en'],
  monitor(m) {
    m.addEventListener('downloadprogress', (e) => {
      console.log(`Downloaded ${e.loaded * 100}%`);
    });
  }
});
```

### Proofreading

```javascript
const result = await proofreader.proofread(
  'I seen him yesterday at the store, and he bought two loafs of bread.'
);

// Response format:
// {
//   corrected: 'I saw him yesterday at the store, and he bought two loaves of bread.',
//   corrections: [
//     {
//       startIndex: 2,
//       endIndex: 6,
//       type: 'grammar',
//       explanation: 'Past tense of "see" is "saw"'
//     },
//     {
//       startIndex: 59,
//       endIndex: 64,
//       type: 'spelling',
//       explanation: 'Plural of "loaf" is "loaves"'
//     }
//   ]
// }
```

### Extension Usage

- Returns full corrected text + detailed corrections array
- Each correction includes: `startIndex`, `endIndex`, `type`, `explanation`
- Supports English (`en`) input language
- Requires origin trial token in manifest
- Call `proofreader.destroy()` when done

---

## Common Patterns & Best Practices

### 1. Availability Checking Pattern

```javascript
// For APIs with self.ai pattern
if (!('ai' in self) || !self.ai?.languageModel) {
  throw new Error('API not available');
}

const capabilities = await self.ai.languageModel.capabilities();
if (capabilities.available === 'no') {
  throw new Error('Model unavailable');
}

// For global APIs
if (!('Summarizer' in self)) {
  throw new Error('API not available');
}

const availability = await Summarizer.availability();
if (availability === 'no' || availability === 'unavailable') {
  throw new Error('Model unavailable');
}
```

### 2. User Activation Strategy

For context menu flows:
1. Forward event to content script
2. Show inline "Start" button in overlay
3. User clicks button (satisfies activation requirement)
4. Call `create()` method

### 3. Streaming Pattern

```javascript
const stream = api.methodStreaming(input);
let accumulated = '';

try {
  for await (const chunk of stream) {
    accumulated = chunk; // Most APIs accumulate in chunk
    updateUI(chunk);
  }
} catch (error) {
  if (error.name === 'AbortError') {
    console.log('Operation cancelled');
  }
}
```

### 4. Cancellation Pattern

```javascript
const controller = new AbortController();

const session = await api.create({
  signal: controller.signal
});

// Later, to cancel:
controller.abort();
```

### 5. Download Progress

```javascript
await API.create({
  monitor(m) {
    m.addEventListener('downloadprogress', (e) => {
      const percent = Math.round(e.loaded * 100);
      console.log(`Downloaded ${percent}%`);
      updateProgressBar(percent);
    });
  }
});
```

### 6. Error Handling

```javascript
try {
  const result = await api.method(input);
} catch (error) {
  if (error.message.includes('not available')) {
    // Guide user to enable in chrome://flags
  } else if (error.message.includes('quota')) {
    // Handle quota exceeded
  } else {
    // Generic error handling
  }
}
```

### 7. Caching Strategy

```javascript
// Cache based on content hash
const cacheKey = `${url}:${hashContent(text)}:${action}`;
const cached = await getCachedResult(cacheKey);

if (cached && !isExpired(cached)) {
  return cached.result;
}

const result = await processWithAI(text);
await setCachedResult(cacheKey, result);
return result;
```

### 8. Chunking Long Content

```javascript
const MAX_CHUNK_SIZE = 4000; // tokens/chars

if (content.length > MAX_CHUNK_SIZE) {
  const chunks = splitIntoChunks(content, MAX_CHUNK_SIZE);

  // Process chunks
  const results = [];
  for (const chunk of chunks) {
    const result = await processChunk(chunk);
    results.push(result);
  }

  // Combine results
  return combineResults(results);
}
```

### 9. Extension-Specific Patterns

**manifest.json:**
```json
{
  "permissions": ["storage"],
  "content_scripts": [{"matches": ["<all_urls>"]}],
  "web_accessible_resources": [{
    "resources": ["scripts/*.js"],
    "matches": ["<all_urls>"]
  }]
}
```

**Message passing:**
```javascript
// Background → Content
chrome.tabs.sendMessage(tabId, {type: 'ACTION', data});

// Content → Background
chrome.runtime.sendMessage({type: 'ACTION', data});
```

---

## Debugging Tools

1. **chrome://on-device-internals** - Model download status
2. **chrome://flags** - Enable/disable AI features
3. **DevTools Console** - Check API availability and errors
4. **Feature Detection** - Always check before use

---

## Important Reminders

- ✅ Use `self.ai.languageModel` (NOT `window.ai` or `LanguageModel`)
- ✅ Use `self.translation` (NOT `Translator`)
- ✅ Check availability states: `'readily'`, `'after-download'`, `'no'`
- ✅ Always specify `outputLanguage` for Summarizer
- ✅ Require user activation for first `create()` call
- ✅ APIs work in document contexts only (not workers)
- ✅ Destroy/cleanup API instances when done
- ❌ Don't call APIs from service workers
- ❌ Don't assume models are immediately available
- ❌ Don't skip availability checks

---

## References

- AI Overview: https://developer.chrome.com/docs/ai
- Built-in APIs Status: https://developer.chrome.com/docs/ai/built-in-apis
- Prompt API: https://developer.chrome.com/docs/ai/prompt-api
- Summarizer API: https://developer.chrome.com/docs/ai/summarizer-api
- Writer API: https://developer.chrome.com/docs/ai/writer-api
- Rewriter API: https://developer.chrome.com/docs/ai/rewriter-api
- Translator API: https://developer.chrome.com/docs/ai/translator-api
- Language Detector API: https://developer.chrome.com/docs/ai/language-detection
- Proofreader API: https://developer.chrome.com/docs/ai/proofreader-api
- Extensions & AI: https://developer.chrome.com/docs/extensions/ai
- MV3 Development: https://developer.chrome.com/docs/extensions/develop

---

*Last verified: January 2025 - Chrome 138+*
