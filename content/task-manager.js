/**
 * Task Manager - Manages multiple concurrent tasks with progress tracking
 *
 * Handles:
 * - Multiple concurrent tasks per tab
 * - Progress tracking and time estimation
 * - Duplicate task detection
 * - Task cancellation and cleanup
 */

import { estimateTime, TaskTimer } from '../utils/timing-estimator.js';
import { hashContent } from '../data/storage.js';

// Active tasks: Map<taskId, TaskInfo>
const activeTasks = new Map();

/**
 * Generates unique task ID
 */
function generateTaskId() {
  return `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Task class representing a single operation
 */
export class Task {
  constructor(type, contentHash, metadata = {}) {
    this.id = generateTaskId();
    this.type = type; // 'summarize', 'flashcards', 'report'
    this.contentHash = contentHash;
    this.metadata = metadata;
    this.status = 'pending'; // 'pending', 'running', 'completed', 'cancelled', 'error'
    this.progress = 0; // 0-100
    this.progressMessage = '';
    this.result = null;
    this.error = null;
    this.createdAt = Date.now();
    this.startedAt = null;
    this.completedAt = null;
    this.estimatedSeconds = 0;
    this.timer = null;
    this.cancelCallbacks = [];
    this.aiSession = null; // Store AI session for cleanup
  }

  /**
   * Starts the task
   */
  start(chunkCount = 1) {
    this.status = 'running';
    this.startedAt = Date.now();
    this.timer = new TaskTimer(this.type, chunkCount);
    return estimateTime(this.type, chunkCount).then(estimate => {
      this.estimatedSeconds = estimate;
    });
  }

  /**
   * Updates task progress
   */
  updateProgress(percent, message = '') {
    this.progress = Math.min(100, Math.max(0, percent));
    this.progressMessage = message;
  }

  /**
   * Completes the task successfully
   */
  async complete(result) {
    this.status = 'completed';
    this.result = result;
    this.progress = 100;
    this.completedAt = Date.now();

    if (this.timer) {
      await this.timer.stop();
    }

    this.cleanup();
  }

  /**
   * Cancels the task
   */
  cancel() {
    if (this.status === 'completed' || this.status === 'cancelled') {
      return;
    }

    this.status = 'cancelled';
    this.completedAt = Date.now();

    // Call all cancel callbacks
    this.cancelCallbacks.forEach(cb => {
      try {
        cb();
      } catch (e) {
        console.warn('Cancel callback error:', e);
      }
    });

    this.cleanup();
  }

  /**
   * Registers a cancel callback
   */
  onCancel(callback) {
    this.cancelCallbacks.push(callback);
  }

  /**
   * Sets error state
   */
  setError(error) {
    this.status = 'error';
    this.error = error;
    this.completedAt = Date.now();
    this.cleanup();
  }

  /**
   * Cleans up resources
   */
  cleanup() {
    // Destroy AI session if exists
    if (this.aiSession && typeof this.aiSession.destroy === 'function') {
      try {
        this.aiSession.destroy();
      } catch (e) {
        // Ignore abort errors
        if (e.name !== 'AbortError' && !e.message?.includes('abort')) {
          console.warn('Error destroying AI session:', e);
        }
      }
    }

    this.aiSession = null;
    this.cancelCallbacks = [];
  }

  /**
   * Gets elapsed time in seconds
   */
  getElapsedSeconds() {
    if (!this.startedAt) return 0;
    const endTime = this.completedAt || Date.now();
    return (endTime - this.startedAt) / 1000;
  }

  /**
   * Gets remaining time estimate in seconds
   */
  getRemainingSeconds() {
    if (this.status !== 'running') return 0;

    const elapsed = this.getElapsedSeconds();
    const progressFraction = this.progress / 100;

    if (progressFraction === 0) {
      return this.estimatedSeconds;
    }

    // Calculate remaining based on current progress
    const estimatedTotal = elapsed / progressFraction;
    return Math.max(0, estimatedTotal - elapsed);
  }

  /**
   * Formats remaining time as human-readable string
   */
  getFormattedRemainingTime() {
    const seconds = Math.ceil(this.getRemainingSeconds());

    if (seconds < 60) {
      return `~${seconds}s`;
    } else if (seconds < 3600) {
      const minutes = Math.ceil(seconds / 60);
      return `~${minutes}m`;
    } else {
      const hours = Math.floor(seconds / 3600);
      const minutes = Math.ceil((seconds % 3600) / 60);
      return `~${hours}h ${minutes}m`;
    }
  }
}

/**
 * Checks if a duplicate task is already running
 * @param {string} type - Task type
 * @param {string} contentHash - Content hash
 * @returns {Task|null} - Existing task or null
 */
export function findDuplicateTask(type, contentHash) {
  for (const task of activeTasks.values()) {
    if (task.type === type &&
        task.contentHash === contentHash &&
        (task.status === 'pending' || task.status === 'running')) {
      return task;
    }
  }
  return null;
}

/**
 * Creates and registers a new task
 * @param {string} type - Task type
 * @param {string} content - Content to process
 * @param {Object} metadata - Additional metadata
 * @returns {Task} - Created task
 */
export function createTask(type, content, metadata = {}) {
  const contentHash = hashContent(content);

  // Check for duplicate
  const duplicate = findDuplicateTask(type, contentHash);
  if (duplicate) {
    console.log('[TaskManager] Duplicate task detected:', duplicate.id);
    return null; // Indicate duplicate
  }

  const task = new Task(type, contentHash, metadata);
  activeTasks.set(task.id, task);

  console.log('[TaskManager] Created task:', task.id, type);

  return task;
}

/**
 * Gets a task by ID
 * @param {string} taskId - Task ID
 * @returns {Task|null}
 */
export function getTask(taskId) {
  return activeTasks.get(taskId) || null;
}

/**
 * Gets all active tasks
 * @returns {Task[]}
 */
export function getAllActiveTasks() {
  return Array.from(activeTasks.values()).filter(
    task => task.status === 'pending' || task.status === 'running'
  );
}

/**
 * Removes a task from active tasks
 * @param {string} taskId - Task ID
 */
export function removeTask(taskId) {
  const task = activeTasks.get(taskId);
  if (task) {
    task.cleanup();
    activeTasks.delete(taskId);
    console.log('[TaskManager] Removed task:', taskId);
  }
}

/**
 * Cancels a task
 * @param {string} taskId - Task ID
 */
export function cancelTask(taskId) {
  const task = activeTasks.get(taskId);
  if (task) {
    task.cancel();
    // Remove after a short delay to allow UI updates
    setTimeout(() => removeTask(taskId), 1000);
  }
}

/**
 * Cleans up completed/cancelled tasks older than 5 minutes
 */
export function cleanupOldTasks() {
  const fiveMinutesAgo = Date.now() - (5 * 60 * 1000);

  for (const [taskId, task] of activeTasks.entries()) {
    if ((task.status === 'completed' ||
         task.status === 'cancelled' ||
         task.status === 'error') &&
        task.completedAt &&
        task.completedAt < fiveMinutesAgo) {
      removeTask(taskId);
    }
  }
}

// Run cleanup periodically
setInterval(cleanupOldTasks, 60 * 1000); // Every minute
