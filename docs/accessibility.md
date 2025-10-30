# Accessibility Guidelines for LocalScholar

Last updated: 2025-10-19

## Overview

LocalScholar is designed to be accessible to all users, including those who rely on assistive technologies like screen readers, keyboard navigation, and alternative input devices.

## Implemented Accessibility Features

### Semantic HTML
- Proper use of semantic elements (`<main>`, `<section>`, `<header>`, `<button>`, etc.)
- Logical heading hierarchy (h1 → h2 → h3)
- Native form controls with proper labeling

### ARIA Attributes
- **Live regions**: `aria-live="polite"` on status messages and dynamic content
- **Labels**: `aria-label` on all icon buttons and controls without visible text
- **Roles**: Explicit roles where needed (`role="list"`, `role="status"`)
- **Landmarks**: `aria-labelledby` for section associations
- **Hidden content**: `hidden` attribute and `.visually-hidden` class for screen reader only content

### Keyboard Navigation
- All interactive elements are keyboard accessible
- Logical tab order throughout the interface
- Focus indicators on all focusable elements (`:focus-visible` styling)
- Keyboard shortcuts for flashcard navigation:
  - Arrow keys: Navigate between options
  - Number keys (1-4): Select answer option
  - Enter: Submit answer
  - Escape: Close overlay

### Visual Accessibility
- High contrast ratios meeting WCAG AA standards
- Color scheme support (light/dark mode)
- System colors used in overlay (respects user preferences)
- Sufficient text size and spacing
- No information conveyed by color alone

### Motion & Animation
- Respects `prefers-reduced-motion` media query
- Animations disabled for users who prefer reduced motion
- No auto-playing animations or videos

### Form Accessibility
- All form inputs have associated labels
- Select dropdowns properly labeled
- Form validation messages are announced to screen readers
- Error states clearly indicated

## Accessibility Checklist

### For All UI Components
- [ ] Can be navigated with keyboard alone
- [ ] Has visible focus indicators
- [ ] Has appropriate ARIA attributes
- [ ] Works with screen readers (tested)
- [ ] Has sufficient color contrast (4.5:1 for text)
- [ ] Respects user's motion preferences
- [ ] Responds to system theme preferences

### For Interactive Elements
- [ ] Has descriptive accessible name
- [ ] Keyboard shortcuts don't conflict with browser/screen reader
- [ ] Provides feedback on activation
- [ ] Has appropriate role

### For Dynamic Content
- [ ] Uses `aria-live` regions for announcements
- [ ] Loading states are announced
- [ ] Error messages are announced
- [ ] Success confirmations are announced

## Testing

### Manual Testing
1. **Keyboard Navigation**: Tab through entire interface, ensure all interactive elements are reachable
2. **Screen Reader**: Test with NVDA (Windows), JAWS (Windows), or VoiceOver (Mac)
3. **Zoom**: Test at 200% zoom level
4. **Color Contrast**: Use browser DevTools or online contrast checker
5. **Reduced Motion**: Enable in OS settings and verify animations are disabled

### Automated Testing
Run accessibility audits using:
- Chrome DevTools Lighthouse (Accessibility score)
- axe DevTools browser extension
- WAVE browser extension

### Screen Reader Testing Scenarios

#### Popup Interface
1. Open extension popup
2. Navigate through all sections
3. Activate summarization
4. Listen for completion announcement
5. Navigate through flashcard generation
6. Review saved decks list

#### Options Page
1. Open settings page
2. Navigate through all settings sections
3. Toggle feature switches
4. Change dropdown values
5. Activate data management buttons
6. Verify announcements for status messages

#### Flashcard Overlay
1. Generate flashcards
2. Navigate through questions with keyboard
3. Select answers using number keys
4. Navigate using arrow keys
5. Close with Escape key

## Known Issues & Future Improvements

### Current Limitations
- Flashcard overlay positioning may not respect high zoom levels perfectly
- Some dynamic content updates might need additional announcements
- Export/import functionality could use better progress feedback

### Planned Improvements
- Add keyboard shortcut customization
- Improve screen reader announcements for report generation progress
- Add focus management for modal dialogs
- Implement skip links for long content
- Add more granular control over announcement verbosity

## Resources

- [WCAG 2.1 Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)
- [ARIA Authoring Practices](https://www.w3.org/WAI/ARIA/apg/)
- [Chrome Extensions Accessibility](https://developer.chrome.com/docs/extensions/mv3/a11y/)
- [WebAIM Resources](https://webaim.org/resources/)

## Contact

If you encounter any accessibility issues or have suggestions for improvements, please file an issue on our GitHub repository with the "accessibility" label.
