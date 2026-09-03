import SynonymMap from "../models/synonymMap.model.js";

let cache = new Map();       // term → [synonyms]
let lastLoaded = null;
const TTL_MS = 10 * 60 * 1000; // refresh every 10 min

async function loadCache() {
  const docs = await SynonymMap.find({ status: "active" }).lean();

  const fresh = new Map();

  for (const doc of docs) {
    const term = doc.term.toLowerCase();
    const syns = doc.synonyms.map(s => s.toLowerCase());

    // Forward: ac → [air conditioner]
    if (!fresh.has(term)) fresh.set(term, new Set());
    syns.forEach(s => fresh.get(term).add(s));

    // Bidirectional: air conditioner → [ac]
    if (doc.bidirectional) {
      for (const syn of syns) {
        if (!fresh.has(syn)) fresh.set(syn, new Set());
        fresh.get(syn).add(term);
        // also link synonyms to each other
        syns.filter(s => s !== syn).forEach(s => fresh.get(syn).add(s));
      }
    }
  }

  // Convert Sets to Arrays
  cache = new Map([...fresh].map(([k, v]) => [k, [...v]]));
  lastLoaded = Date.now();

  console.log(`[SynonymCache] Loaded ${cache.size} entries`);
}

export async function getSynonymCache() {
  if (!lastLoaded || Date.now() - lastLoaded > TTL_MS) {
    await loadCache();
  }
  return cache;
}

// Call this after any admin update to synonyms — instant refresh
export async function invalidateCache() {
  lastLoaded = null;
  await loadCache();
}

// Warm the cache on server boot
export async function warmCache() {
  await loadCache();
}