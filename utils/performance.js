/**
 * Performance monitoring and optimization utilities
 */

/**
 * Debounce function to limit rate of function calls
 * @param {Function} func - Function to debounce
 * @param {number} wait - Wait time in milliseconds
 * @returns {Function} Debounced function
 */
export function debounce(func, wait = 300) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

/**
 * Throttle function to limit rate of function execution
 * @param {Function} func - Function to throttle
 * @param {number} limit - Minimum time between executions in ms
 * @returns {Function} Throttled function
 */
export function throttle(func, limit = 300) {
  let inThrottle;
  return function executedFunction(...args) {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
}

/**
 * Simple performance timer
 */
export class PerformanceTimer {
  constructor(label) {
    this.label = label;
    this.startTime = performance.now();
  }

  /**
   * Stop timer and log duration
   * @returns {number} Duration in milliseconds
   */
  stop() {
    const duration = performance.now() - this.startTime;
    console.log(`⏱️ ${this.label}: ${duration.toFixed(2)}ms`);
    return duration;
  }

  /**
   * Get elapsed time without stopping
   * @returns {number} Duration in milliseconds
   */
  elapsed() {
    return performance.now() - this.startTime;
  }
}

/**
 * Measure async function performance
 * @param {Function} fn - Async function to measure
 * @param {string} label - Label for the measurement
 * @returns {Promise} Result of the function
 */
export async function measureAsync(fn, label = 'Operation') {
  const timer = new PerformanceTimer(label);
  try {
    const result = await fn();
    timer.stop();
    return result;
  } catch (error) {
    timer.stop();
    throw error;
  }
}

/**
 * Batch multiple storage operations
 * @param {Array<{key: string, value: any}>} operations - Array of operations
 */
export async function batchStorageSet(operations) {
  const data = {};
  for (const { key, value } of operations) {
    data[key] = value;
  }
  await chrome.storage.local.set(data);
}

/**
 * Batch get multiple storage keys
 * @param {string[]} keys - Array of keys to retrieve
 * @returns {Promise<Object>} Object with all requested keys
 */
export async function batchStorageGet(keys) {
  const defaults = {};
  for (const key of keys) {
    defaults[key] = null;
  }
  return await chrome.storage.local.get(defaults);
}

/**
 * Monitor memory usage (if available)
 * @returns {Object|null} Memory info or null if not available
 */
export function getMemoryInfo() {
  if (performance.memory) {
    return {
      usedJSHeapSize: Math.round(performance.memory.usedJSHeapSize / 1024 / 1024) + ' MB',
      totalJSHeapSize: Math.round(performance.memory.totalJSHeapSize / 1024 / 1024) + ' MB',
      jsHeapSizeLimit: Math.round(performance.memory.jsHeapSizeLimit / 1024 / 1024) + ' MB',
    };
  }
  return null;
}

/**
 * Check if storage quota is approaching limit
 * @returns {Promise<Object>} Storage usage info
 */
export async function checkStorageQuota() {
  return new Promise((resolve) => {
    chrome.storage.local.getBytesInUse(null, (bytesInUse) => {
      const quota = chrome.storage.local.QUOTA_BYTES || 10485760; // 10MB default
      const percentUsed = (bytesInUse / quota) * 100;
      resolve({
        bytesInUse,
        quota,
        percentUsed: percentUsed.toFixed(2),
        remaining: quota - bytesInUse,
        isNearLimit: percentUsed > 80,
      });
    });
  });
}

/**
 * Lazy loader for heavy resources
 */
export class LazyLoader {
  constructor() {
    this.cache = new Map();
  }

  /**
   * Load and cache a resource
   * @param {string} key - Resource identifier
   * @param {Function} loader - Function that loads the resource
   * @returns {Promise} The loaded resource
   */
  async load(key, loader) {
    if (this.cache.has(key)) {
      return this.cache.get(key);
    }

    const resource = await loader();
    this.cache.set(key, resource);
    return resource;
  }

  /**
   * Clear cached resource
   */
  clear(key) {
    this.cache.delete(key);
  }

  /**
   * Clear all cached resources
   */
  clearAll() {
    this.cache.clear();
  }
}

/**
 * Request animation frame wrapper for smooth updates
 * @param {Function} callback - Function to call on next frame
 * @returns {number} Request ID
 */
export function nextFrame(callback) {
  return requestAnimationFrame(callback);
}

/**
 * Request idle callback for non-urgent work
 * @param {Function} callback - Function to call when idle
 * @param {Object} options - Options for idle callback
 * @returns {number} Request ID
 */
export function whenIdle(callback, options = {}) {
  if ('requestIdleCallback' in window) {
    return requestIdleCallback(callback, options);
  }
  // Fallback to setTimeout if not supported
  return setTimeout(callback, 1);
}

/**
 * Chunk processing with yield to prevent blocking
 * @param {Array} items - Items to process
 * @param {Function} processor - Function to process each item
 * @param {number} chunkSize - Items per chunk
 * @returns {Promise<Array>} Processed items
 */
export async function processInChunks(items, processor, chunkSize = 10) {
  const results = [];

  for (let i = 0; i < items.length; i += chunkSize) {
    const chunk = items.slice(i, i + chunkSize);

    // Process chunk
    for (const item of chunk) {
      results.push(await processor(item));
    }

    // Yield to browser between chunks
    if (i + chunkSize < items.length) {
      await new Promise(resolve => setTimeout(resolve, 0));
    }
  }

  return results;
}

/**
 * Memoize function results
 * @param {Function} fn - Function to memoize
 * @returns {Function} Memoized function
 */
export function memoize(fn) {
  const cache = new Map();

  return function memoized(...args) {
    const key = JSON.stringify(args);

    if (cache.has(key)) {
      return cache.get(key);
    }

    const result = fn.apply(this, args);
    cache.set(key, result);
    return result;
  };
}

/**
 * Create an abortable promise
 * @param {Function} executor - Promise executor function
 * @returns {Object} Object with promise and abort function
 */
export function abortablePromise(executor) {
  let abortFn;

  const promise = new Promise((resolve, reject) => {
    abortFn = () => reject(new Error('Operation aborted'));
    executor(resolve, reject, abortFn);
  });

  return {
    promise,
    abort: abortFn,
  };
}

/**
 * Cleanup old cache entries based on expiration
 * Should be run periodically in background
 */
export async function cleanupExpiredCache() {
  const timer = new PerformanceTimer('Cache cleanup');

  try {
    const { clearExpiredCache } = await import('../data/storage.js');
    const cleaned = await clearExpiredCache();

    timer.stop();
    return cleaned;
  } catch (error) {
    console.error('Cache cleanup failed:', error);
    timer.stop();
    return false;
  }
}

/**
 * Get performance metrics summary
 * @returns {Promise<Object>} Performance summary
 */
export async function getPerformanceMetrics() {
  const storageInfo = await checkStorageQuota();
  const memoryInfo = getMemoryInfo();

  return {
    storage: storageInfo,
    memory: memoryInfo,
    timestamp: new Date().toISOString(),
  };
}
