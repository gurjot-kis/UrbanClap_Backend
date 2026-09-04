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

async function searchProducts(query, catFilter, skip) {
  const raw = await Product.find(
    { $text: { $search: query } },
    { score: { $meta: "textScore" } }
  ).select("name status").limit(5).lean();
  const docs = await Product.find(buildTextQuery(query, catFilter), {
    score: { $meta: "textScore" },
  })
    .select("name slug mainImage basePrice rating category_id")
    .sort({ score: { $meta: "textScore" }, "rating.average": -1 })
    .skip(skip)
    .limit(PAGE_SIZE)
    .lean();

  return docs.map((d) => ({
    ...d,
    _source: "service",
    _textScore: d.score || 0,
  }));
}

async function searchNativeProducts(query, catFilter, skip) {
  const docs = await NativeProduct.find(buildTextQuery(query, catFilter), {
    score: { $meta: "textScore" },
  })
    .select("product_name slug main_image base_price rating category_id")
    .sort({ score: { $meta: "textScore" }, "rating.average": -1 })
    .skip(skip)
    .limit(PAGE_SIZE)
    .lean();

  return docs.map((d) => ({
    ...d,
    _source: "native",
    _textScore: d.score || 0,
  }));
}

export const SearchService = {
  search: async ({
    query,
    categoryId,
    subCategoryId,
    type,
    page = 1,
    userId,
  }) => {
    const normalized = normalizeQuery(query);
    const expanded = await expandSynonyms(normalized);
    const catFilter = buildCategoryFilter(categoryId, subCategoryId);
    const skip = (page - 1) * PAGE_SIZE;

    const [serviceResults, nativeResults] = await Promise.all([
      type === "native" ? [] : searchProducts(expanded, catFilter, skip),
      type === "service" ? [] : searchNativeProducts(expanded, catFilter, skip),
    ]);

    const merged = mergeAndRank([...serviceResults, ...nativeResults]);

    SearchLog.create({
      query: normalized,
      user_id: userId ?? null,
      result_count: merged.length,
    }).catch(() => {});

    return {
      results: merged
        .slice(0, PAGE_SIZE)
        .map(({ score, _textScore, _score, ...rest }) => rest),
      total: merged.length,
      page,
    };
  },

  suggest: async ({ prefix, limit = 8 }) => {
    if (!prefix || prefix.length < 2) return [];

    const escaped = prefix.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const regex = new RegExp(escaped, "i");

    const [cats, natCats, products, nativeProducts, popularTerms] =
      await Promise.all([
        // 1. categories — highest priority
        Category.find({ name: regex, status: "active" }, { name: 1 })
          .limit(3)
          .lean(),

        NativeCategory.find({ name: regex, status: "active" }, { name: 1 })
          .limit(3)
          .lean(),

        // 2. products
        Product.find(
          { name: regex, status: "active" },
          { name: 1, slug: 1, mainImage: 1, "rating.average": 1 },
        )
          .sort({ "rating.average": -1 })
          .limit(5)
          .lean(),

        NativeProduct.find(
          { product_name: regex, status: "active" },
          { product_name: 1, slug: 1, main_image: 1, "rating.average": 1 },
        )
          .sort({ "rating.average": -1 })
          .limit(5)
          .lean(),

        // 3. what other users actually searched with this prefix — from SearchLog
        SearchLog.aggregate([
          { $match: { query: regex } },
          { $group: { _id: "$query", count: { $sum: 1 } } },
          { $sort: { count: -1 } },
          { $limit: 3 },
        ]),
      ]);

    const suggestions = [
      // popular search terms first — user sees what others searched
      ...popularTerms.map((t) => ({
        label: t._id,
        type: "popular_search",
        count: t.count,
        icon: "search",
      })),

      // categories second
      ...cats.map((c) => ({
        label: c.name,
        type: "category",
        source: "service",
        icon: "tag",
      })),
      ...natCats.map((c) => ({
        label: c.name,
        type: "category",
        source: "native",
        icon: "tag",
      })),

      // products last
      ...products.map((p) => ({
        label: p.name,
        type: "product",
        source: "service",
        slug: p.slug,
        image: p.mainImage,
        icon: "box",
      })),
      ...nativeProducts.map((p) => ({
        label: p.product_name,
        type: "product",
        source: "native",
        slug: p.slug,
        image: p.main_image,
        icon: "box",
      })),
    ];

    // dedupe by label, cap at limit
    const seen = new Set();
    return suggestions
      .filter((s) => {
        const key = s.label.toLowerCase();
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      })
      .slice(0, limit);
  },
};

export default SearchService;
