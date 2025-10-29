# Quizzer Extension - Testing Guide

## Overview
This document provides comprehensive testing procedures for all Quizzer extension features.

---

## Pre-Testing Setup

### 1. Load Extension
1. Open Chrome and navigate to `chrome://extensions/`
2. Enable "Developer mode" (toggle in top-right)
3. Click "Load unpacked"
4. Select the `Quizzer` directory
5. Verify extension loads without errors (check console)

### 2. Check Chrome Version
- Ensure Chrome 128+ for built-in AI APIs
- Navigate to `chrome://version/` to verify

### 3. Enable AI APIs (if needed)
- Visit `chrome://flags/#optimization-guide-on-device-model`
- Set to "Enabled BypassPerfRequirement"
- Relaunch Chrome

---

## Test Categories

## 1. Context Menu Tests

### Test 1.1: Context Menu Visibility
- **Action:** Right-click on any webpage
- **Expected:** See "Quizzer: Summarize", "Quizzer: Create Flashcards", "Quizzer: Add to Report Queue", "Quizzer: Write Report"
- **Status:** ✅ / ❌

### Test 1.2: Summarize - Selection
- **Setup:** Select 2-3 paragraphs of text
- **Action:** Right-click → Quizzer: Summarize
- **Expected:**
  - Progress overlay appears (draggable)
  - Shows progress bar with time estimate
  - Completes with summary
  - Can cancel mid-process
- **Status:** ✅ / ❌

### Test 1.3: Summarize - Whole Page
- **Setup:** Don't select any text
- **Action:** Right-click → Quizzer: Summarize
- **Expected:**
  - Extracts main content (not nav/ads)
  - Shows chunking if page is large
  - Progress updates for each chunk
  - Summary appears in history
- **Status:** ✅ / ❌

### Test 1.4: Create Flashcards - Selection
- **Setup:** Select educational text
- **Action:** Right-click → Quizzer: Create Flashcards
- **Expected:**
  - Progress overlay shows
  - Generates flashcards
  - Overlay shows deck immediately
  - Can navigate with arrow keys
  - Saved in history
- **Status:** ✅ / ❌

### Test 1.5: Create Flashcards - Whole Page
- **Setup:** Navigate to article
- **Action:** Right-click → Quizzer: Create Flashcards
- **Expected:**
  - Uses cached summary if available (optimization)
  - Generates appropriate number of cards (check settings)
  - Validates card format
- **Status:** ✅ / ❌

### Test 1.6: Add to Report Queue - Selection
- **Setup:** Select text
- **Action:** Right-click → Quizzer: Add to Report Queue
- **Expected:**
  - Message "Added to report queue!"
  - Opens popup → Reports → Queue shows item
  - Stores summary if cached (optimization)
- **Status:** ✅ / ❌

### Test 1.7: Add to Report Queue - Whole Page
- **Setup:** Don't select text
- **Action:** Right-click → Quizzer: Add to Report Queue
- **Expected:**
  - Extracts main content
  - Adds to queue
  - No duplicates if added again
- **Status:** ✅ / ❌

---

## 2. Progress Overlay Tests

### Test 2.1: Draggable Overlay
- **Setup:** Start any long operation
- **Action:** Drag progress overlay
- **Expected:**
  - Overlay moves smoothly
  - Stays within viewport bounds
  - Doesn't affect page content
- **Status:** ✅ / ❌

### Test 2.2: Multiple Concurrent Tasks
- **Setup:** Open 3 tabs, start summarize on each
- **Action:** Switch between tabs
- **Expected:**
  - Each tab shows its own progress overlay
  - Tasks continue in background
  - Overlays stack vertically
  - No interference between tasks
- **Status:** ✅ / ❌

### Test 2.3: Cancel Task
- **Setup:** Start summarization
- **Action:** Click cancel (×) on overlay
- **Expected:**
  - Task cancels immediately
  - AI session cleaned up
  - Overlay disappears
  - No partial results saved
- **Status:** ✅ / ❌

### Test 2.4: Time Estimation
- **Setup:** Run several summarize operations
- **Action:** Observe time estimates
- **Expected:**
  - Initial estimate shows (5s/chunk baseline)
  - Updates during operation
  - Learns from actual times
  - Subsequent operations have better estimates
- **Status:** ✅ / ❌

---

## 3. Duplicate Task Prevention

### Test 3.1: Duplicate Summarize
- **Setup:** Select same text
- **Action:** Trigger summarize twice quickly
- **Expected:**
  - First task runs
  - Second shows message: "A summary is already being generated..."
  - Only one progress overlay
- **Status:** ✅ / ❌

### Test 3.2: Duplicate Flashcards
- **Setup:** Same content
- **Action:** Trigger flashcards twice
- **Expected:**
  - Duplicate detected
  - Message shown
  - Only one task runs
- **Status:** ✅ / ❌

---

## 4. Popup UI Tests

### Test 4.1: Tab Switching
- **Action:** Click History/Settings tabs
- **Expected:**
  - Smooth transitions
  - Content shows/hides correctly
  - Active tab highlighted
- **Status:** ✅ / ❌

### Test 4.2: Summaries List
- **Setup:** Create 3 summaries
- **Action:** Open popup → History → Summaries
- **Expected:**
  - All summaries listed
  - Shows title, date, preview
  - Action buttons: View, Copy, Download, Delete
- **Status:** ✅ / ❌

### Test 4.3: View Summary (Modal)
- **Action:** Click "View" on summary
- **Expected:**
  - Modal opens with full content
  - Can scroll if long
  - Copy/Download buttons work
  - Close with × or OK
- **Status:** ✅ / ❌

### Test 4.4: Copy Summary
- **Action:** Click "Copy" on summary item
- **Expected:**
  - Copies to clipboard
  - Status message: "Copied to clipboard!"
  - Can paste elsewhere
- **Status:** ✅ / ❌

### Test 4.5: Download Summary
- **Action:** Click "Download" on summary
- **Expected:**
  - Downloads as `.md` file
  - Filename: `summary-[title].md`
  - Content formatted correctly
- **Status:** ✅ / ❌

### Test 4.6: Delete Summary
- **Action:** Click "Delete" on summary
- **Expected:**
  - Confirmation dialog
  - Deletes on confirm
  - List updates immediately
- **Status:** ✅ / ❌

### Test 4.7: Flashcards List
- **Setup:** Create flashcard decks
- **Action:** View in popup
- **Expected:**
  - Shows deck title, card count, date
  - Click deck → opens in overlay on page
  - Action buttons work
- **Status:** ✅ / ❌

### Test 4.8: Queue List
- **Setup:** Add 3 items to queue
- **Action:** Open popup → Reports → Queue
- **Expected:**
  - Shows all queue items
  - Each has title, date, preview, actions
  - Count shows correctly: "3 items in queue"
  - Green color when has items
- **Status:** ✅ / ❌

### Test 4.9: Generated Reports List
- **Setup:** Generate a report
- **Action:** View Reports → Generated Reports
- **Expected:**
  - Shows report with title, date, preview
  - Action buttons work
  - View shows full report with references section
- **Status:** ✅ / ❌

---

## 5. Report Generation Tests

### Test 5.1: Generate Report from Queue
- **Setup:** Add 3-5 items to queue
- **Action:** Click "Generate Report from Queue"
- **Expected:**
  - Button shows "Generating... X%"
  - Progress updates
  - Report synthesizes all sources
  - References section at end with URLs
  - Modal opens automatically to view
  - Prompt to clear queue
- **Status:** ✅ / ❌

### Test 5.2: Report References Section
- **Action:** View generated report
- **Expected:**
  - End has "## References" heading
  - Lists all source URLs with titles
  - Format: "1. Title - URL"
- **Status:** ✅ / ❌

### Test 5.3: Empty Queue
- **Setup:** Empty queue
- **Action:** Try to generate report
- **Expected:**
  - Button disabled
  - Error if somehow clicked: "Queue is empty"
- **Status:** ✅ / ❌

---

## 6. Caching & Optimization Tests

### Test 6.1: Summary Caching
- **Setup:** Summarize a page
- **Action:** Summarize same page again
- **Expected:**
  - Second time instant (uses cache)
  - Console shows: "Using cached summary"
  - Same result as first time
- **Status:** ✅ / ❌

### Test 6.2: Flashcards Use Cached Summary
- **Setup:** Summarize whole page first
- **Action:** Generate flashcards for whole page
- **Expected:**
  - Console shows: "Using cached summary for flashcard generation"
  - Faster generation
  - Good quality cards
- **Status:** ✅ / ❌

### Test 6.3: Report Queue Uses Cached Summary
- **Setup:** Summarize page, then add to queue
- **Action:** Check queue item in popup
- **Expected:**
  - Queue item has summary stored
  - Report generation uses it (faster)
- **Status:** ✅ / ❌

### Test 6.4: Cache Expiration
- **Setup:** Set cache expiration to 1 hour
- **Action:** Wait 61 minutes, trigger same summary
- **Expected:**
  - Re-generates (not from cache)
  - Updates cache with new result
- **Status:** ✅ / ❌ / ⏭️ (Skip - time consuming)

---

## 7. Settings Tests

### Test 7.1: Summary Settings
- **Setup:** Change summary type to "TL;DR", length to "Short"
- **Action:** Summarize text
- **Expected:**
  - Uses selected type and length
  - Result reflects settings
- **Status:** ✅ / ❌

### Test 7.2: Flashcard Settings
- **Setup:** Set count to 10, difficulty to "Hard"
- **Action:** Generate flashcards
- **Expected:**
  - Generates 10 cards
  - Questions are harder
- **Status:** ✅ / ❌

### Test 7.3: Caching Settings
- **Setup:** Disable caching
- **Action:** Summarize twice
- **Expected:**
  - Both times generate fresh
  - No "Using cached" messages
- **Status:** ✅ / ❌

### Test 7.4: Auto-Summarize on Page Load
- **Setup:** Enable "Auto-summarize on page load"
- **Action:** Navigate to new article
- **Expected:**
  - Waits 2 seconds
  - Starts summarizing silently (no overlay)
  - Summary appears in history
  - Console: "Auto-summarize enabled"
- **Status:** ✅ / ❌

### Test 7.5: Auto-Flashcards on Page Load
- **Setup:** Enable "Auto-generate flashcards"
- **Action:** Navigate to article
- **Expected:**
  - Runs in background
  - Deck created automatically
  - No overlay shown
- **Status:** ✅ / ❌

### Test 7.6: Settings Persistence
- **Setup:** Change all settings
- **Action:** Close popup, reopen
- **Expected:**
  - All settings retained
  - Auto-save worked
- **Status:** ✅ / ❌

---

## 8. Data Management Tests

### Test 8.1: Export Data
- **Action:** Settings → Export Data
- **Expected:**
  - Downloads JSON file
  - Contains all summaries, decks, reports, settings
  - Valid JSON format
- **Status:** ✅ / ❌

### Test 8.2: Import Data
- **Setup:** Export data first
- **Action:** Clear all data → Import exported file
- **Expected:**
  - Confirmation prompts
  - All data restored
  - Settings restored
  - History shows all items
- **Status:** ✅ / ❌

### Test 8.3: Clear Cache
- **Action:** Settings → Clear Cache
- **Expected:**
  - Confirmation dialog
  - Cache cleared
  - Next summarize regenerates
- **Status:** ✅ / ❌

### Test 8.4: Clear All Data
- **Action:** Settings → Clear All Data
- **Expected:**
  - Two confirmation dialogs
  - All data deleted
  - Settings retained
  - History empty
- **Status:** ✅ / ❌

---

## 9. Edge Cases & Error Handling

### Test 9.1: Very Short Content
- **Setup:** Select 1-2 words
- **Action:** Summarize
- **Expected:**
  - Error: "Content too short (minimum 50 characters)"
  - No crash
- **Status:** ✅ / ❌

### Test 9.2: Very Long Page
- **Setup:** Navigate to 50+ page article
- **Action:** Summarize whole page
- **Expected:**
  - Chunks content automatically
  - Progress shows chunk X/Y
  - Combines summaries correctly
- **Status:** ✅ / ❌

### Test 9.3: Network Disconnect During Task
- **Setup:** Start summarize, disconnect internet
- **Action:** Wait for completion
- **Expected:**
  - Works offline (local AI)
  - Completes successfully
- **Status:** ✅ / ❌

### Test 9.4: Close Tab During Task
- **Setup:** Start long operation
- **Action:** Close tab
- **Expected:**
  - Task cancelled gracefully
  - No memory leaks
  - No background errors
- **Status:** ✅ / ❌

### Test 9.5: Unsupported Page (chrome://)
- **Setup:** Navigate to `chrome://extensions/`
- **Action:** Right-click → Summarize
- **Expected:**
  - Content script not injected
  - Context menu may not show, or shows error
  - No crash
- **Status:** ✅ / ❌

---

## 10. Accessibility Tests

### Test 10.1: Keyboard Navigation - Flashcards
- **Setup:** Open flashcard deck
- **Action:** Use keyboard only
  - Arrow Left/Right: Navigate cards
  - Space: Reveal answer
  - Escape: Close overlay
- **Expected:** All actions work
- **Status:** ✅ / ❌

### Test 10.2: Screen Reader (Optional)
- **Action:** Use screen reader with extension
- **Expected:**
  - Buttons have aria-labels
  - Status updates announced
  - Modals have proper roles
- **Status:** ✅ / ❌ / ⏭️

---

## 11. Performance Tests

### Test 11.1: Time Estimation Learning
- **Setup:** Run 5 summarize operations
- **Action:** Observe time estimates
- **Expected:**
  - First uses baseline (5s/chunk)
  - Estimates improve with each run
  - Historical data stored
- **Status:** ✅ / ❌

### Test 11.2: Multiple Tab Performance
- **Setup:** Open 5 tabs, run operations
- **Action:** Monitor performance
- **Expected:**
  - No slowdown
  - Each tab independent
  - No memory leaks (check Task Manager)
- **Status:** ✅ / ❌

### Test 11.3: Large Data Set
- **Setup:** Create 50 summaries, 30 decks, 20 reports
- **Action:** Open popup, navigate
- **Expected:**
  - Loads quickly (<1s)
  - Scrolling smooth
  - No lag
- **Status:** ✅ / ❌

---

## Summary Checklist

**Core Features:**
- [ ] Context menu (Summarize, Flashcards, Add to Queue)
- [ ] Progress overlays (draggable, cancellable, time estimates)
- [ ] Duplicate task prevention
- [ ] Caching and optimization
- [ ] Auto-start on page load

**Popup Features:**
- [ ] View/Copy/Download/Delete for all item types
- [ ] Modal dialogs (not alerts)
- [ ] Queue + Generated Reports sections
- [ ] Report generation with references

**Settings:**
- [ ] Summary/Flashcard customization
- [ ] Auto-start toggles
- [ ] Cache management
- [ ] Data import/export

**Quality:**
- [ ] No console errors
- [ ] Proper resource cleanup
- [ ] Works offline
- [ ] Handles edge cases

---

## Reporting Issues

When reporting bugs, include:
1. Chrome version
2. Steps to reproduce
3. Expected vs actual behavior
4. Console errors (if any)
5. Screenshots/video

---

## Performance Benchmarks

**Expected Times:**
- Summary (1000 words): 3-8 seconds
- Flashcards (5 cards): 8-15 seconds
- Report (3 sources): 20-40 seconds

**Cache Hit:**
- Summary (cached): <100ms
- Flashcards (with cached summary): 5-10 seconds

---

**Testing completed: __ / __ tests passed**
**Date: ___________**
**Tester: ___________**
