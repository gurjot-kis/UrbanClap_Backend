import Category from "../models/category.model.js";
import NativeCategory from "../models/nativeCategory.model.js";

async function resolveDisplayCategoriesWithModel(products, CategoryModel) {
  const subCategoryIds = [
    ...new Set(
      products
        .filter((p) => p.sub_category_id)
        .map((p) => String(p.sub_category_id)),
    ),
  ];

  const subCategories = subCategoryIds.length
    ? await CategoryModel.find({ _id: { $in: subCategoryIds } })
        .select("_id parent_id")
        .lean()
        .exec()
    : [];

  const subCategoryParentMap = new Map(
    subCategories.map((sc) => [
      String(sc._id),
      sc.parent_id ? String(sc.parent_id) : null,
    ]),
  );

  const displayCategoryIds = new Set();

  for (const p of products) {
    let displayId = null;

    if (p.sub_category_id) {
      const parentId = subCategoryParentMap.get(String(p.sub_category_id));
      displayId = parentId || String(p.category_id);
    } else {
      displayId = p.category_id ? String(p.category_id) : null;
    }

    if (displayId) displayCategoryIds.add(displayId);
  }

  const categories = displayCategoryIds.size
    ? await CategoryModel.find({ _id: { $in: [...displayCategoryIds] } })
        .select("_id name")
        .lean()
        .exec()
    : [];

  const categoryMap = new Map(categories.map((c) => [String(c._id), c]));

  const resolution = new Map();

  for (const p of products) {
    let displayId = null;

    if (p.sub_category_id) {
      const parentId = subCategoryParentMap.get(String(p.sub_category_id));
      displayId = parentId || String(p.category_id);
    } else {
      displayId = p.category_id ? String(p.category_id) : null;
    }

    const category = displayId ? categoryMap.get(displayId) : null;

    resolution.set(String(p._id ?? p.product_id), {
      _id: category?._id ?? null,
      name: category?.name ?? "Uncategorized",
    });
  }

  return resolution;
}

// Named exports — each caller uses the right one, no changes needed at existing call sites
export async function resolveDisplayCategories(products) {
  return resolveDisplayCategoriesWithModel(products, Category);
}

export async function resolveNativeDisplayCategories(products) {
  return resolveDisplayCategoriesWithModel(products, NativeCategory);
}

export default resolveDisplayCategories;
