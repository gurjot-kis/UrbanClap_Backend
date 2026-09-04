import { getSynonymCache } from "./synonymCache.js";

// Normalize raw input before hitting MongoDB
export function normalizeQuery(raw = "") {
  return raw
    .trim()
    .toLowerCase()
    .replace(/[^\w\s]/g, "")
    .trim();
}

export async function expandSynonyms(query) {
  const cache = await getSynonymCache();
  const words = query.toLowerCase().split(/\s+/);

  const allTerms = new Set();

  // check individual words
  for (const word of words) {
    allTerms.add(word);
    const matches = cache.get(word) || [];
    matches.forEach((m) => allTerms.add(m));
  }

  // check full query as one key
  const fullMatches = cache.get(query.toLowerCase()) || [];
  fullMatches.forEach((m) => allTerms.add(m));

  const expanded = [...allTerms].join(" "); // plain, no quotes

  return expanded;
}

// Build MongoDB $text search query
export function buildTextQuery(query, extraFilters = {}) {
  return {
    $text: { $search: query },
    status: "active",
    ...extraFilters,
  };
}

// Build category filter if category_id is passed
export function buildCategoryFilter(categoryId, subCategoryId) {
  const filter = {};
  if (categoryId) filter.category_id = categoryId;
  if (subCategoryId) filter.sub_category_id = subCategoryId;
  return filter;
}

// Merge & rank results from both worlds by composite score
export function mergeAndRank(results) {
  return results
    .map((item) => ({
      ...item,
      _score: computeScore(item),
    }))
    .sort((a, b) => b._score - a._score);
}

function computeScore(item) {
  const textScore = item._textScore || 0;
  const rating = item.rating?.average || 0;
  const ratingCount = item.rating?.count || 0;

  // Weighted formula — tune these multipliers anytime
  return textScore * 40 + rating * 15 + Math.log1p(ratingCount) * 5;
}
