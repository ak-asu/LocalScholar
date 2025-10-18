# AI Prompts and Strategy

Last updated: 2025-10-18

## API mapping
- Summaries: Summarizer API (type: tldr/key-points/teaser/headline; length: short/medium/long; format: markdown/plain-text)
- MCQ/Flashcards: Prompt API with structured output (JSON Schema)
- Reports: Prompt API synthesis across multiple sources
- Optional: Writer/Rewriter for polishing; Proofreader/Translator for cleanup/translation

## Availability and user activation
- Call availability() first; if downloadable/downloading, show monitor(downloadprogress) and request a click to start create()
- Never run in service worker; only document contexts

## Chunking strategy
- For long inputs: split by headings/paragraphs/size
- Summarize chunks, then combine summaries
- Cache per URL+hash for re-use

## Structured output schema (flashcards)
- ResponseConstraint example:
  - Array of objects: { question: string, options: string[4], answer: number (0-3), explanation?: string }
- Validate and fallback on parse errors (reprompt with stricter guidance)

## Prompts
- Flashcards (Prompt API):
  - System: "You are a skilled educator. Generate high-quality multiple-choice questions (MCQ) from the provided text."
  - User: text + constraints (count, difficulty, no trivia, plausible distractors)
  - ResponseConstraint: schema
- Report synthesis (Prompt API):
  - System: "You are a senior analyst. Write a cohesive report using the style and tone from the user's profile."
  - User: list of sources {title, url, excerpt or per-source summary}; desired outline/length; citation style; language
  - Ask for markdown output with section headings and inline links
- Summaries (Summarizer API): set type/length/format at create(); pass sharedContext for audience

## Safety and content policy
- Respect Google Generative AI Prohibited Uses Policy
- Avoid generating harmful content; if risky inputs, show a warning and reduce functionality

## Localization
- If user language != page language, optionally translate summary (Translator API) after summarization
