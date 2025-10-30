# LocalScholar

**Privacy-First AI Study Assistant Chrome Extension**

LocalScholar is a Chrome extension that leverages Chrome's built-in AI APIs (Prompt API, Summarizer API, Translator API, Rewriter API, and Proofreader API) to help you study more effectively. Generate summaries, create flashcards, build comprehensive reports, translate text, proofread content, and rewrite with different tones - all processed locally in your browser with complete privacy.

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
- Custom instructions for personalized report style
- Multi-language report generation
- Automatic references section with source links
- Export reports for external use
- Manage report history

### 🌍 Translation (Translator API)
- Translate selected text to 10+ languages
- Side-by-side original and translated text display
- Instant overlay display (no history saved)
- Supports: English, Spanish, Japanese, French, German, Chinese, Korean, Italian, Portuguese, Russian, and more

### ✏️ Proofreading (Proofreader API)
- Grammar and spelling correction for selected text
- Detailed corrections list with explanations
- Shows original, corrected text, and error details
- Overlay display (no history saved)
- Requires Chrome 141+ and origin trial enrollment

### 🔄 Rewriting (Rewriter API)
- Rewrite selected text with configurable options
- Adjust tone: more formal, as-is, or more casual
- Adjust length: shorter, as-is, or longer
- Adjust format: as-is, markdown, or plain text
- Side-by-side original and rewritten text
- Overlay display (no history saved)
- Requires Chrome 137+ and origin trial enrollment

### ⚙️ Comprehensive Settings
- Summary settings: type, length, format, output language
- Flashcard settings: count, difficulty, language
- Translation target language configuration
- Rewriter settings: tone, length, format
- Performance tuning: caching, expiration, chunk size
- Data management: export, import, clear cache
- Auto-generation toggles
- All settings unified in popup (no separate options page)

### 🎯 Task Management System
- Background processing with progress overlays
- Multiple concurrent tasks across tabs
- Duplicate prevention via content hashing
- Learning time estimation algorithm
- Draggable, cancellable progress indicators
- Real-time status updates

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
- Chrome/Chromium browser (version 138+; some APIs require 137+ or 141+ — see `docs/09-ai-apis-research.md`)
- Chrome Built-in AI features enabled:
  1. Go to `chrome://flags`
  2. Enable "Prompt API for Gemini Nano" (`#prompt-api-for-gemini-nano`)
  3. Enable "Summarization API for Gemini Nano" (`#summarization-api-for-gemini-nano`)
  4. Enable "Translation API" (`#translation-api`)
  5. (Optional) Enable "Rewriter API" and "Proofreader API" if enrolled in origin trial
  6. Restart Chrome

**Important Notes**:
- Rewriter API requires Chrome 137+ and origin trial enrollment
- Proofreader API requires Chrome 141+ and origin trial enrollment
- Models download automatically on first use (requires user gesture and ~22GB disk space)
- Hardware requirements: 4GB+ VRAM (GPU) or 16GB+ RAM with 4+ cores (CPU)
- See `docs/09-ai-apis-research.md` for complete API details and origin trial setup

### Install Extension
1. Clone this repository:
   ```bash
   git clone https://github.com/yourusername/localscholar.git
   ```

2. Open Chrome and navigate to `chrome://extensions`

3. Enable "Developer mode" (toggle in top-right)

4. Click "Load unpacked"

5. Select the `LocalScholar` directory

6. The extension should now appear in your toolbar!

## Usage

### Context Menu Actions (6 items)

Right-click on any page to access:
1. **LocalScholar: Summarize** - Summarize selection or full page
2. **LocalScholar: Create Flashcards** - Generate MCQ flashcards from selection or page
3. **LocalScholar: Add to Report Queue** - Collect content for report synthesis
4. **LocalScholar: Translate Selection** - Translate selected text (overlay display)
5. **LocalScholar: Proofread Selection** - Check grammar/spelling (requires Chrome 141+)
6. **LocalScholar: Rewrite Selection** - Rewrite with configured tone/length/format (requires Chrome 137+)

**Selection-aware**: If text is selected, actions operate on selection; otherwise on full page (for Summarize, Flashcards, Add to Queue).

### Generating Summaries
1. Navigate to any web page
2. Right-click → **LocalScholar: Summarize** (or use extension popup)
3. View streaming results in overlay
4. Summary automatically saved to history

**Options** (via Settings):
- Type: Key Points, TL;DR, Headline, Teaser
- Length: Short, Medium, Long
- Format: Markdown, Plain Text
- Output Language: 10+ languages supported

**Tip**: Select text on a page to summarize just that portion.

### Creating Flashcards
1. Right-click on page or selection → **LocalScholar: Create Flashcards**
2. Review cards in interactive overlay
3. Use keyboard shortcuts:
   - `1-4`: Select answer
   - `Enter`: Submit answer
   - `Arrow keys`: Navigate options
   - `Escape`: Close overlay
4. Deck automatically saved to history

**Options** (via Settings):
- Count: 5, 10, or 15 cards
- Difficulty: Easy, Medium, Hard
- Language: 10+ languages supported

### Building Reports
1. Browse multiple pages with relevant content
2. Right-click → **LocalScholar: Add to Report Queue** on each page
3. Open extension popup → Reports section
4. Enter custom instructions (optional) in textarea
5. Click "Generate Report from Queue"
6. View synthesized report with citations and references

**Custom Instructions**: Add your own style, audience, or formatting preferences to personalize reports.

### Translating Text
1. Select text on any page
2. Right-click → **LocalScholar: Translate Selection**
3. View original and translated text side-by-side in overlay
4. Result displayed instantly (not saved to history)

**Target Language**: Configure in Settings (default: Spanish; 10+ languages available)

### Proofreading Text
1. Select text on any page
2. Right-click → **LocalScholar: Proofread Selection**
3. View original, corrected text, and detailed corrections list
4. Each correction includes explanation and type
5. Result displayed in overlay (not saved to history)

**Requirements**: Chrome 141+ and origin trial enrollment

### Rewriting Text
1. Select text on any page
2. Right-click → **LocalScholar: Rewrite Selection**
3. View original and rewritten text side-by-side
4. Adjust settings for tone, length, and format (in Settings)
5. Result displayed in overlay (not saved to history)

**Options** (via Settings):
- Tone: More Formal, As-Is, More Casual
- Length: Shorter, As-Is, Longer
- Format: As-Is, Markdown, Plain Text

**Requirements**: Chrome 137+ and origin trial enrollment

### Managing Settings
1. Click the extension icon → **Settings** tab
2. Adjust preferences:
   - **Summary**: type, length, format, output language
   - **Flashcards**: count, difficulty, language
   - **Translation**: target language
   - **Rewriter**: tone, length, format
   - **Performance**: caching, expiration, chunk size
   - **Data Management**: export, import, clear cache
3. Settings auto-save on change

## File Structure

```
LocalScholar/
├── manifest.json                   # Extension configuration (MV3)
├── background/
│   └── service-worker.js           # 6 context menu items, message routing
├── popup/
│   ├── popup.html                  # Main UI with unified settings
│   ├── popup.js                    # Popup logic, report generation
│   └── popup.css                   # Popup styles with modal dialogs
├── content/
│   ├── content-loader.js           # Module loader for content script
│   ├── content.js                  # Main content script (6 action handlers)
│   ├── task-manager.js             # Task tracking, duplicate prevention
│   ├── unified-overlay.js          # Unified overlay (progress + results)
│   └── overlay.css                 # Overlay styles
├── utils/
│   ├── content-extractor.js        # Content extraction, cleanup, chunking (reference)
│   ├── ai-pipeline.js              # AI processing (summaries, flashcards, reports)
│   ├── timing-estimator.js         # Learning time estimation system
│   ├── api-checker.js              # API availability checker
│   ├── ui-helpers.js               # UI utility functions
│   └── performance.js              # Performance utilities
├── data/
│   └── storage.js                  # Storage & caching management
└── docs/
    ├── 01-requirements-and-scope.md
    ├── 02-architecture.md
    ├── 03-data-model-and-storage.md
    ├── 04-permissions-and-capabilities.md
    ├── 05-ux-flows.md
    ├── 06-ai-prompts-and-strategy.md
    ├── 07-implementation-plan-and-structure.md
    ├── 08-risks-and-mitigations.md
    ├── 09-ai-apis-research.md       # Comprehensive API documentation
    ├── accessibility.md              # Accessibility guidelines
    ├── chrome-colors.md
    ├── performance.md                # Performance guide
    ├── streaming-api-support.md
    └── TESTING.md                    # Testing documentation
```

## Development

### Technology Stack
- **Vanilla JavaScript** (ES modules, no build step)
- **Chrome Extension Manifest V3**
- **Chrome Built-in AI APIs** (all local, no cloud inference)
  - **Prompt API (LanguageModel)** - Flashcard generation, report synthesis
  - **Summarizer API** - Content summarization with streaming
  - **Translator API** - Multi-language translation
  - **Rewriter API** (Origin Trial) - Text rewriting with tone/length/format control
  - **Proofreader API** (Origin Trial) - Grammar and spelling correction
- **Chrome Storage API** (chrome.storage.local for persistence)

**AI execution contexts:** AI API calls must be executed from document contexts (popup, options page, content scripts, or an offscreen document). The background service worker must not call AI APIs directly — route and coordinate via messaging instead.

**Correct API Namespaces:** Use global objects `LanguageModel`, `Summarizer`, `Translator`, `Rewriter`, `Proofreader` (not `self.ai.languageModel` or `window.ai`).

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
This extension uses Chrome's built-in AI features:

**Prompt API (LanguageModel) - Stable in Chrome 138+**
- Used for: Flashcard generation, report synthesis
- Supports: Structured output (JSON Schema), streaming
- Enable at: `chrome://flags/#prompt-api-for-gemini-nano`
- Global namespace: `LanguageModel`

**Summarizer API - Stable in Chrome 138+**
- Used for: Content summarization
- Supports: Streaming, multiple types (key-points, tldr, teaser, headline)
- Enable at: `chrome://flags/#summarization-api-for-gemini-nano`
- Global namespace: `Summarizer`

**Translator API - Stable in Chrome 138+**
- Used for: Multi-language translation
- Supports: 10+ language pairs
- Enable at: `chrome://flags/#translation-api`
- Global namespace: `Translator`

**Rewriter API - Origin Trial (Chrome 137-148)**
- Used for: Text rewriting with tone/length/format control
- Requires: Origin trial enrollment (see Google's Generative AI origin trial)
- Enable at: `chrome://flags/#rewriter-api`
- Global namespace: `Rewriter`

**Proofreader API - Origin Trial (Chrome 141+)**
- Used for: Grammar and spelling correction
- Requires: Origin trial enrollment (see Google's Generative AI origin trial)
- Enable at: `chrome://flags/#proofreader-api`
- Global namespace: `Proofreader`

**Note**: Stable APIs (Prompt, Summarizer, Translator) are available in Chrome 138+. Origin trial APIs (Rewriter, Proofreader) require enrollment and may change before becoming stable.

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
- ✅ Chrome 138+ (core features: Prompt, Summarizer, Translator)
- ✅ Chrome 137+ (Rewriter API with origin trial)
- ✅ Chrome 141+ (Proofreader API with origin trial)
- ✅ Chromium 138+ (with AI flags enabled)
- ✅ Edge 138+ (Chromium-based, with flags)

### Not Supported
- ❌ Firefox (no Chrome AI APIs)
- ❌ Safari (no Chrome AI APIs)
- ❌ Chrome <138 (missing stable AI APIs)
- ❌ Android/iOS (Chrome AI APIs not available on mobile)

## Troubleshooting

### AI APIs Not Available
**Problem**: Extension shows "APIs not available" error

**Solution**:
1. Check Chrome version (must be 138+ for core features)
2. Enable required AI flags at `chrome://flags`:
   - `#prompt-api-for-gemini-nano`
   - `#summarization-api-for-gemini-nano`
   - `#translation-api`
3. Restart Chrome completely
4. Wait for models to download on first use (check `chrome://on-device-internals`)
5. Check hardware requirements: 4GB+ VRAM or 16GB+ RAM, 22GB free disk space

### Summarization Fails
**Problem**: Summarization times out or fails

**Solution**:
1. Content too short: Ensure at least 100 characters
2. Content too long: Extension automatically chunks large content
3. Adjust chunk size in Settings → Performance (default: 10,000 chars)
4. Clear cache (Settings → Clear Cache) and try again
5. Check console for specific error messages

### Flashcards Won't Generate
**Problem**: Flashcard generation fails

**Solution**:
1. Ensure Prompt API (LanguageModel) is enabled
2. Check if content is substantial enough (minimum ~200 words recommended)
3. Try reducing card count in Settings
4. Content may be too technical or lack clear concepts
5. Check browser console for JSON parsing errors

### Translation/Rewriting/Proofreading Not Working
**Problem**: These features are unavailable or fail

**Solution**:
1. **Translation**: Requires Chrome 138+, enable `#translation-api` flag
2. **Rewriter**: Requires Chrome 137+ and origin trial enrollment
3. **Proofreader**: Requires Chrome 141+ and origin trial enrollment
4. Check API availability: Open console and run `'Translator' in self` (or `'Rewriter'`, `'Proofreader'`)
5. For origin trial APIs, enroll at Google's Generative AI trial page

### Origin Trial Enrollment
**Problem**: Rewriter or Proofreader APIs not available

**Solution**:
1. Visit Google's Chrome Origin Trials page
2. Enroll in "Built-in AI APIs" or "Generative AI" trial
3. Get origin trial token
4. Add token to `manifest.json` (see `docs/09-ai-apis-research.md`)
5. Reload extension

### Storage Full
**Problem**: "Storage quota exceeded" error

**Solution**:
1. Export important data first (Settings → Export Data)
2. Clear cache (Settings → Clear Cache)
3. Delete old decks/reports from History tab
4. Check storage usage in Settings
5. Consider clearing all data and re-importing essentials

### Context Menu Not Appearing
**Problem**: Right-click menu doesn't show LocalScholar options

**Solution**:
1. Refresh the page (context script injection)
2. Check if page is restricted (chrome://, browser settings pages)
3. Extension may not have permissions on some sites
4. Try reloading the extension in `chrome://extensions`

### Progress Overlay Stuck
**Problem**: Task shows progress but never completes

**Solution**:
1. Click "Cancel" button on overlay
2. Refresh the page
3. Check browser console for errors
4. Task may have timed out (check `chrome://on-device-internals` for model status)
5. Try clearing cache and retrying

## Roadmap

### Phase 1-5: Complete ✅
- [x] Core summarization with streaming
- [x] Multi-chunk processing with summary-of-summaries
- [x] Flashcard generation and review
- [x] Report queue and synthesis with custom instructions
- [x] Multi-language support (10+ languages)
- [x] Translation API integration (selected text)
- [x] Proofreading API integration (grammar/spelling)
- [x] Rewriting API integration (tone/length/format)
- [x] Task management with duplicate prevention
- [x] Progress overlays with time estimation
- [x] Unified overlay system for all results
- [x] 6 context menu items (selection-aware)
- [x] Comprehensive unified settings
- [x] URL+hash caching system
- [x] Data export/import
- [x] Modal dialogs (no alerts)
- [x] Accessibility compliance (WCAG 2.1 AA)
- [x] Performance optimization
- [x] Comprehensive documentation

### Future Enhancements 🚀
- [ ] Spaced repetition algorithm for flashcards
- [ ] Custom flashcard templates
- [ ] Collaboration features (share decks/reports)
- [ ] Chrome Sync support for cross-device
- [ ] Side panel view for extended workflow
- [ ] Advanced citation formats (APA, MLA, Chicago)
- [ ] PDF content extraction
- [ ] Audio transcription support (when API available)
- [ ] Batch processing for multiple pages
- [ ] Custom AI prompts and templates
- [ ] Export to Anki/Quizlet formats

## License

MIT License - See LICENSE file for details

## Acknowledgments

- Built with Chrome's built-in AI APIs (Prompt, Summarizer, Translator, Rewriter, Proofreader)
- Uses Gemini Nano for local AI processing (no cloud inference)
- Inspired by the need for privacy-first, offline-capable study tools
- Thanks to the Chrome Extensions team and AI Platform team for making these APIs available
- Special thanks to the open source community for feedback and testing

## Support

- **Issues**: Report bugs on GitHub Issues
- **Questions**: Create a GitHub Discussion
- **Security**: Email security@example.com

## Version History

### v0.1.0 (Current)
- Initial feature-complete release
- ✅ Summarization with Summarizer API (streaming, multi-chunk)
- ✅ Flashcard generation with Prompt API (LanguageModel)
- ✅ Report synthesis with custom instructions
- ✅ Translation with Translator API
- ✅ Proofreading with Proofreader API (origin trial)
- ✅ Rewriting with Rewriter API (origin trial)
- ✅ 6 context menu items (selection-aware)
- ✅ Task management system
- ✅ Unified overlay for all results
- ✅ Comprehensive settings in popup
- ✅ Caching with URL+hash keys
- ✅ Data export/import
- ✅ Full accessibility compliance
- ✅ Complete documentation (Phase 1-5)

---

**Made with ❤️ for students everywhere**
