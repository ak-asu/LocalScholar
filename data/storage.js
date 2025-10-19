// Simple storage wrapper for Quizzer decks using chrome.storage.local
// All keys are namespaced under 'quizzer.'

const NAMESPACE = 'quizzer.';
const KEYS = {
  DECKS: `${NAMESPACE}decks`,
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
