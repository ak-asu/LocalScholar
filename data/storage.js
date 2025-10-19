// Simple storage wrapper for Quizzer decks using chrome.storage.local
// All keys are namespaced under 'quizzer.'

const NAMESPACE = 'quizzer.';
const KEYS = {
  DECKS: `${NAMESPACE}decks`,
  COLLECTION: `${NAMESPACE}collection`,
  REPORTS: `${NAMESPACE}reports`,
  CACHE: `${NAMESPACE}cache`,
  SETTINGS: `${NAMESPACE}settings`,
};

function nowIso() {
  return new Date().toISOString();
}

async function getRaw(key, defaultValue) {
  const data = await chrome.storage.local.get({ [key]: defaultValue });
  return data[key] ?? defaultValue;
}

async function setRaw(key, value) {
  await chrome.storage.local.set({ [key]: value });
}

export async function listDecks() {
  const decks = await getRaw(KEYS.DECKS, []);
  return Array.isArray(decks) ? decks : [];
}

export async function getDeck(deckId) {
  const decks = await listDecks();
  return decks.find(d => d.id === deckId) || null;
}

export async function saveDeck(deck) {
  // deck: { id, title, language, createdAt, updatedAt, sourceUrl, sourceTitle, cards: [...] }
  if (!deck || !deck.id || !Array.isArray(deck.cards)) {
    throw new Error('Invalid deck');
  }
  const decks = await listDecks();
  const existingIndex = decks.findIndex(d => d.id === deck.id);
  const now = nowIso();
  const record = { ...deck, updatedAt: now, createdAt: deck.createdAt || now };

  if (existingIndex >= 0) {
    decks[existingIndex] = record;
  } else {
    decks.unshift(record);
  }

  await setRaw(KEYS.DECKS, decks);
  return record;
}

export async function deleteDeck(deckId) {
  const decks = await listDecks();
  const filtered = decks.filter(d => d.id !== deckId);
  await setRaw(KEYS.DECKS, filtered);
  return true;
}

export async function updateDeckMetadata(deckId, partial) {
  const deck = await getDeck(deckId);
  if (!deck) return null;
  const updated = { ...deck, ...partial, updatedAt: nowIso() };
  await saveDeck(updated);
  return updated;
}

// Utility to generate a deck id
export function createDeckId(prefix = 'deck') {
  return `${prefix}_${Math.random().toString(36).slice(2, 8)}_${Date.now().toString(36)}`;
}

// Basic schema validation for flashcards
export function validateFlashcards(cards) {
  if (!Array.isArray(cards)) return { valid: false, reason: 'Not an array' };
  const issues = [];
  const normalized = cards.map((c, idx) => {
    const item = {
      question: typeof c?.question === 'string' ? c.question.trim() : '',
      options: Array.isArray(c?.options) ? c.options.map(String) : [],
      answer: Number.isInteger(c?.answer) ? c.answer : -1,
      explanation: typeof c?.explanation === 'string' ? c.explanation.trim() : ''
    };
    if (!item.question) issues.push(`Card ${idx + 1}: missing question`);
    if (item.options.length !== 4) issues.push(`Card ${idx + 1}: options must have 4 items`);
    if (item.answer < 0 || item.answer > 3) issues.push(`Card ${idx + 1}: answer index out of range`);
    if (!item.explanation) item.explanation = 'Review the text for the rationale.';
    return item;
  });
  return { valid: issues.length === 0, reason: issues.join('; '), cards: normalized };
}

// ===== Collection/Queue Management =====

/**
 * Generates a collection item ID
 */
export function createCollectionId(prefix = 'item') {
  return `${prefix}_${Math.random().toString(36).slice(2, 8)}_${Date.now().toString(36)}`;
}

/**
 * Simple hash function for content deduplication
 */
function simpleHash(text) {
  let hash = 0;
  for (let i = 0; i < text.length; i++) {
    const char = text.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash).toString(36);
}

/**
 * Lists all collection items
 */
export async function listCollection() {
  const items = await getRaw(KEYS.COLLECTION, []);
  return Array.isArray(items) ? items : [];
}

/**
 * Gets a single collection item by ID
 */
export async function getCollectionItem(itemId) {
  const items = await listCollection();
  return items.find(i => i.id === itemId) || null;
}

/**
 * Adds an item to the collection queue
 * @param {Object} item - Collection item
 * @param {string} item.url - Source URL
 * @param {string} item.title - Page/selection title
 * @param {string} item.sourceType - 'selection' | 'page'
 * @param {string} item.text - Full text content
 * @param {string} [item.textExcerpt] - Short excerpt for display
 */
export async function addToCollection(item) {
  if (!item || !item.url || !item.text) {
    throw new Error('Invalid collection item: url and text required');
  }

  const items = await listCollection();
  const now = nowIso();
  const textHash = simpleHash(item.text);

  // Check for duplicates
  const existing = items.find(i => i.textHash === textHash && i.url === item.url);
  if (existing) {
    return existing; // Return existing item instead of duplicating
  }

  const record = {
    id: createCollectionId(),
    url: item.url,
    title: item.title || 'Untitled',
    sourceType: item.sourceType || 'page',
    textHash,
    textExcerpt: item.textExcerpt || item.text.slice(0, 200),
    fullText: item.text, // Store full text directly (could use IndexedDB for very large items)
    addedAt: now,
  };

  items.unshift(record);

  // Limit to 200 items (prune oldest)
  const pruned = items.slice(0, 200);
  await setRaw(KEYS.COLLECTION, pruned);

  return record;
}

/**
 * Removes an item from the collection
 */
export async function removeFromCollection(itemId) {
  const items = await listCollection();
  const filtered = items.filter(i => i.id !== itemId);
  await setRaw(KEYS.COLLECTION, filtered);
  return true;
}

/**
 * Clears the entire collection
 */
export async function clearCollection() {
  await setRaw(KEYS.COLLECTION, []);
  return true;
}

// ===== Report Management =====

/**
 * Generates a report ID
 */
export function createReportId(prefix = 'report') {
  return `${prefix}_${Math.random().toString(36).slice(2, 8)}_${Date.now().toString(36)}`;
}

/**
 * Lists all reports
 */
export async function listReports() {
  const reports = await getRaw(KEYS.REPORTS, []);
  return Array.isArray(reports) ? reports : [];
}

/**
 * Gets a single report by ID
 */
export async function getReport(reportId) {
  const reports = await listReports();
  return reports.find(r => r.id === reportId) || null;
}

/**
 * Saves a report
 * @param {Object} report - Report object
 * @param {string} report.title - Report title
 * @param {string} report.content - Report content
 * @param {string[]} report.sourceIds - IDs of collection items used
 * @param {Object[]} report.citations - Citation objects with url, title
 */
export async function saveReport(report) {
  if (!report || !report.content) {
    throw new Error('Invalid report: content required');
  }

  const reports = await listReports();
  const now = nowIso();
  const id = report.id || createReportId();

  const record = {
    id,
    title: report.title || 'Untitled Report',
    content: report.content,
    sourceIds: report.sourceIds || [],
    citations: report.citations || [],
    createdAt: report.createdAt || now,
    updatedAt: now,
  };

  const existingIndex = reports.findIndex(r => r.id === id);
  if (existingIndex >= 0) {
    reports[existingIndex] = record;
  } else {
    reports.unshift(record);
  }

  // Limit to 100 reports
  const pruned = reports.slice(0, 100);
  await setRaw(KEYS.REPORTS, pruned);

  return record;
}

/**
 * Deletes a report
 */
export async function deleteReport(reportId) {
  const reports = await listReports();
  const filtered = reports.filter(r => r.id !== reportId);
  await setRaw(KEYS.REPORTS, filtered);
  return true;
}

// ===== Cache Management =====

/**
 * Generates a cache key from URL and content hash
 */
export function generateCacheKey(url, contentHash, type = 'summary') {
  return `${type}_${url}_${contentHash}`;
}

/**
 * Computes a hash from content for caching
 */
export function hashContent(content) {
  let hash = 0;
  for (let i = 0; i < content.length; i++) {
    const char = content.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash).toString(36);
}

/**
 * Gets all cached items
 */
async function getAllCache() {
  const cache = await getRaw(KEYS.CACHE, {});
  return typeof cache === 'object' ? cache : {};
}

/**
 * Saves the entire cache object
 */
async function saveCache(cache) {
  await setRaw(KEYS.CACHE, cache);
}

/**
 * Gets cached content by key
 * @param {string} key - Cache key
 * @returns {Object|null} Cached item with {content, timestamp, expiresAt}
 */
export async function getCachedItem(key) {
  const settings = await getRaw(KEYS.SETTINGS, { enableCaching: true, cacheExpiration: 24 });

  if (!settings.enableCaching) {
    return null;
  }

  const cache = await getAllCache();
  const item = cache[key];

  if (!item) {
    return null;
  }

  // Check expiration (0 means never expire)
  const expirationHours = settings.cacheExpiration || 24;
  if (expirationHours > 0 && item.expiresAt) {
    const now = Date.now();
    if (now > item.expiresAt) {
      // Expired, remove from cache
      await deleteCachedItem(key);
      return null;
    }
  }

  return item;
}

/**
 * Saves content to cache
 * @param {string} key - Cache key
 * @param {*} content - Content to cache
 * @param {number} [expirationHours] - Hours until expiration (0 = never)
 */
export async function setCachedItem(key, content, expirationHours = null) {
  const settings = await getRaw(KEYS.SETTINGS, { enableCaching: true, cacheExpiration: 24 });

  if (!settings.enableCaching) {
    return;
  }

  const cache = await getAllCache();
  const now = Date.now();
  const expHours = expirationHours !== null ? expirationHours : (settings.cacheExpiration || 24);

  cache[key] = {
    content,
    timestamp: now,
    expiresAt: expHours > 0 ? now + (expHours * 60 * 60 * 1000) : null,
  };

  await saveCache(cache);
}

/**
 * Deletes a cached item by key
 */
export async function deleteCachedItem(key) {
  const cache = await getAllCache();
  delete cache[key];
  await saveCache(cache);
}

/**
 * Clears all expired cache entries
 */
export async function clearExpiredCache() {
  const cache = await getAllCache();
  const now = Date.now();
  let cleaned = false;

  for (const [key, item] of Object.entries(cache)) {
    if (item.expiresAt && now > item.expiresAt) {
      delete cache[key];
      cleaned = true;
    }
  }

  if (cleaned) {
    await saveCache(cache);
  }

  return cleaned;
}

/**
 * Clears all cache entries
 */
export async function clearAllCache() {
  await setRaw(KEYS.CACHE, {});
  return true;
}

/**
 * Gets cache statistics
 */
export async function getCacheStats() {
  const cache = await getAllCache();
  const keys = Object.keys(cache);
  const now = Date.now();

  let validCount = 0;
  let expiredCount = 0;
  let totalSize = 0;

  for (const item of Object.values(cache)) {
    const isExpired = item.expiresAt && now > item.expiresAt;
    if (isExpired) {
      expiredCount++;
    } else {
      validCount++;
    }
    totalSize += JSON.stringify(item).length;
  }

  return {
    total: keys.length,
    valid: validCount,
    expired: expiredCount,
    sizeBytes: totalSize,
    sizeKB: Math.round(totalSize / 1024),
  };
}

// ===== Settings Management =====

/**
 * Gets settings with defaults
 */
export async function getSettings(defaults = {}) {
  const settings = await getRaw(KEYS.SETTINGS, defaults);
  return { ...defaults, ...settings };
}

/**
 * Saves settings
 */
export async function saveSettings(settings) {
  await setRaw(KEYS.SETTINGS, settings);
  return settings;
}
