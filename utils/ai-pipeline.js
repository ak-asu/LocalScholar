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

  // Ensure outputLanguage is always set (safety check)
  const safeOutputLanguage = outputLanguage || 'en';

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
    throw new Error('Summarizer API not supported in this browser. Enable "Optimization Guide On Device Model" in chrome://flags and restart Chrome');
  }

  const availability = await Summarizer.availability();
  console.log('[Quizzer] Summarizer.availability() returned:', availability);

  // Availability states: 'available', 'downloadable', 'unavailable'
  if (availability === 'unavailable') {
    throw new Error('Summarizer unavailable on this device');
  }

  if (availability === 'downloadable') {
    onProgress('Summarizer model will download on first use...', 12);
  }

  // If single chunk, process directly
  if (chunks.length === 1) {
    onProgress('Summarizing content...', 20);
    const summary = await summarizeChunk(chunks[0].text, {
      type,
      length,
      format,
      outputLanguage: safeOutputLanguage,
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
      outputLanguage: safeOutputLanguage,
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
    outputLanguage: safeOutputLanguage,
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
async function summarizeChunk(text, options = {}) {
  const {
    type = 'key-points',
    length = 'medium',
    format = 'markdown',
    outputLanguage = 'en',
    onProgress = () => {}
  } = options;

  // Ensure outputLanguage is always set to a valid value - never undefined
  const safeOutputLanguage = outputLanguage || 'en';

  // Build create options explicitly to ensure outputLanguage is included
  const createOptions = {
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

  console.log('[Quizzer] Summarizer.create() called with:', createOptions);
  console.log('[Quizzer] outputLanguage value:', safeOutputLanguage, 'type:', typeof safeOutputLanguage);

  const summarizer = await Summarizer.create(createOptions);

  try {
    console.log('[Quizzer] Starting summarization with text length:', text.length);

    // Use streaming for better UX
    // Second parameter is an options object with optional 'context' field
    const stream = summarizer.summarizeStreaming(text, {
      context: 'This article is intended for a general web audience.'
    });

    let result = '';
    let chunkCount = 0;
    let longestChunk = '';

    for await (const chunk of stream) {
      chunkCount++;

      // Keep track of the longest chunk (which should be the accumulated text)
      if (chunk.length > longestChunk.length) {
        longestChunk = chunk;
      }

      // Log every 20th chunk and the last few
      if (chunkCount % 20 === 0 || chunkCount > 105) {
        console.log(`[Quizzer] Chunk ${chunkCount}, length: ${chunk.length}, content: "${chunk.substring(0, 50)}..."`);
      }

      result = chunk; // Each chunk should contain the full accumulated text
    }

    // If final chunk is empty but we have a longer one, use it
    if (result.length === 0 && longestChunk.length > 0) {
      console.warn('[Quizzer] Final chunk was empty, using longest chunk instead');
      result = longestChunk;
    }

    console.log('[Quizzer] Summarization complete, total chunks:', chunkCount, 'final length:', result.length);
    console.log('[Quizzer] Final summary preview:', result.substring(0, 100));
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

  // Check Prompt API (LanguageModel) availability - per Chrome AI documentation
  if (!('LanguageModel' in self)) {
    throw new Error('Prompt API not available. Enable "Optimization Guide On Device Model" in chrome://flags and restart Chrome');
  }

  const availability = await LanguageModel.availability();
  if (availability !== 'available') {
    throw new Error('Language Model unavailable on this device');
  }

  onProgress('Language Model ready...', 15);

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

  // Create session with LanguageModel API
  const session = await LanguageModel.create({
    temperature: 0.7,
    topK: 40,
    initialPrompts: [
      {
        role: 'system',
        content: 'You are a skilled educator. Generate high-quality multiple-choice questions (MCQ) from the provided text in valid JSON format.'
      }
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

    console.log('[Quizzer] Raw flashcard response:', result);

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
        console.warn(`[Quizzer] Card ${idx + 1}: Converting answer from ${card.answer} to ${card.answer - 1} (1-indexed to 0-indexed)`);
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
      const summary = await summarizeChunk(source.content, {
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
