/**
 * AI Processing Pipeline
 *
 * Coordinates AI processing for content extraction, chunking, and summary-of-summaries.
 * Handles both Summarizer API and Prompt API for various use cases.
 */

import { extractContent, validateContent, estimateTokens } from './content-extractor.js';

/**
 * Pipeline configuration
 */
const PIPELINE_CONFIG = {
  // Maximum size before forcing chunking
  MAX_SINGLE_PROCESS_SIZE: 8000,
  // Strategy for combining chunk summaries
  COMBINATION_STRATEGY: 'hierarchical', // 'hierarchical' or 'concatenate'
};

/**
 * Processes content through summarization with automatic chunking
 * @param {Object} options - Processing options
 * @param {string} options.source - 'selection' or 'page'
 * @param {string} options.type - Summarizer type (tldr, key-points, etc.)
 * @param {string} options.length - Summarizer length (short, medium, long)
 * @param {string} options.format - Summarizer format (markdown, plain-text)
 * @param {string} options.outputLanguage - Output language code
 * @param {Function} options.onProgress - Progress callback (message, percent)
 * @param {Function} options.onChunkComplete - Called after each chunk is processed
 * @returns {Object} - { summary: string, metadata: object }
 */
export async function processSummarization(options) {
  const {
    source = 'page',
    type = 'key-points',
    length = 'medium',
    format = 'markdown',
    outputLanguage = 'en',
    onProgress = () => {},
    onChunkComplete = () => {}
  } = options;

  onProgress('Extracting content...', 5);

  // Extract and validate content
  const extraction = extractContent(source, {
    maxChunkSize: PIPELINE_CONFIG.MAX_SINGLE_PROCESS_SIZE
  });

  const validation = validateContent(extraction);
  if (!validation.valid) {
    throw new Error(validation.reason);
  }

  // Emit warnings if any
  validation.warnings.forEach(warning => {
    console.warn('Content validation warning:', warning);
  });

  const { chunks, metadata } = extraction;

  onProgress(`Processing ${chunks.length} chunk(s)...`, 10);

  // Check Summarizer availability
  if (!('Summarizer' in self)) {
    throw new Error('Summarizer API not supported in this browser');
  }

  const availability = await Summarizer.availability();
  if (availability === 'unavailable') {
    throw new Error('Summarizer unavailable on this device');
  }

  // If single chunk, process directly
  if (chunks.length === 1) {
    onProgress('Summarizing content...', 20);
    const summary = await summarizeChunk(chunks[0].text, {
      type,
      length,
      format,
      outputLanguage,
      onProgress: (percent) => onProgress('Summarizing...', 20 + percent * 0.7)
    });

    return {
      summary,
      metadata: {
        ...metadata,
        processingMode: 'single',
        chunkCount: 1,
        tokens: estimateTokens(chunks[0].text)
      }
    };
  }

  // Multiple chunks - process each and combine
  onProgress(`Summarizing ${chunks.length} chunks...`, 20);

  const chunkSummaries = [];
  const progressPerChunk = 60 / chunks.length;

  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i];
    const baseProgress = 20 + (i * progressPerChunk);

    onProgress(`Summarizing chunk ${i + 1}/${chunks.length}...`, baseProgress);

    const chunkSummary = await summarizeChunk(chunk.text, {
      type,
      length: 'short', // Use shorter summaries for chunks
      format,
      outputLanguage,
      onProgress: (percent) => onProgress(
        `Summarizing chunk ${i + 1}/${chunks.length}...`,
        baseProgress + percent * progressPerChunk
      )
    });

    chunkSummaries.push({
      summary: chunkSummary,
      index: i,
      sections: chunk.metadata.sections
    });

    onChunkComplete(i + 1, chunks.length, chunkSummary);
  }

  // Combine summaries
  onProgress('Combining summaries...', 85);

  const finalSummary = await combineSummaries(chunkSummaries, {
    type,
    length,
    format,
    outputLanguage,
    originalMetadata: metadata
  });

  onProgress('Complete', 100);

  return {
    summary: finalSummary,
    metadata: {
      ...metadata,
      processingMode: 'chunked',
      chunkCount: chunks.length,
      combinationStrategy: PIPELINE_CONFIG.COMBINATION_STRATEGY
    }
  };
}

/**
 * Summarizes a single chunk of text
 * @param {string} text - Text to summarize
 * @param {Object} options - Summarization options
 * @returns {string} - Summary text
 */
async function summarizeChunk(text, options) {
  const {
    type = 'key-points',
    length = 'medium',
    format = 'markdown',
    outputLanguage = 'en',
    onProgress = () => {}
  } = options;

  const summarizer = await Summarizer.create({
    type,
    length,
    format,
    outputLanguage,
    monitor(m) {
      m.addEventListener('downloadprogress', (e) => {
        onProgress(e.loaded);
      });
    }
  });

  try {
    // Use streaming for better UX
    const stream = summarizer.summarizeStreaming(text, {
      context: 'Audience: general web reader.'
    });

    let result = '';
    for await (const chunk of stream) {
      result = chunk; // Each chunk contains the accumulated text
    }

    return result;
  } finally {
    // Clean up
    if (summarizer.destroy) {
      summarizer.destroy();
    }
  }
}

/**
 * Combines multiple chunk summaries into a final summary
 * @param {Array} chunkSummaries - Array of chunk summaries
 * @param {Object} options - Combination options
 * @returns {string} - Combined summary
 */
async function combineSummaries(chunkSummaries, options) {
  const {
    type = 'key-points',
    length = 'medium',
    format = 'markdown',
    outputLanguage = 'en',
    originalMetadata = {}
  } = options;

  // Strategy 1: Simple concatenation with headers (for key-points)
  if (type === 'key-points' || PIPELINE_CONFIG.COMBINATION_STRATEGY === 'concatenate') {
    let combined = '';
    if (format === 'markdown') {
      combined = chunkSummaries.map((cs, idx) => {
        const heading = cs.sections?.[0] || `Part ${idx + 1}`;
        return `### ${heading}\n\n${cs.summary}`;
      }).join('\n\n');
    } else {
      combined = chunkSummaries.map((cs, idx) => {
        const heading = cs.sections?.[0] || `Part ${idx + 1}`;
        return `${heading}\n${cs.summary}`;
      }).join('\n\n');
    }
    return combined;
  }

  // Strategy 2: Hierarchical - summarize the summaries (for tldr, teaser, headline)
  const combinedText = chunkSummaries.map(cs => cs.summary).join('\n\n');

  // If the combined summaries are short enough, summarize them again
  if (estimateTokens(combinedText) < 8000) {
    return await summarizeChunk(combinedText, {
      type,
      length,
      format,
      outputLanguage
    });
  }

  // If still too large, fall back to concatenation
  return combinedText;
}

/**
 * Processes flashcard generation from content
 * @param {Object} options - Processing options
 * @param {string} options.source - 'selection' or 'page'
 * @param {number} options.count - Number of flashcards to generate
 * @param {string} options.difficulty - 'easy', 'medium', 'hard'
 * @param {string} options.outputLanguage - Output language code
 * @param {Function} options.onProgress - Progress callback
 * @returns {Object} - { flashcards: array, metadata: object }
 */
export async function processFlashcardGeneration(options) {
  const {
    source = 'page',
    count = 5,
    difficulty = 'medium',
    outputLanguage = 'en',
    onProgress = () => {}
  } = options;

  onProgress('Extracting content...', 5);

  // Extract content (flashcards work better with smaller chunks)
  const extraction = extractContent(source, {
    maxChunkSize: 6000 // Smaller chunks for flashcards
  });

  const validation = validateContent(extraction);
  if (!validation.valid) {
    throw new Error(validation.reason);
  }

  onProgress('Preparing flashcard generation...', 10);

  // Check Prompt API availability
  if (!('LanguageModel' in self)) {
    throw new Error('Prompt API (LanguageModel) not supported in this browser');
  }

  const availability = await LanguageModel.availability();
  if (availability === 'unavailable') {
    throw new Error('Language Model unavailable on this device');
  }

  const { chunks, metadata } = extraction;

  // For flashcards, we'll generate from each chunk and combine
  const flashcardsPerChunk = Math.ceil(count / chunks.length);
  const allFlashcards = [];

  onProgress(`Generating flashcards from ${chunks.length} section(s)...`, 20);

  const progressPerChunk = 70 / chunks.length;

  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i];
    const baseProgress = 20 + (i * progressPerChunk);

    onProgress(`Generating flashcards ${i + 1}/${chunks.length}...`, baseProgress);

    const chunkFlashcards = await generateFlashcardsFromChunk(chunk.text, {
      count: flashcardsPerChunk,
      difficulty,
      outputLanguage
    });

    allFlashcards.push(...chunkFlashcards);

    // Stop if we have enough
    if (allFlashcards.length >= count) {
      break;
    }
  }

  onProgress('Finalizing flashcards...', 95);

  // Trim to requested count
  const finalFlashcards = allFlashcards.slice(0, count);

  onProgress('Complete', 100);

  return {
    flashcards: finalFlashcards,
    metadata: {
      ...metadata,
      requestedCount: count,
      generatedCount: finalFlashcards.length,
      difficulty,
      outputLanguage
    }
  };
}

/**
 * Generates flashcards from a text chunk using Prompt API
 * @param {string} text - Text to generate flashcards from
 * @param {Object} options - Generation options
 * @returns {Array} - Array of flashcard objects
 */
async function generateFlashcardsFromChunk(text, options) {
  const {
    count = 5,
    difficulty = 'medium',
    outputLanguage = 'en'
  } = options;

  // Create session with structured output
  const session = await LanguageModel.create({
    temperature: 0.7,
    topK: 40,
    outputLanguage,
    systemPrompt: 'You are a skilled educator. Generate high-quality multiple-choice questions (MCQ) from the provided text.',
    responseConstraint: {
      type: 'json-schema',
      schema: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            question: { type: 'string', description: 'The question text' },
            options: {
              type: 'array',
              items: { type: 'string' },
              minItems: 4,
              maxItems: 4,
              description: 'Four answer options'
            },
            answer: {
              type: 'integer',
              minimum: 0,
              maximum: 3,
              description: 'Index of correct answer (0-3)'
            },
            explanation: {
              type: 'string',
              description: 'Brief explanation of the correct answer'
            }
          },
          required: ['question', 'options', 'answer']
        }
      }
    }
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

Text:
${text}`;

    const result = await session.prompt(prompt);

    // Parse the JSON response
    let flashcards = [];
    try {
      flashcards = JSON.parse(result);
    } catch (parseError) {
      console.error('Failed to parse flashcard JSON:', parseError);
      // Try to extract JSON from the response
      const jsonMatch = result.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        flashcards = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('Failed to generate valid flashcards');
      }
    }

    return flashcards;
  } finally {
    // Clean up session
    if (session.destroy) {
      session.destroy();
    }
  }
}

/**
 * Estimates processing time based on content size and operation
 * @param {Object} extraction - Content extraction result
 * @param {string} operation - 'summarize' or 'flashcards'
 * @returns {number} - Estimated seconds
 */
export function estimateProcessingTime(extraction, operation) {
  const { metadata } = extraction;
  const baseTime = operation === 'summarize' ? 2 : 5; // seconds per chunk
  return baseTime * (metadata.chunkCount || 1);
}

// Export configuration for customization
export { PIPELINE_CONFIG };
