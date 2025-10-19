# Testing Guide for Quizzer AI Pipeline

## Installation & Setup

1. **Load the extension in Chrome**:
   - Open `chrome://extensions/`
   - Enable "Developer mode"
   - Click "Load unpacked"
   - Select the `Quizzer` directory

2. **Verify Chrome AI support**:
   - Chrome 138+ required
   - Visit `chrome://on-device-internals`
   - Check that models are available or downloadable

3. **Reload after changes**:
   - Click the refresh icon on the extension card
   - Or use Ctrl+R while focused on `chrome://extensions/`

## Testing the Connection Error Fix

### Before Fix
The error "Could not establish connection. Receiving end does not exist" would crash the extension popup.

### After Fix
1. Open extension popup on a chrome:// page (e.g., `chrome://extensions/`)
2. Click "Summarize"
3. Should see: "Cannot access this page. Try reloading the page or use a different tab."
4. ✅ No uncaught error in console

## Testing Content Extraction

### Test 1: Small Article
1. Navigate to a simple blog post or news article
2. Open the extension popup
3. Select "Whole page" as source
4. Click "Summarize"
5. **Expected**: Single-chunk processing, fast summary
6. **Check console**: Should see extraction metadata with `chunkCount: 1`

### Test 2: Large Article
1. Navigate to a long article (e.g., Wikipedia, long blog post)
2. Open the extension popup
3. Select "Whole page"
4. Click "Summarize"
5. **Expected**:
   - Status shows "Processing X chunks..."
   - Intermediate summaries appear during processing
   - Final combined summary displays
   - Status shows "Done. Processed X chunks."
6. **Check console**: Metadata should show `chunkCount > 1`

### Test 3: Selection vs Page
1. Navigate to any article
2. Select some text (highlight with mouse)
3. Open extension popup
4. Select "Selection (if any)" as source
5. Click "Summarize"
6. **Expected**: Only selected text is summarized
7. Change to "Whole page" and summarize again
8. **Expected**: Full page content is summarized

### Test 4: Content with Noise
1. Navigate to a cluttered website (e.g., e-commerce, news site with ads)
2. Open the extension popup
3. Click "Summarize"
4. **Expected**:
   - Main content extracted
   - Ads, navigation, footers excluded
   - Clean summary of actual content

### Test 5: Different Summary Types

Test each summary type:

**Key-points (multi-chunk)**:
- Long article → multiple chunks
- Should see section headings in output
- Each chunk's key points listed separately

**TLDR (multi-chunk)**:
- Long article → multiple chunks
- Should create summary-of-summaries
- Single cohesive paragraph output

**Headline (single chunk)**:
- Short article
- Should produce brief headline

**Teaser (multi-chunk)**:
- Long article → multiple chunks
- Should combine into engaging teaser

## Testing Content Script

### Message Handling

1. Open DevTools on a web page
2. In console, test message:
```javascript
chrome.runtime.sendMessage({type: 'PING'}, response => {
  console.log('Response:', response);
});
```

3. Test enhanced extraction:
```javascript
// Note: This needs to be tested from popup context, not page context
// Just verify content script loads without errors
console.log('Content script loaded');
```

## Console Debugging

### Content Script Console
1. Right-click on page → Inspect
2. Console tab shows content script logs
3. Look for extraction warnings/errors

### Popup Console
1. Right-click extension icon → Inspect popup
2. Console tab shows popup logs
3. Check for:
   - Content extraction results
   - Chunk processing progress
   - API errors or warnings

### Background Service Worker Console
1. Go to `chrome://extensions/`
2. Find Quizzer extension
3. Click "service worker" link
4. Console shows background script logs

## Expected Console Output

### Successful Single-Chunk
```
Enhanced content extraction completed
Metadata: {extractedFrom: "article", chunkCount: 1, ...}
Summarizing...
Done.
```

### Successful Multi-Chunk
```
Enhanced content extraction completed
Metadata: {extractedFrom: "main", chunkCount: 3, ...}
Processing chunk 1/3...
Processing chunk 2/3...
Processing chunk 3/3...
Combining summaries...
Done. Processed 3 chunks.
```

### With Warnings
```
Content warnings: (3)
- Very large content (~15000 tokens). Consider using a more specific selection.
- Could not identify main content area. Results may include navigation or ads.
```

## Error Scenarios to Test

### 1. No Content
- Empty page or very minimal text
- **Expected**: "No readable text found."

### 2. Inaccessible Page
- Chrome internal pages (chrome://, edge://)
- Extension pages
- **Expected**: "Cannot access this page..."

### 3. Content Script Not Loaded
- Test immediately on page load before script initializes
- **Expected**: Graceful error with retry suggestion

### 4. API Unavailable
- Test on browser without AI support
- **Expected**: "Summarizer API not supported..." or "Summarizer unavailable..."

## Manual Testing Checklist

- [ ] Connection error is handled gracefully
- [ ] Small articles process in single chunk
- [ ] Large articles split into multiple chunks
- [ ] Chunk summaries display during processing
- [ ] Summary-of-summaries works for tldr/teaser/headline
- [ ] Key-points shows section headings
- [ ] Selection extraction works
- [ ] Page extraction works
- [ ] Content validation catches too-short content
- [ ] Warnings display in console for edge cases
- [ ] All summary types work (tldr, key-points, headline, teaser)
- [ ] All lengths work (short, medium, long)
- [ ] Both formats work (markdown, plain-text)
- [ ] Translation feature still works
- [ ] Status messages are clear and helpful

## Performance Testing

### Benchmark Test
1. Find a Wikipedia article (medium-long)
2. Note page character count (inspect console for metadata)
3. Time the summarization process
4. **Expected**:
   - Small (<5,000 chars): 2-5 seconds
   - Medium (5,000-20,000 chars): 5-15 seconds
   - Large (>20,000 chars): 15-30 seconds

### Memory Test
1. Summarize multiple very long articles in sequence
2. Check Chrome Task Manager (Shift+Esc)
3. **Expected**: Memory should not continuously grow

## Automated Testing (Future)

Consider adding:
- Unit tests for content-extractor.js functions
- Integration tests for popup ↔ content script messaging
- E2E tests with Playwright or Puppeteer

## Troubleshooting

### "Cannot access this page" Error
- **Cause**: Content script can't run on this page type (chrome://, file://, etc.)
- **Fix**: Navigate to a regular web page (http:// or https://)
- **Test**: Try a news website or Wikipedia article

### Extension Not Loading After Changes
1. Go to `chrome://extensions/`
2. Find Quizzer extension
3. Click the refresh/reload icon
4. Or remove and re-add the extension
5. Check for errors in the extension card

### Content Script Not Responding
**Symptoms**: "Cannot access this page. Try reloading..." on normal websites

**Fixes**:
1. **Reload the page**: Press F5 or Ctrl+R
2. **Check console**: Right-click page → Inspect → Console tab
3. **Look for errors**: Content script errors appear in page console
4. **Verify manifest**: Ensure `content/content.js` is listed in manifest
5. **Check file exists**: Verify `content/content.js` file is present

**Debug Steps**:
```javascript
// In page console, check if content script loaded:
chrome.runtime.sendMessage({type: 'PING'}, response => {
  console.log('Extension alive:', response);
});
```

### No Chunks Created Despite Large Content
- **Check**: Console for extraction metadata
- **Verify**: Content length (should be >10,000 chars)
- **Debug**: Open popup console (right-click extension icon → Inspect popup)

### Summaries Seem Incomplete
- **Check**: Original content quality
- **Verify**: Noise removal isn't too aggressive
- **Try**: Use selection instead of full page
- **Check**: Warnings in console about main content detection

### Slow Processing
- **Check**: Number of chunks (console metadata)
- **Verify**: API model downloaded at `chrome://on-device-internals`
- **Try**: Smaller selection or shorter content
- **Expected**: 2-5 seconds per chunk

### ES Module Errors
**Symptom**: Import errors in console

**Fix**: Content script uses **inlined code** (no imports). If you see import errors:
1. Check `content/content.js` - should NOT have `import` statements
2. Check `manifest.json` - content script should NOT have `"type": "module"`
3. Popup can use ES modules (that's OK)

### Popup Console Shows Errors
1. Right-click extension icon
2. Select "Inspect popup"
3. Check Console tab for errors
4. Look for:
   - API availability issues
   - Content extraction errors
   - Summarizer creation failures

## Reporting Issues

When reporting issues, include:
1. Browser version (chrome://version/)
2. Extension version (from manifest.json)
3. Test page URL
4. Console output (both popup and content script)
5. Expected vs actual behavior
6. Screenshots if relevant
