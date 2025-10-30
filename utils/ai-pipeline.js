/**
 * AI Processing Pipeline
 *
 * Coordinates AI processing for content extraction with streaming support.
 * Handles both Summarizer API and Prompt API for various use cases.
 */

import { estimateTokens } from './content-extractor.js';

/**
 * Processes content through batch summarization
 *
 * NOTE: The Summarizer API supports both batch and streaming modes:
 * - Batch mode (used here): summarize() - processes input as a whole, returns complete result
 * - Streaming mode (not currently used): summarizeStreaming() - returns results in real-time
 *
 * Streaming could be implemented in the future for better UX by showing progressive results.
 * See Chrome AI documentation for details on streaming implementation.
 *
 * @param {Object} options - Processing options
 * @param {string} options.text - Text content to summarize
 * @param {string} options.type - Summarizer type (tldr, key-points, etc.)
 * @param {string} options.length - Summarizer length (short, medium, long)
 * @param {string} options.format - Summarizer format (markdown, plain-text)
 * @param {string} options.outputLanguage - Output language code
 * @param {Function} options.onProgress - Progress callback (message, percent)
 * @returns {Promise<Object>} - { summary: string, metadata: object }
 */
export async function processSummarization(options) {
  const {
    text,
    type = 'key-points',
    length = 'medium',
    format = 'markdown',
    outputLanguage = 'en',
    onProgress = () => {}
  } = options;

  if (!text) {
    throw new Error('No text provided for summarization');
  }

  // Ensure outputLanguage is always set (safety check)
  const safeOutputLanguage = outputLanguage || 'en';

  onProgress('Preparing summarization...', 5);

  // Check Summarizer availability
  if (!('Summarizer' in self)) {
    throw new Error('Summarizer API not supported in this browser. Enable "Optimization Guide On Device Model" in chrome://flags and restart Chrome');
  }

  const availability = await Summarizer.availability();
  console.log('[LocalScholar] Summarizer.availability() returned:', availability);

  // Availability states: 'available', 'downloadable', 'unavailable'
  if (availability === 'unavailable') {
    throw new Error('Summarizer unavailable on this device');
  }

  if (availability === 'downloadable') {
    onProgress('Summarizer model will download on first use...', 10);
  }

  onProgress('Summarizing content...', 15);

  // Use batch mode
  const summary = await summarizeBatch(text, {
    type,
    length,
    format,
    outputLanguage: safeOutputLanguage,
    onProgress: (percent) => onProgress('Summarizing...', 15 + percent * 0.8)
  });

  onProgress('Complete', 100);

  return {
    summary,
    metadata: {
      textLength: text.length,
      tokens: estimateTokens(text)
    }
  };
}

/**
 * Summarizes text in batch mode
 *
 * NOTE: Streaming mode is available via summarizeStreaming() but not currently used.
 * Example streaming implementation:
 *
 *   const stream = summarizer.summarizeStreaming(text);
 *   for await (const chunk of stream) {
 *     // chunk contains progressively updated summary text
 *     updateUI(chunk);
 *   }
 *
 * @param {string} text - Text to summarize
 * @param {Object} options - Summarization options
 * @returns {Promise<string>} - Summary text
 */
async function summarizeBatch(text, options = {}) {
  const {
    type = 'key-points',
    length = 'medium',
    format = 'markdown',
    outputLanguage = 'en',
    onProgress = () => {}
  } = options;

  const safeOutputLanguage = outputLanguage || 'en';

  const createOptions = {
    expectedInputLanguages: ["en", "ja", "es"],
    type,
    length,
    format,
    outputLanguage: safeOutputLanguage
  };

  // Add monitor if progress callback exists
  if (onProgress && typeof onProgress === 'function') {
    createOptions.monitor = (m) => {
      m.addEventListener('downloadprogress', (e) => {
        onProgress(e.loaded);
      });
    };
  }

  console.log('[LocalScholar] Summarizer.create() called with batch mode:', createOptions);

  const summarizer = await Summarizer.create(createOptions);

  try {
    console.log('[LocalScholar] Starting batch summarization, text length:', text.length);

    const result = await summarizer.summarize(text);

    console.log('[LocalScholar] Batch summarization complete, result length:', result.length);
    return result;
  } finally {
    if (summarizer.destroy) {
      summarizer.destroy();
    }
  }
}


/**
 * Processes flashcard generation from content
 * @param {Object} options - Processing options
 * @param {string} options.text - Text content to generate flashcards from
 * @param {number} options.count - Number of flashcards to generate
 * @param {string} options.difficulty - 'easy', 'medium', 'hard'
 * @param {string} options.outputLanguage - Output language code
 * @param {Function} options.onProgress - Progress callback
 * @returns {Promise<Object>} - { flashcards: array, metadata: object }
 */
export async function processFlashcardGeneration(options) {
  const {
    text,
    count = 5,
    difficulty = 'medium',
    outputLanguage = 'en',
    onProgress = () => {}
  } = options;

  if (!text) {
    throw new Error('No text provided for flashcard generation');
  }

  onProgress('Preparing flashcard generation...', 5);

  // Check Prompt API (LanguageModel) availability
  if (!('LanguageModel' in self)) {
    throw new Error('Prompt API not available. Enable "Optimization Guide On Device Model" in chrome://flags and restart Chrome');
  }

  const availability = await LanguageModel.availability();
  if (availability !== 'available') {
    throw new Error('Language Model unavailable on this device');
  }

  onProgress('Language Model ready...', 10);
  onProgress('Generating flashcards...', 20);

  const flashcards = await generateFlashcardsFromText(text, {
    count,
    difficulty,
    outputLanguage
  });

  onProgress('Complete', 100);

  return {
    flashcards,
    metadata: {
      textLength: text.length,
      requestedCount: count,
      generatedCount: flashcards.length,
      difficulty,
      outputLanguage
    }
  };
}

/**
 * Generates flashcards from text using Prompt API
 * @param {string} text - Text to generate flashcards from
 * @param {Object} options - Generation options
 * @returns {Promise<Array>} - Array of flashcard objects
 */
async function generateFlashcardsFromText(text, options) {
  const {
    count = 5,
    difficulty = 'medium',
    outputLanguage = 'en'
  } = options;

  // Create session with LanguageModel API
  const session = await LanguageModel.create({
    temperature: 0.7,
    topK: 40,
    initialPrompts: [
      {
        role: 'system',
        content: 'You are a skilled educator. Generate high-quality multiple-choice questions (MCQ) from the provided text in valid JSON format.'
      }
    ],
    expectedOutputs: [
      { type: "text", languages: [outputLanguage] }
    ]
  });

  try {
    const difficultyGuide = {
      easy: 'Focus on basic recall and comprehension. Use straightforward questions with clearly distinct answer choices.',
      medium: 'Test understanding and application. Use plausible distractors that require careful consideration.',
      hard: 'Challenge with analysis and evaluation. Use subtle distractors that test deep understanding.'
    };

    const prompt = `Generate ${count} multiple-choice questions from the following text.

Difficulty level: ${difficulty}
${difficultyGuide[difficulty]}

Requirements:
- Each question should test understanding of key concepts
- All four options should be plausible; avoid obvious distractors
- Provide a brief explanation for the correct answer
- Ensure questions are clear and unambiguous

IMPORTANT: The "answer" field must be an index from 0 to 3 (0=first option, 1=second, 2=third, 3=fourth).

Text:
${text}`;

    // Define JSON schema for structured output
    const schema = {
      type: "array",
      items: {
        type: "object",
        properties: {
          question: { type: "string" },
          options: {
            type: "array",
            items: { type: "string" },
            minItems: 4,
            maxItems: 4
          },
          answer: { type: "integer", minimum: 0, maximum: 3 },
          explanation: { type: "string" }
        },
        required: ["question", "options", "answer", "explanation"]
      }
    };

    const result = await session.prompt(prompt, {
      responseConstraint: schema,
      omitResponseConstraintInput: true  // Don't count schema towards quota
    });

    console.log('[LocalScholar] Raw flashcard response:', result);

    // Parse the JSON response - handle markdown code blocks
    let flashcards = [];
    try {
      // Try direct parse first
      flashcards = JSON.parse(result);
    } catch (parseError) {
      console.error('Failed to parse flashcard JSON:', parseError);

      // Try to extract JSON from markdown code blocks
      let cleaned = result.trim();

      // Remove markdown code block markers
      cleaned = cleaned.replace(/^```json\s*/i, '').replace(/^```\s*/, '');
      cleaned = cleaned.replace(/\s*```$/, '');
      cleaned = cleaned.trim();

      // Try to find JSON array
      const jsonMatch = cleaned.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        try {
          flashcards = JSON.parse(jsonMatch[0]);
        } catch (e) {
          console.error('Failed to parse extracted JSON:', e);
          throw new Error('Failed to generate valid flashcards - invalid JSON format');
        }
      } else {
        throw new Error('Failed to generate valid flashcards - no JSON array found');
      }
    }

    // Validate and fix answer indices if needed (convert 1-4 to 0-3)
    flashcards = flashcards.map((card, idx) => {
      if (card.answer > 3) {
        console.warn(`[LocalScholar] Card ${idx + 1}: Converting answer from ${card.answer} to ${card.answer - 1} (1-indexed to 0-indexed)`);
        card.answer = card.answer - 1;
      }
      return card;
    });

    return flashcards;
  } finally {
    // Clean up session
    if (session.destroy) {
      session.destroy();
    }
  }
}

/**
 * Processes report generation from collection items
 * @param {Object} options - Processing options
 * @param {Array} options.items - Collection items to synthesize
 * @param {string} options.outputLanguage - Output language code
 * @param {Function} options.onProgress - Progress callback
 * @returns {Object} - { report: string, citations: array, metadata: object }
 */
export async function processReportGeneration(options) {
  const {
    items = [],
    outputLanguage = 'en',
    customInstructions = '',
    onProgress = () => {}
  } = options;

  if (items.length === 0) {
    throw new Error('No items to generate report from');
  }

  onProgress('Preparing report generation...', 5);

  // Check Prompt API availability
  if (!('LanguageModel' in self)) {
    throw new Error('Prompt API (LanguageModel) not supported in this browser');
  }

  const availability = await LanguageModel.availability();
  if (availability !== 'available') {
    throw new Error('Language Model unavailable on this device');
  }

  onProgress('Analyzing sources...', 10);

  // Prepare content from all items
  const sources = items.map((item, idx) => ({
    index: idx + 1,
    title: item.title || 'Untitled',
    url: item.url,
    content: item.fullText || item.text || '',
    sourceType: item.sourceType || 'page'
  }));

  // If items already have summaries, use those; otherwise create brief summaries
  const progressPerItem = 40 / sources.length;
  const processedSources = [];

  for (let i = 0; i < sources.length; i++) {
    const source = sources[i];
    const baseProgress = 10 + (i * progressPerItem);

    onProgress(`Processing source ${i + 1}/${sources.length}...`, baseProgress);

    // Check if content is too long, summarize it first
    if (estimateTokens(source.content) > 4000) {
      const summary = await summarizeBatch(source.content, {
        type: 'key-points',
        length: 'short',
        format: 'plain-text',
        outputLanguage
      });

      processedSources.push({
        ...source,
        summary
      });
    } else {
      processedSources.push({
        ...source,
        summary: source.content
      });
    }
  }

  onProgress('Synthesizing report...', 55);

  // Check Prompt API (LanguageModel) availability
  if (!('LanguageModel' in self)) {
    throw new Error('Prompt API not available for report generation. Enable it in chrome://flags');
  }

  // Create the report by synthesizing all sources
  const session = await LanguageModel.create({
    temperature: 0.7,
    topK: 40,
    initialPrompts: [
      {
        role: 'system',
        content: 'You are a skilled technical writer. Create comprehensive, well-structured reports that synthesize information from multiple sources.'
      }
    ],
    expectedOutputs: [
      { type: "text", languages: [outputLanguage] }
    ]
  });

  try {
    const sourcesText = processedSources.map((s, idx) =>
      `[Source ${idx + 1}: ${s.title}]\n${s.summary}`
    ).join('\n\n---\n\n');

    // Build the prompt with optional custom instructions
    let prompt = `Create a comprehensive report synthesizing the following ${processedSources.length} source(s).

Requirements:
- Write a cohesive, well-structured report that integrates information from all sources
- Use clear headings and sections to organize the content
- Maintain an informative and professional tone
- Connect related concepts across different sources
- Do NOT include a references section (it will be added separately)
- Focus on synthesizing and connecting the information, not just summarizing each source`;

    // Add custom instructions if provided
    if (customInstructions) {
      prompt += `\n\nAdditional Instructions:\n${customInstructions}`;
    }

    prompt += `\n\nSources:
${sourcesText}

Write the report now:`;

    onProgress('Generating report content...', 70);

    const reportContent = await session.prompt(prompt);

    onProgress('Finalizing report...', 90);

    // Create citations
    const citations = processedSources.map(s => ({
      title: s.title,
      url: s.url,
      sourceType: s.sourceType
    }));

    // Add references section
    const referencesSection = '\n\n## References\n\n' +
      citations.map((c, idx) => `${idx + 1}. ${c.title} - ${c.url}`).join('\n');

    const finalReport = reportContent + referencesSection;

    onProgress('Complete', 100);

    return {
      report: finalReport,
      citations,
      metadata: {
        sourceCount: items.length,
        generatedAt: new Date().toISOString(),
        outputLanguage
      }
    };
  } finally {
    if (session.destroy) {
      session.destroy();
    }
  }
}

/**
 * Estimates processing time based on content size and operation
 * @param {number} textLength - Length of text to process
 * @param {string} operation - 'summarize' or 'flashcards'
 * @returns {number} - Estimated seconds
 */
export function estimateProcessingTime(textLength, operation) {
  const baseTime = operation === 'summarize' ? 3 : 8; // seconds per 1000 chars
  return Math.ceil((textLength / 1000) * baseTime);
}
