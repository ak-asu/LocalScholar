# Performance Optimization Guide

Last updated: 2025-10-19

## Overview

This document outlines the performance optimizations implemented in Quizzer and best practices for maintaining optimal performance.

## Implemented Optimizations

### 1. Caching Strategy

**URL + Content Hash Based Caching**
- Summaries and flashcards are cached using a combination of URL and content hash
- Cache expiration configurable (1 hour to never expire)
- Automatic cleanup of expired cache entries
- Reduces redundant API calls for the same content

```javascript
// Cache key format: type_url_contenthash
const key = generateCacheKey(url, hashContent(text), 'summary');
const cached = await getCachedItem(key);
```

**Benefits:**
- Instant results for previously summarized content
- Reduced load on Chrome's AI APIs
- Better offline experience
- Lower battery consumption

### 2. Content Chunking

**Multi-chunk Processing with Summary-of-Summaries**
- Large content split into manageable chunks (default: 4000 characters)
- Each chunk processed independently
- Final summary synthesized from chunk summaries
- Prevents API timeout errors

**Configurable chunk size** (in options):
- 2000 characters (fast, less context)
- 4000 characters (balanced, default)
- 6000 characters (slower, more context)
- 8000 characters (slowest, maximum context)

### 3. Storage Optimization

**Automatic Pruning**
- Flashcard decks: No limit (user manages)
- Collection items: Limited to 200 items (oldest pruned)
- Reports: Limited to 100 reports (oldest pruned)
- Cache: Unlimited, but respects expiration

**Storage Keys Namespacing**
- All storage keys prefixed with `quizzer.`
- Prevents conflicts with other extensions
- Easy to export/import all data

### 4. Memory Management

**Content Script Isolation**
- Minimal memory footprint on web pages
- Content extraction pipeline inlined for efficiency
- No heavy dependencies in content scripts
- Shadow DOM for overlay prevents style leaks

**Background Service Worker**
- Event-driven, only active when needed
- No persistent background processes
- Context menus registered once on install

### 5. Lazy Loading

**Module Loading**
- ES modules load only when needed
- Utility modules imported on-demand
- No bundler overhead (direct module loading)

**UI Components**
- Settings section hidden by default
- Flashcard overlay created on-demand
- Report generation modal only when needed

### 6. API Usage Optimization

**Batching and Throttling**
- Multiple operations batched where possible
- Debouncing for user input (translation, settings)
- Rate limiting to respect API constraints

**Streaming for Summaries**
- Uses Summarizer API streaming
- Progressive display of results
- Better perceived performance
- Can cancel if needed

## Performance Monitoring

### Key Metrics to Track

1. **Extension Load Time**
   - Target: <100ms for popup open
   - Target: <50ms for content script injection

2. **Summarization Time**
   - Single chunk: 2-5 seconds
   - Multi-chunk (3 chunks): 8-15 seconds
   - Cached result: <100ms

3. **Storage Usage**
   - Monitor via options page
   - Alert if approaching quota limits
   - Provide clear cache management

4. **Memory Footprint**
   - Content script: <2MB baseline
   - Popup: <5MB typical
   - Service worker: <1MB when active

### Chrome DevTools Profiling

**To profile the extension:**
1. Open extension popup
2. Right-click → Inspect
3. Navigate to Performance tab
4. Record interaction
5. Analyze flame graph for bottlenecks

**Key areas to check:**
- Script evaluation time
- Layout thrashing
- Long tasks (>50ms)
- Memory leaks

## Best Practices

### Content Extraction
```javascript
// ✅ Good: Efficient text extraction
const text = Array.from(document.querySelectorAll('p, h1, h2, h3'))
  .map(el => el.textContent.trim())
  .filter(t => t.length > 20)
  .join('\n\n');

// ❌ Bad: Includes all text nodes
const text = document.body.innerText;
```

### Storage Operations
```javascript
// ✅ Good: Batch storage operations
await chrome.storage.local.set({
  'quizzer.decks': decks,
  'quizzer.settings': settings
});

// ❌ Bad: Multiple separate writes
await chrome.storage.local.set({ 'quizzer.decks': decks });
await chrome.storage.local.set({ 'quizzer.settings': settings });
```

### Cache Checks
```javascript
// ✅ Good: Check cache first
const cached = await getCachedItem(key);
if (cached) return cached.content;

// Then proceed with API call
const result = await generateSummary(text);
await setCachedItem(key, result);
```

## Optimization Checklist

### Before Release
- [ ] Run Chrome DevTools Lighthouse audit
- [ ] Test with large documents (>50KB)
- [ ] Verify cache expiration works correctly
- [ ] Check memory usage after extended use
- [ ] Profile summarization performance
- [ ] Test on low-end devices
- [ ] Verify no memory leaks

### Regular Maintenance
- [ ] Monitor storage quota usage
- [ ] Review cache hit rates
- [ ] Optimize slow operations (>100ms)
- [ ] Update chunk size recommendations
- [ ] Review and remove unused code

## Known Performance Considerations

### Large Documents
- Documents >100KB are chunked automatically
- Expect longer processing times for large documents
- Consider increasing chunk size for better context

### Multiple Tabs
- Each tab has independent content script
- Memory scales with number of active tabs
- Consider disabling on inactive tabs

### Cache Size
- Large caches can slow initial load
- Recommend clearing cache monthly
- Provide automatic cleanup option

## Future Optimizations

### Planned Improvements
1. **Intelligent Chunking**: Use sentence boundaries instead of character count
2. **Incremental Summaries**: Update summary as chunks complete
3. **Background Processing**: Move heavy operations to service worker
4. **IndexedDB Migration**: For very large datasets
5. **Web Workers**: Parallel processing for multiple chunks
6. **Compression**: Compress cached data to save space

### Under Consideration
- Predictive caching based on browsing patterns
- Shared cache across similar pages
- Progressive summary refinement
- Adaptive chunk sizing based on content type

## Resources

- [Chrome Extension Performance](https://developer.chrome.com/docs/extensions/mv3/performance/)
- [Web Performance Metrics](https://web.dev/metrics/)
- [JavaScript Performance](https://developer.mozilla.org/en-US/docs/Web/Performance)
- [Memory Management](https://developer.chrome.com/docs/devtools/memory-problems/)
