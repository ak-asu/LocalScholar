# Streaming API Support

## Overview

The Chrome AI Summarizer API supports both **batch** and **streaming** modes for summarization. This document describes both approaches and explains why our codebase currently uses batch mode only.

## Current Implementation

**Our codebase uses batch summarization exclusively.** This means:
- The summarization request is sent
- Processing happens server-side
- The complete result is returned when done
- UI shows a progress indicator during processing

## API Modes Comparison

### Batch Summarization (Currently Used)

```javascript
const summarizer = await Summarizer.create({
  type: 'key-points',
  length: 'medium',
  format: 'markdown',
  outputLanguage: 'en'
});

// Returns complete result when done
const summary = await summarizer.summarize(text);
```

**Advantages:**
- Simpler implementation
- Cleaner code flow
- Easier error handling
- No need for incremental UI updates

**Disadvantages:**
- No visual feedback during processing
- Appears slower to users (all-or-nothing)
- Cannot show partial results

### Streaming Summarization (Not Currently Used)

```javascript
const summarizer = await Summarizer.create({
  type: 'key-points',
  length: 'medium',
  format: 'markdown',
  outputLanguage: 'en'
});

// Returns results progressively
const stream = summarizer.summarizeStreaming(text, {
  context: 'Optional context for better results'
});

for await (const chunk of stream) {
  // Each chunk contains the full accumulated text so far
  console.log(chunk); // "Key point 1..." -> "Key point 1... Key point 2..." -> etc.
  updateUI(chunk); // Update display in real-time
}
```

**Advantages:**
- Better user experience - see results appear in real-time
- Feels faster (progressive disclosure)
- Can show partial results immediately
- Natural progress indication

**Disadvantages:**
- More complex implementation
- Requires incremental UI updates
- Need to handle streaming state management
- More edge cases to handle

## How to Implement Streaming (Future Enhancement)

If you want to add streaming support in the future, here's what needs to change:

### 1. Update `ai-pipeline.js`

```javascript
export async function processSummarization(options) {
  const { text, onStreamChunk, ...otherOptions } = options;

  if (onStreamChunk) {
    // Use streaming mode
    const stream = summarizer.summarizeStreaming(text);
    let finalResult = '';

    for await (const chunk of stream) {
      finalResult = chunk;
      onStreamChunk(chunk); // Send to UI
    }

    return { summary: finalResult, metadata: {...} };
  } else {
    // Use batch mode
    const summary = await summarizer.summarize(text);
    return { summary, metadata: {...} };
  }
}
```

### 2. Update `content.js`

```javascript
async function handleSummarize(source) {
  // ... existing code ...

  const result = await processSummarization({
    text,
    type: settings.summaryType,
    length: settings.summaryLength,
    format: settings.summaryFormat,
    outputLanguage: settings.outputLanguage,
    onProgress: (message, percent) => {
      task.updateProgress(percent, message);
    },
    // Add streaming callback
    onStreamChunk: (chunk) => {
      if (overlay) {
        overlay.updateStreamingContent(chunk);
      }
    }
  });

  // ... rest of code ...
}
```

### 3. Update `unified-overlay.js`

```javascript
class LocalScholarOverlay extends HTMLElement {
  // Add new method for streaming updates
  updateStreamingContent(text) {
    // If in progress mode, switch to streaming display
    if (this.mode === 'progress') {
      this.mode = 'streaming';
      this.createStreamingDisplay();
    }

    // Update the content element with latest chunk
    const contentEl = this.shadow.getElementById('streaming-content');
    if (contentEl) {
      contentEl.textContent = text;
      contentEl.scrollTop = contentEl.scrollHeight; // Auto-scroll
    }
  }

  createStreamingDisplay() {
    const wrapper = this.shadow.querySelector('.qz-container');
    wrapper.innerHTML = `
      <div class="qz-card">
        <div class="qz-header">
          <h2 class="qz-title">Summary</h2>
          <button class="qz-close" id="qz-close">×</button>
        </div>
        <div class="qz-body" id="streaming-content"
             style="white-space: pre-wrap; line-height: 1.6;">
          <!-- Content appears here progressively -->
        </div>
      </div>
    `;
    this.setupCloseButton();
  }
}
```

## Important Notes

### Chunk Behavior

- Each chunk from `summarizeStreaming()` contains the **full accumulated text** so far
- It's NOT delta/diff updates - you get the complete result up to that point
- Simply replace the entire content display with each chunk

### Context Parameter

Both modes support an optional `context` parameter:

```javascript
summarizer.summarize(text, {
  context: 'This article is intended for a tech-savvy audience.'
});

summarizer.summarizeStreaming(text, {
  context: 'This article is intended for junior developers.'
});
```

This can improve summarization quality by providing additional context.

### Performance Considerations

- Streaming requires more UI updates (re-rendering on each chunk)
- May cause flickering if not handled properly
- Consider throttling updates (e.g., max 10 updates/second)
- Ensure smooth scrolling performance

## Why We Use Batch Mode

Current decision factors:

1. **Simpler codebase** - Easier to maintain and debug
2. **Adequate UX** - Progress bar provides sufficient feedback
3. **Model speed** - Chrome AI models are fast enough that streaming adds minimal perceived benefit
4. **Development time** - Batch mode was faster to implement
5. **Stability** - Fewer edge cases and race conditions

## When to Consider Streaming

Consider implementing streaming if:

- Users frequently complain about lack of visible progress
- Summarization times increase significantly (>5 seconds)
- You want to provide a more engaging user experience
- You have resources to handle the additional complexity

## References

- [Chrome AI Summarizer API Documentation](https://developer.chrome.com/docs/ai/summarizer-api)
- Official Chrome AI example: https://github.com/GoogleChrome/chrome-extensions-samples/tree/main/functional-samples/ai.summarizer-api

## Related Files

- `utils/ai-pipeline.js` - Main summarization logic
- `content/content.js` - Handles summarization requests
- `content/unified-overlay.js` - Displays results to user
