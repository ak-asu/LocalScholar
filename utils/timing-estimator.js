/**
 * Timing Estimator with Learning
 *
 * Tracks actual processing times and improves estimates over time.
 * Stores historical data to predict future task durations.
 */

const STORAGE_KEY = 'localscholar.timing_data';

// Default baseline estimates (in seconds)
const BASELINE_TIMES = {
  summarize: {
    perChunk: 5,
    overhead: 2
  },
  flashcards: {
    perChunk: 8,
    overhead: 3
  },
  report: {
    perItem: 10,
    overhead: 5
  }
};

/**
 * Gets stored timing data
 */
async function getTimingData() {
  const data = await chrome.storage.local.get(STORAGE_KEY);
  return data[STORAGE_KEY] || {
    summarize: [],
    flashcards: [],
    report: [],
    lastCleanup: Date.now()
  };
}

/**
 * Saves timing data
 */
async function saveTimingData(data) {
  await chrome.storage.local.set({ [STORAGE_KEY]: data });
}

/**
 * Records actual time taken for a task
 * @param {string} taskType - 'summarize', 'flashcards', or 'report'
 * @param {number} chunkCount - Number of chunks/items processed
 * @param {number} actualSeconds - Actual time taken in seconds
 */
export async function recordTiming(taskType, chunkCount, actualSeconds) {
  const data = await getTimingData();

  if (!data[taskType]) {
    data[taskType] = [];
  }

  // Store timing record
  data[taskType].push({
    chunkCount,
    actualSeconds,
    timestamp: Date.now()
  });

  // Keep only last 50 records per type
  if (data[taskType].length > 50) {
    data[taskType] = data[taskType].slice(-50);
  }

  await saveTimingData(data);
}

/**
 * Estimates time for a task based on historical data
 * @param {string} taskType - 'summarize', 'flashcards', or 'report'
 * @param {number} chunkCount - Number of chunks/items to process
 * @returns {number} - Estimated seconds
 */
export async function estimateTime(taskType, chunkCount) {
  const data = await getTimingData();
  const history = data[taskType] || [];

  // If we have historical data, use it
  if (history.length >= 3) {
    // Calculate average time per chunk from recent history
    const recentHistory = history.slice(-10); // Last 10 records
    const totalTime = recentHistory.reduce((sum, record) => sum + record.actualSeconds, 0);
    const totalChunks = recentHistory.reduce((sum, record) => sum + record.chunkCount, 0);

    const avgTimePerChunk = totalTime / totalChunks;
    const baseline = BASELINE_TIMES[taskType];

    // Estimate = (avg time per chunk * chunk count) + overhead
    const estimate = (avgTimePerChunk * chunkCount) + (baseline?.overhead || 2);

    return Math.max(Math.ceil(estimate), 2); // Minimum 2 seconds
  }

  // Fall back to baseline estimates
  const baseline = BASELINE_TIMES[taskType];
  if (baseline) {
    return (baseline.perChunk * chunkCount) + baseline.overhead;
  }

  // Default fallback
  return 5 * chunkCount + 2;
}

/**
 * Gets average time per chunk for a task type
 * @param {string} taskType - Task type
 * @returns {Promise<number>} - Average seconds per chunk
 */
export async function getAverageTimePerChunk(taskType) {
  const data = await getTimingData();
  const history = data[taskType] || [];

  if (history.length === 0) {
    const baseline = BASELINE_TIMES[taskType];
    return baseline?.perChunk || 5;
  }

  const recentHistory = history.slice(-10);
  const totalTime = recentHistory.reduce((sum, record) => sum + record.actualSeconds, 0);
  const totalChunks = recentHistory.reduce((sum, record) => sum + record.chunkCount, 0);

  return totalTime / totalChunks;
}

/**
 * Clears old timing data (older than 30 days)
 */
export async function cleanupOldTimingData() {
  const data = await getTimingData();
  const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);

  let cleaned = false;

  for (const taskType in data) {
    if (Array.isArray(data[taskType])) {
      const original = data[taskType].length;
      data[taskType] = data[taskType].filter(record => record.timestamp > thirtyDaysAgo);
      if (data[taskType].length < original) {
        cleaned = true;
      }
    }
  }

  if (cleaned) {
    data.lastCleanup = Date.now();
    await saveTimingData(data);
  }

  return cleaned;
}

/**
 * Timer class for tracking task duration
 */
export class TaskTimer {
  constructor(taskType, chunkCount) {
    this.taskType = taskType;
    this.chunkCount = chunkCount;
    this.startTime = Date.now();
  }

  /**
   * Stops timer and records the timing
   * @returns {number} - Elapsed seconds
   */
  async stop() {
    const elapsed = (Date.now() - this.startTime) / 1000;
    await recordTiming(this.taskType, this.chunkCount, elapsed);
    return elapsed;
  }

  /**
   * Gets elapsed time without stopping
   * @returns {number} - Elapsed seconds
   */
  elapsed() {
    return (Date.now() - this.startTime) / 1000;
  }
}
