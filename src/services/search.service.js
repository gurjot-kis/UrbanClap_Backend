import Product from "../models/product.model.js";
import NativeProduct from "../models/nativeProduct.model.js";
import Category from "../models/category.model.js";
import NativeCategory from "../models/nativeCategory.model.js";
import SearchLog from "../models/searchLog.model.js";
import {
  normalizeQuery,
  expandSynonyms,
  buildTextQuery,
  buildCategoryFilter,
  mergeAndRank,
} from "../utils/queryHelper.js";

const PAGE_SIZE = 20;

// ─── SEARCH ──────────────────────────────────────────────────────────────────
export async function search({
  query,
  categoryId,
  subCategoryId,
  type,
  page = 1,
  userId,
}) {
  const normalized = normalizeQuery(query);
  const expanded = await expandSynonyms(normalized);
  const catFilter = buildCategoryFilter(categoryId, subCategoryId);
  const skip = (page - 1) * PAGE_SIZE;

  // Run both worlds in parallel — skip one if type filter is set
  const [serviceResults, nativeResults] = await Promise.all([
    type === "native" ? [] : searchProducts(expanded, catFilter, skip),
    type === "service" ? [] : searchNativeProducts(expanded, catFilter, skip),
  ]);

  const merged = mergeAndRank([...serviceResults, ...nativeResults]);

  // Fire-and-forget log (don't await — keeps response fast)
  SearchLog.create({
    query: normalized,
    user_id: userId ?? null,
    result_count: merged.length,
  }).catch(() => {});

  return {
    results: merged.slice(0, PAGE_SIZE),
    total: merged.length,
    page,
  };
}

async function searchProducts(query, catFilter, skip) {
  return Product.find(buildTextQuery(query, catFilter), {
    score: { $meta: "textScore" },
  })
    .select("name slug mainImage basePrice rating category_id")
    .sort({ score: { $meta: "textScore" }, "rating.average": -1 })
    .skip(skip)
    .limit(PAGE_SIZE)
    .lean()
    .then((docs) =>
      docs.map((d) => ({ ...d, _source: "service", _textScore: d.score || 0 })),
    );
}

async function searchNativeProducts(query, catFilter, skip) {
  return NativeProduct.find(buildTextQuery(query, catFilter), {
    score: { $meta: "textScore" },
  })
    .select("product_name slug main_image base_price rating category_id")
    .sort({ score: { $meta: "textScore" }, "rating.average": -1 })
    .skip(skip)
    .limit(PAGE_SIZE)
    .lean()
    .then((docs) =>
      docs.map((d) => ({ ...d, _source: "native", _textScore: d.score || 0 })),
    );
}

// ─── AUTOCOMPLETE ─────────────────────────────────────────────────────────────
export async function suggest({ prefix, limit = 8 }) {
  if (!prefix || prefix.length < 2) return [];

  const escaped = prefix.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const regex = new RegExp(escaped, "i");

  const [cats, natCats, products, nativeProducts] = await Promise.all([
    Category.find({ name: regex, status: "active" }, { name: 1, level: 1 })
      .limit(3)
      .lean(),
    NativeCategory.find(
      { name: regex, status: "active" },
      { name: 1, level: 1 },
    )
      .limit(3)
      .lean(),
    Product.find(
      { name: regex, status: "active" },
      { name: 1, slug: 1, mainImage: 1 },
    )
      .limit(5)
      .lean(),
    NativeProduct.find(
      { product_name: regex, status: "active" },
      { product_name: 1, slug: 1, main_image: 1 },
    )
      .limit(5)
      .lean(),
  ]);

  const suggestions = [
    ...cats.map((c) => ({
      label: c.name,
      type: "category",
      source: "service",
    })),
    ...natCats.map((c) => ({
      label: c.name,
      type: "category",
      source: "native",
    })),
    ...products.map((p) => ({
      label: p.name,
      type: "product",
      source: "service",
      slug: p.slug,
      image: p.mainImage,
    })),
    ...nativeProducts.map((p) => ({
      label: p.product_name,
      type: "product",
      source: "native",
      slug: p.slug,
      image: p.main_image,
    })),
  ];

  // Dedupe by label and cap
  const seen = new Set();
  return suggestions
    .filter((s) => {
      const key = s.label.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .slice(0, limit);
}
