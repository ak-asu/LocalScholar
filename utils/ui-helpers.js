/**
 * UI Helper utilities for consistent styling and Chrome theme integration
 */

/**
 * Gets Chrome's color scheme preference
 * @returns {Promise<'light'|'dark'>}
 */
export async function getColorScheme() {
  if (window.matchMedia) {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
  return 'light';
}

/**
 * Applies Chrome theme colors to an element
 * @param {HTMLElement} element - Element to apply theme to
 * @param {boolean} isDark - Whether to use dark theme
 */
export function applyTheme(element, isDark = false) {
  if (!element) return;

  element.setAttribute('data-theme', isDark ? 'dark' : 'light');
}

/**
 * Sets up theme listener for automatic theme switching
 * @param {Function} callback - Called when theme changes with isDark boolean
 */
export function setupThemeListener(callback) {
  if (!window.matchMedia) return;

  const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
  const handler = (e) => callback(e.matches);

  mediaQuery.addEventListener('change', handler);
  callback(mediaQuery.matches); // Initial call

  return () => mediaQuery.removeEventListener('change', handler);
}

/**
 * Creates a status message element
 * @param {string} message - Message to display
 * @param {'info'|'success'|'error'|'warning'} type - Message type
 * @returns {string} - Formatted status message
 */
export function formatStatus(message, type = 'info') {
  return message;
}

/**
 * Debounces a function call
 * @param {Function} fn - Function to debounce
 * @param {number} delay - Delay in milliseconds
 * @returns {Function}
 */
export function debounce(fn, delay = 300) {
  let timeoutId;
  return (...args) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => fn(...args), delay);
  };
}

/**
 * Creates accessible form controls with consistent styling
 * @param {string} id - Input ID
 * @param {string} label - Label text
 * @param {'select'|'input'|'textarea'} type - Control type
 * @param {Object} options - Additional options
 * @returns {HTMLElement}
 */
export function createFormControl(id, label, type = 'input', options = {}) {
  const container = document.createElement('label');
  container.className = 'form-control';

  const labelEl = document.createElement('span');
  labelEl.textContent = label;
  labelEl.className = 'form-label';

  let control;
  if (type === 'select') {
    control = document.createElement('select');
    if (options.items) {
      options.items.forEach(item => {
        const opt = document.createElement('option');
        opt.value = item.value;
        opt.textContent = item.label;
        if (item.selected) opt.selected = true;
        control.appendChild(opt);
      });
    }
  } else if (type === 'textarea') {
    control = document.createElement('textarea');
  } else {
    control = document.createElement('input');
    control.type = options.inputType || 'text';
  }

  control.id = id;
  control.className = 'form-input';

  container.appendChild(labelEl);
  container.appendChild(control);

  return container;
}

/**
 * Shows a loading state on an element
 * @param {HTMLElement} element - Element to show loading state
 * @param {boolean} isLoading - Whether to show loading
 */
export function setLoadingState(element, isLoading) {
  if (!element) return;

  if (isLoading) {
    element.setAttribute('data-loading', 'true');
    element.disabled = true;
  } else {
    element.removeAttribute('data-loading');
    element.disabled = false;
  }
}

/**
 * Safely updates text content with sanitization
 * @param {HTMLElement} element - Element to update
 * @param {string} text - Text content
 */
export function setTextContent(element, text) {
  if (!element) return;
  element.textContent = text || '';
}

/**
 * Creates a styled button
 * @param {string} text - Button text
 * @param {'primary'|'secondary'|'danger'} variant - Button style
 * @returns {HTMLButtonElement}
 */
export function createButton(text, variant = 'primary') {
  const button = document.createElement('button');
  button.textContent = text;
  button.className = `btn btn-${variant}`;
  return button;
}
