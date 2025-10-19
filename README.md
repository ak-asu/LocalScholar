# Quizzer

**AI-Powered Study Assistant Chrome Extension**

Quizzer is a Chrome extension that leverages Chrome's built-in AI APIs (Prompt API and Summarizer API) to help you study more effectively. Generate summaries, create flashcards, and build comprehensive reports from web content - all locally in your browser.

## Features

### 📝 Smart Summarization
- Summarize entire web pages or selected text
- Multiple summary types: Key Points, TL;DR, Headline, Teaser
- Customizable length and format (Markdown or Plain Text)
- Multi-language output support (English, Spanish, Japanese, French, German)
- Streaming results for instant feedback
- Intelligent chunking for large documents

### 🎴 Flashcard Generation
- Generate multiple-choice questions from any content
- Adjustable difficulty levels (Easy, Medium, Hard)
- Customizable card count (5, 10, or 15 cards)
- Interactive overlay for reviewing flashcards
- Keyboard navigation support
- Save and manage multiple decks

### 📊 Report Builder
- Collect content from multiple pages
- Generate synthesized reports with citations
- Multi-language report generation
- Export reports for external use
- Manage report history

### ⚙️ Comprehensive Settings
- Feature toggles for all major functions
- AI API configuration options
- Performance tuning (caching, chunk size)
- Data management (export, import, clear)
- Storage usage monitoring

### 🚀 Performance Optimized
- URL + content hash based caching
- Automatic cache expiration
- Efficient multi-chunk processing
- Minimal memory footprint
- Background service worker for efficiency

### ♿ Accessibility First
- WCAG 2.1 AA compliant
- Full keyboard navigation
- Screen reader optimized
- Respects reduced motion preferences
- High contrast support

## Installation

### Prerequisites
- Chrome/Chromium browser (version 128+)
- Chrome Built-in AI features enabled:
  1. Go to `chrome://flags`
  2. Enable "Prompt API for Gemini Nano"
  3. Enable "Summarization API for Gemini Nano"
  4. Enable "Translation API"
  5. Restart Chrome

### Install Extension
1. Clone this repository:
   ```bash
   git clone https://github.com/yourusername/quizzer.git
   ```

2. Open Chrome and navigate to `chrome://extensions`

3. Enable "Developer mode" (toggle in top-right)

4. Click "Load unpacked"

5. Select the `Quizzer` directory

6. The extension should now appear in your toolbar!

## Usage

### Generating Summaries
1. Navigate to any web page
2. Click the Quizzer extension icon
3. Adjust settings if desired (source, type, length)
4. Click "Summarize"
5. View your summary instantly

**Tip**: Select text on a page to summarize just that portion.

### Creating Flashcards
1. Summarize content first (or have text selected)
2. Click "Generate Flashcards"
3. Review cards in the interactive overlay
4. Use keyboard shortcuts:
   - `1-4`: Select answer
   - `Enter`: Submit answer
   - `Arrow keys`: Navigate options
   - `Escape`: Close overlay
5. Save deck for later review

### Building Reports
1. Browse multiple pages with relevant content
2. Click "Add Current Page" to add to queue
3. Repeat for all source pages
4. Select report language
5. Click "Generate Report"
6. View and export synthesized report

### Managing Settings
1. Click the extension icon
2. Click "Settings" button
3. Adjust preferences:
   - Configure summarization and flashcard settings
   - Tune performance options (caching, chunk size)
   - Manage data (export/import/clear cache)

## File Structure

```
Quizzer/
├── manifest.json                   # Extension configuration
├── background/
│   └── service-worker.js           # Background service worker
├── popup/
│   ├── popup.html                  # Main UI (includes settings)
│   ├── popup.js                    # Main logic
│   └── popup.css                   # Popup styles
├── content/
│   ├── content.js                  # Content script (text extraction)
│   └── overlay.css                 # Flashcard overlay styles
├── utils/
│   ├── content-extractor.js        # Content extraction (reference)
│   ├── ai-pipeline.js              # AI processing pipeline
│   ├── ui-helpers.js               # UI utility functions
│   ├── api-checker.js              # API availability checker
│   └── performance.js              # Performance utilities
├── data/
│   └── storage.js                  # Storage & caching management
└── docs/
    ├── 07-implementation-plan-and-structure.md
    ├── accessibility.md            # Accessibility guidelines
    └── performance.md              # Performance guide
```

## Development

### Technology Stack
- **Vanilla JavaScript** (ES modules, no build step)
- **Chrome Extension Manifest V3**
- **Chrome Built-in AI APIs**
  - Prompt API (Gemini Nano)
  - Summarizer API
  - Translation API
- **Chrome Storage API** (local storage)

### Coding Conventions
- ES modules throughout
- No inline scripts/styles (CSP compliant)
- Small, focused modules
- Extensive JSDoc comments
- Graceful error handling

### Testing
1. **Manual Testing**: Test all features in various scenarios
2. **Accessibility**: Use screen reader (NVDA/JAWS/VoiceOver)
3. **Performance**: Chrome DevTools Lighthouse audit
4. **Cross-browser**: Test in Chrome, Edge, Brave

### Contributing
Contributions welcome! Please:
1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## API Requirements

### Chrome Built-in AI APIs
This extension requires experimental Chrome AI features:

**Prompt API (Gemini Nano)**
- Used for flashcard generation
- Required for structured output (MCQ format)
- Enable at: `chrome://flags/#prompt-api-for-gemini-nano`

**Summarizer API**
- Used for content summarization
- Supports streaming for progressive results
- Enable at: `chrome://flags/#summarization-api-for-gemini-nano`

**Translation API**
- Used for multi-language output
- Enable at: `chrome://flags/#translation-api`

**Note**: These are experimental features and may change in future Chrome releases.

## Privacy & Data

### Local Processing
- All AI processing happens locally in your browser
- No data sent to external servers
- No tracking or analytics

### Data Storage
- All data stored locally using Chrome Storage API
- Includes: flashcard decks, reports, collection items, cache
- Export your data anytime via Settings
- Clear all data anytime via Settings

### Permissions
The extension requests these permissions:
- `storage`: Store flashcards, reports, and settings
- `contextMenus`: Add right-click menu options
- `scripting`: Extract content from web pages
- `activeTab`: Access current tab content

## Performance

### Storage Usage
- Flashcard decks: Unlimited (user managed)
- Collection queue: Limited to 200 items
- Reports: Limited to 100 reports
- Cache: Unlimited with expiration

### Memory Footprint
- Content script: ~2MB baseline
- Popup: ~5MB typical usage
- Service worker: ~1MB when active

### Optimization Tips
1. Clear cache periodically (Settings → Clear Cache)
2. Export and archive old decks/reports
3. Adjust chunk size for large documents
4. Enable caching for faster results

## Browser Compatibility

### Supported
- ✅ Chrome 128+ (with AI flags enabled)
- ✅ Chromium 128+
- ✅ Edge 128+ (Chromium-based, with flags)

### Not Supported
- ❌ Firefox (no Chrome AI APIs)
- ❌ Safari (no Chrome AI APIs)
- ❌ Chrome <128 (missing AI APIs)

## Troubleshooting

### AI APIs Not Available
**Problem**: Extension shows "APIs not available" error

**Solution**:
1. Check Chrome version (must be 128+)
2. Enable AI flags at `chrome://flags`
3. Restart Chrome completely
4. Wait for models to download (check `chrome://components`)

### Summarization Fails
**Problem**: Summarization times out or fails

**Solution**:
1. Reduce chunk size in settings
2. Try shorter content first
3. Check if content is too short (<100 words)
4. Clear cache and try again

### Flashcards Won't Generate
**Problem**: Flashcard generation fails

**Solution**:
1. Ensure Prompt API is enabled
2. Check if content is substantial enough
3. Try reducing card count
4. Check console for errors

### Storage Full
**Problem**: "Storage quota exceeded" error

**Solution**:
1. Export important data first
2. Clear cache (Settings → Clear Cache)
3. Delete old decks/reports
4. Consider clearing all data and re-importing

## Roadmap

### Completed ✅
- [x] Core summarization with streaming
- [x] Flashcard generation and review
- [x] Report queue and synthesis
- [x] Multi-language support
- [x] Comprehensive settings
- [x] Caching system
- [x] Data export/import
- [x] Accessibility compliance
- [x] Performance optimization

### Future Enhancements 🚀
- [ ] Spaced repetition for flashcards
- [ ] Custom flashcard templates
- [ ] Collaboration features (share decks)
- [ ] Browser sync support
- [ ] Mobile companion app
- [ ] Advanced citation formats
- [ ] PDF content extraction
- [ ] Audio transcription support

## License

MIT License - See LICENSE file for details

## Acknowledgments

- Built with Chrome's experimental AI APIs
- Uses Gemini Nano for local AI processing
- Inspired by the need for better study tools
- Thanks to the Chrome Extensions team for the APIs

## Support

- **Issues**: Report bugs on GitHub Issues
- **Questions**: Create a GitHub Discussion
- **Security**: Email security@example.com

## Version History

### v0.1.0 (Current)
- Initial release
- All core features implemented
- Full Phase 1-5 completion

---

**Made with ❤️ for students everywhere**
