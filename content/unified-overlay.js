/**
 * Unified Overlay - Single overlay system for progress and results
 *
 * Features:
 * - Progress tracking during task execution
 * - Transforms into results display when complete
 * - Draggable positioning
 * - Closeable at any time
 * - Theme-aware styling
 */

import { getTask, cancelTask } from './task-manager.js';

// Track overlay instances: Map<taskId, OverlayInstance>
const overlayInstances = new Map();

// Shadow root container
let shadowContainer = null;

/**
 * Ensures shadow DOM container exists
 */
function ensureShadowContainer() {
  if (shadowContainer && document.body.contains(shadowContainer)) {
    return shadowContainer;
  }

  shadowContainer = document.createElement('div');
  shadowContainer.id = 'quizzer-overlay-container';
  shadowContainer.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    pointer-events: none;
    z-index: 2147483647;
    isolation: isolate;
  `;

  document.documentElement.appendChild(shadowContainer);
  return shadowContainer;
}

/**
 * Unified Overlay Class
 */
class UnifiedOverlay {
  constructor(taskId = null) {
    this.taskId = taskId;
    this.element = null;
    this.shadow = null;
    this.isDragging = false;
    this.dragOffset = { x: 0, y: 0 };
    this.position = this.loadPosition();
    this.updateInterval = null;
    this.mode = taskId ? 'progress' : 'results'; // 'progress' or 'results'

    this.create();
    if (this.taskId) {
      this.startUpdating();
    }
  }

  /**
   * Loads saved position or uses default
   */
  loadPosition() {
    const overlayCount = overlayInstances.size;
    const offsetY = overlayCount * 120; // Stack overlays vertically

    return {
      x: window.innerWidth - 440 - 16,
      y: 16 + offsetY
    };
  }

  /**
   * Creates the overlay element with shadow DOM
   */
  create() {
    const container = ensureShadowContainer();

    // Create host element
    this.element = document.createElement('div');
    this.element.style.cssText = `
      position: absolute;
      left: ${this.position.x}px;
      top: ${this.position.y}px;
      pointer-events: auto;
      z-index: 1000;
    `;

    // Attach shadow DOM
    this.shadow = this.element.attachShadow({ mode: 'open' });

    // Load overlay CSS
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = chrome.runtime.getURL('content/overlay.css');
    this.shadow.appendChild(link);

    // Create initial content based on mode
    if (this.mode === 'progress') {
      this.createProgressContent();
    } else {
      this.createResultsContent();
    }

    container.appendChild(this.element);
    this.setupDragging();
  }

  /**
   * Creates progress mode content
   */
  createProgressContent() {
    const wrapper = document.createElement('div');
    wrapper.className = 'qz-container';
    wrapper.innerHTML = `
      <div class="qz-card" style="width: 420px;">
        <div class="qz-header" style="cursor: move;">
          <h2 class="qz-title" id="qz-title">Loading...</h2>
          <button class="qz-close" id="qz-close" aria-label="Cancel">×</button>
        </div>
        <div class="qz-body" style="padding: 12px;">
          <div class="qz-progress-container">
            <div id="qz-progress-bar" class="qz-progress-bar"></div>
          </div>
          <div class="qz-progress-info">
            <span id="qz-progress-percent">0%</span>
            <span id="qz-progress-time">Estimating...</span>
          </div>
          <div id="qz-progress-message" class="qz-progress-message">Starting...</div>
        </div>
      </div>
    `;

    this.shadow.appendChild(wrapper);

    // Setup cancel button
    const closeBtn = this.shadow.getElementById('qz-close');
    closeBtn.addEventListener('click', () => {
      if (this.taskId) {
        cancelTask(this.taskId);
      }
      this.remove();
    });
  }

  /**
   * Creates results mode content
   */
  createResultsContent() {
    const wrapper = document.createElement('div');
    wrapper.className = 'qz-container';
    wrapper.innerHTML = `
      <div class="qz-card" style="width: 420px;">
        <div class="qz-header" style="cursor: move;">
          <h2 class="qz-title" id="qz-title">Results</h2>
          <button class="qz-close" id="qz-close" aria-label="Close">×</button>
        </div>
        <div class="qz-body" id="qz-content">
          <p>Loading...</p>
        </div>
      </div>
    `;

    this.shadow.appendChild(wrapper);

    // Setup close button
    const closeBtn = this.shadow.getElementById('qz-close');
    closeBtn.addEventListener('click', () => this.remove());
  }

  /**
   * Sets up dragging functionality
   */
  setupDragging() {
    const header = this.shadow.querySelector('.qz-header');

    const onMouseDown = (e) => {
      if (e.target.closest('.qz-close') || e.target.closest('.qz-btn')) return;

      this.isDragging = true;
      this.dragOffset = {
        x: e.clientX - this.position.x,
        y: e.clientY - this.position.y
      };

      document.addEventListener('mousemove', onMouseMove);
      document.addEventListener('mouseup', onMouseUp);

      e.preventDefault();
    };

    const onMouseMove = (e) => {
      if (!this.isDragging) return;

      this.position.x = e.clientX - this.dragOffset.x;
      this.position.y = e.clientY - this.dragOffset.y;

      // Keep within viewport
      this.position.x = Math.max(0, Math.min(window.innerWidth - 440, this.position.x));
      this.position.y = Math.max(0, Math.min(window.innerHeight - 100, this.position.y));

      this.element.style.left = this.position.x + 'px';
      this.element.style.top = this.position.y + 'px';

      e.preventDefault();
    };

    const onMouseUp = () => {
      this.isDragging = false;
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
    };

    header.addEventListener('mousedown', onMouseDown);
  }

  /**
   * Updates progress mode from task
   */
  update() {
    if (this.mode !== 'progress' || !this.taskId) return;

    const task = getTask(this.taskId);
    if (!task) {
      this.remove();
      return;
    }

    // Update title
    const titleEl = this.shadow.getElementById('qz-title');
    const typeLabels = {
      summarize: 'Summarizing',
      flashcards: 'Generating Flashcards',
      report: 'Generating Report'
    };
    titleEl.textContent = typeLabels[task.type] || task.type;

    // Update progress bar
    const progressBar = this.shadow.getElementById('qz-progress-bar');
    if (progressBar) {
      progressBar.style.width = task.progress + '%';
    }

    // Update percentage
    const percentEl = this.shadow.getElementById('qz-progress-percent');
    if (percentEl) {
      percentEl.textContent = Math.round(task.progress) + '%';
    }

    // Update time remaining
    const timeEl = this.shadow.getElementById('qz-progress-time');
    if (timeEl) {
      if (task.status === 'running' && task.progress > 0) {
        timeEl.textContent = task.getFormattedRemainingTime();
      } else {
        timeEl.textContent = 'Estimating...';
      }
    }

    // Update message
    const messageEl = this.shadow.getElementById('qz-progress-message');
    if (messageEl) {
      messageEl.textContent = task.progressMessage || 'Processing...';
    }

    // Check if task is complete - DO NOT auto-close, wait for results
    if (task.status === 'completed') {
      this.stopUpdating();
      // Task completion will trigger showResults() from content.js
    } else if (task.status === 'error') {
      this.showError(task.error);
      this.stopUpdating();
    } else if (task.status === 'cancelled') {
      this.remove();
    }
  }

  /**
   * Shows error state
   */
  showError(error) {
    if (this.mode === 'progress') {
      const progressBar = this.shadow.getElementById('qz-progress-bar');
      if (progressBar) {
        progressBar.classList.add('error');
      }

      const messageEl = this.shadow.getElementById('qz-progress-message');
      if (messageEl) {
        messageEl.textContent = 'Error: ' + (error?.message || 'Unknown error');
        messageEl.classList.add('error');
      }
    } else {
      this.showResults(`<div class="qz-error-text">Error: ${error?.message || 'Unknown error'}</div>`, 'Error');
    }
  }

  /**
   * Transforms overlay to show results (summary or flashcards)
   */
  showResults(content, title = 'Results') {
    this.mode = 'results';
    this.stopUpdating();

    // Recreate content in results mode
    const wrapper = this.shadow.querySelector('.qz-container');
    if (!wrapper) return;

    wrapper.innerHTML = `
      <div class="qz-card" style="width: 420px;">
        <div class="qz-header" style="cursor: move;">
          <h2 class="qz-title">${this.escapeHtml(title)}</h2>
          <button class="qz-close" id="qz-close" aria-label="Close">×</button>
        </div>
        <div class="qz-body" id="qz-content">
          ${content}
        </div>
      </div>
    `;

    // Re-setup close button
    const closeBtn = this.shadow.getElementById('qz-close');
    closeBtn.addEventListener('click', () => this.remove());

    // Re-setup dragging
    this.setupDragging();
  }

  /**
   * Shows summary text
   *
   * NOTE: Streaming mode could be implemented here for progressive display.
   * This would involve:
   * 1. Creating a streaming content element during progress mode
   * 2. Updating it incrementally as chunks arrive from summarizeStreaming()
   * 3. Auto-scrolling to show the latest content as it streams in
   * See ai-pipeline.js for streaming API documentation.
   */
  showSummary(summaryText, title = 'Summary') {
    const content = `
      <div style="white-space: pre-wrap; line-height: 1.6;">
        ${this.escapeHtml(summaryText)}
      </div>
    `;
    this.showResults(content, title);
  }

  /**
   * Shows flashcard deck
   */
  showFlashcards(deck) {
    if (!deck || !Array.isArray(deck.cards) || deck.cards.length === 0) {
      this.showResults('<em>No flashcards to display.</em>', 'Flashcards');
      return;
    }

    let currentIndex = 0;

    const renderCard = () => {
      const card = deck.cards[currentIndex];
      const contentDiv = this.shadow.getElementById('qz-content');
      if (!contentDiv) return;

      contentDiv.innerHTML = `
        <div>
          <div style="margin-bottom: 16px;">
            <div style="font-size: 12px; opacity: 0.7; margin-bottom: 8px;">
              Question ${currentIndex + 1} of ${deck.cards.length}
            </div>
            <div style="font-weight: 600; margin-bottom: 12px; font-size: 15px;">
              ${this.escapeHtml(card.question)}
            </div>
            <div id="qz-options" style="display: grid; gap: 8px;">
              ${card.options.map((opt, i) => `
                <button
                  class="qz-option qz-option-btn"
                  data-index="${i}"
                >
                  <strong>${String.fromCharCode(65 + i)}.</strong> ${this.escapeHtml(opt)}
                </button>
              `).join('')}
            </div>
            <div id="qz-feedback" class="qz-feedback"></div>
          </div>
          <div id="qz-explanation" style="display:none;">
            <div class="qz-explanation-header">
              ✓ Correct Answer: ${String.fromCharCode(65 + card.answer)}
            </div>
            <div style="font-size: 13px; line-height: 1.6;">
              ${this.escapeHtml(card.explanation || '')}
            </div>
          </div>
          <div style="display: flex; justify-content: space-between; margin-top: 16px; gap: 8px;">
            <button id="qz-prev" class="qz-btn secondary" ${currentIndex === 0 ? 'disabled' : ''}>
              ← Previous
            </button>
            <button id="qz-next" class="qz-btn secondary" ${currentIndex === deck.cards.length - 1 ? 'disabled' : ''}>
              Next →
            </button>
          </div>
        </div>
      `;

      // Setup event listeners

      // Option click handlers
      const optionButtons = this.shadow.querySelectorAll('.qz-option');
      const feedbackDiv = this.shadow.getElementById('qz-feedback');
      const explanationDiv = this.shadow.getElementById('qz-explanation');

      let answered = false;

      optionButtons.forEach((btn, index) => {
        btn.addEventListener('click', () => {
          if (answered) return; // Already answered

          answered = true;
          const selectedIndex = parseInt(btn.getAttribute('data-index'));
          const isCorrect = selectedIndex === card.answer;

          // Disable all options
          optionButtons.forEach(opt => opt.disabled = true);

          // Color the selected option
          if (isCorrect) {
            btn.classList.add('correct');
          } else {
            btn.classList.add('incorrect');

            // Also highlight the correct answer
            optionButtons[card.answer].classList.add('correct');
          }

          // Show feedback
          if (feedbackDiv) {
            feedbackDiv.style.display = 'block';
            feedbackDiv.classList.add(isCorrect ? 'correct' : 'incorrect');
            feedbackDiv.innerHTML = isCorrect
              ? '<div class="qz-feedback-text correct">✓ Correct!</div>'
              : '<div class="qz-feedback-text incorrect">✗ Incorrect</div>';
          }

          // Show explanation automatically after answering
          if (explanationDiv) {
            explanationDiv.style.display = 'block';
          }
        });
      });

      const prevBtn = this.shadow.getElementById('qz-prev');
      const nextBtn = this.shadow.getElementById('qz-next');
      if (prevBtn) {
        prevBtn.addEventListener('click', () => {
          if (currentIndex > 0) {
            currentIndex--;
            renderCard();
          }
        });
      }
      if (nextBtn) {
        nextBtn.addEventListener('click', () => {
          if (currentIndex < deck.cards.length - 1) {
            currentIndex++;
            renderCard();
          }
        });
      }

      // Keyboard navigation
      const bodyEl = this.shadow.querySelector('.qz-body');
      if (bodyEl) {
        bodyEl.tabIndex = 0;
        bodyEl.focus();
        bodyEl.onkeydown = (e) => {
          if (e.key === 'ArrowLeft' && currentIndex > 0) {
            currentIndex--;
            renderCard();
            e.preventDefault();
          }
          if (e.key === 'ArrowRight' && currentIndex < deck.cards.length - 1) {
            currentIndex++;
            renderCard();
            e.preventDefault();
          }
          if (e.key === ' ' && explanationDiv) {
            explanationDiv.style.display = explanationDiv.style.display === 'none' ? 'block' : 'none';
            if (revealBtn) {
              revealBtn.textContent = explanationDiv.style.display === 'none' ? 'Show Answer' : 'Hide Answer';
            }
            e.preventDefault();
          }
          if (e.key === 'Escape') {
            this.remove();
          }
        };
      }
    };

    this.showResults('', `Flashcards (${deck.cards.length})`);
    renderCard();
  }

  /**
   * Escape HTML to prevent XSS
   */
  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  /**
   * Starts periodic updates
   */
  startUpdating() {
    if (this.mode !== 'progress') return;
    this.update();
    this.updateInterval = setInterval(() => this.update(), 500);
  }

  /**
   * Stops periodic updates
   */
  stopUpdating() {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = null;
    }
  }

  /**
   * Removes the overlay
   */
  remove() {
    this.stopUpdating();

    if (this.element && this.element.parentNode) {
      this.element.parentNode.removeChild(this.element);
    }

    if (this.taskId) {
      overlayInstances.delete(this.taskId);
    }

    // Clean up container if no more overlays
    if (overlayInstances.size === 0 && shadowContainer && shadowContainer.parentNode) {
      shadowContainer.parentNode.removeChild(shadowContainer);
      shadowContainer = null;
    }
  }
}

/**
 * Creates and shows a progress overlay for a task
 * @param {string} taskId - Task ID
 * @returns {UnifiedOverlay}
 */
export function showProgressOverlay(taskId) {
  // Remove existing overlay for this task
  if (overlayInstances.has(taskId)) {
    overlayInstances.get(taskId).remove();
  }

  const overlay = new UnifiedOverlay(taskId);
  overlayInstances.set(taskId, overlay);

  return overlay;
}

/**
 * Gets an overlay instance by task ID
 * @param {string} taskId - Task ID
 * @returns {UnifiedOverlay|null}
 */
export function getOverlay(taskId) {
  return overlayInstances.get(taskId) || null;
}

/**
 * Creates and shows a results overlay (without task ID)
 * @returns {UnifiedOverlay}
 */
export function showResultsOverlay() {
  const overlay = new UnifiedOverlay(null);
  return overlay;
}

/**
 * Removes an overlay
 * @param {string} taskId - Task ID
 */
export function removeOverlay(taskId) {
  const overlay = overlayInstances.get(taskId);
  if (overlay) {
    overlay.remove();
  }
}
