import Product from "../models/product.model.js";
import Category from "../models/category.model.js";

const isValidObjectId = (id) => /^[a-f\d]{24}$/i.test(String(id ?? ""));

const mapProduct = (p) => ({
  _id: p._id,
  name: p.name,
  slug: p.slug,
  description: p.description,
  shortDescription: p.shortDescription,
  includes: p.includes,
  mainImage: p.mainImage,
  images: p.images,
  category_id: p.category_id,
  sub_category_id: p.sub_category_id,
  vendor_id: p.vendor_id,
  basePrice: p.basePrice,
  variantLabel: p.variantLabel,
  variants: (p.variants || []).map(({ label, price }) => ({ label, price })),
  durationMinutes: p.durationMinutes,
  rating: p.rating,
  status: p.status,
  createdAt: p.createdAt,
  updatedAt: p.updatedAt,
});

const mapCategory = (c) =>
  c
    ? {
        _id: c._id,
        name: c.name,
        level: c.level,
        description: c.description || "",
        category_image: c.category_image || "",
      }
    : null;

const mapCategoryBasic = (c) => ({
  _id: c._id,
  name: c.name,
  category_image: c.category_image || "",
});

export const ProductService = {
  getProductsBySubCategory: async (
    sub_category_id,
    { page = 1, limit = 10 } = {},
  ) => {
    if (!isValidObjectId(sub_category_id))
      throw new Error("Invalid sub_category_id");

    const sub = await Category.findById(sub_category_id).lean().exec();
    if (!sub) throw new Error("Sub-category not found");

    if (!sub.parent_id) throw new Error("Sub-category not found");

    const cat = await Category.findById(sub.parent_id).lean().exec();
    if (!cat) throw new Error("Category not found");

    const parsedPage = Math.max(1, parseInt(page, 10) || 1);
    const parsedLimit = Math.min(100, Math.max(1, parseInt(limit, 10) || 10));
    const skip = (parsedPage - 1) * parsedLimit;

    const filter = { sub_category_id, status: "active" };

    const [products, total] = await Promise.all([
      Product.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parsedLimit)
        .lean()
        .exec(),
      Product.countDocuments(filter),
    ]);

    return {
      category: mapCategory(cat),
      sub_category: mapCategory(sub),
      products: products.map(mapProduct),
      pagination: {
        total,
        page: parsedPage,
        limit: parsedLimit,
        totalPages: Math.ceil(total / parsedLimit),
        hasNextPage: parsedPage < Math.ceil(total / parsedLimit),
        hasPrevPage: parsedPage > 1,
      },
    };
  },

  getProductById: async (id) => {
    if (!isValidObjectId(id)) throw new Error("Invalid product id");

    const product = await Product.findById(id).lean().exec();
    if (!product) throw new Error("Product not found");

    const catIds = [product.category_id, product.sub_category_id].filter(
      Boolean,
    );
    const cats = catIds.length
      ? await Category.find({ _id: { $in: catIds } })
          .select("_id name")
          .lean()
          .exec()
      : [];
    const catMap = Object.fromEntries(cats.map((c) => [String(c._id), c.name]));

    return {
      ...mapProduct(product),
      category_name: catMap[String(product.category_id)] || null,
      sub_category_name: catMap[String(product.sub_category_id)] || null,
    };
  },

  getChildCategoriesWithProducts: async (
    category_id,
    { limitPerCategory = 10 } = {},
  ) => {
    if (!isValidObjectId(category_id)) throw new Error("Invalid category_id");

    const parent = await Category.findById(category_id).lean().exec();
    if (!parent) throw new Error("Category not found");

    const children = await Category.find({ parent_id: category_id })
      .select("_id name category_image")
      .lean()
      .exec();

    if (!children.length) {
      throw new Error("No sub-categories found under this category");
    }

    const childIds = children.map((c) => c._id);
    const perCategoryLimit = Math.min(
      50,
      Math.max(1, parseInt(limitPerCategory, 10) || 10),
    );

    const products = await Product.find({
      sub_category_id: { $in: childIds },
      status: "active",
    })
      .select("-variants.costPrice")
      .sort({ createdAt: -1 })
      .lean()
      .exec();

    const productsByChild = new Map(childIds.map((id) => [String(id), []]));
    for (const p of products) {
      const key = String(p.sub_category_id);
      const bucket = productsByChild.get(key);
      if (bucket && bucket.length < perCategoryLimit) {
        bucket.push(mapProduct(p));
      }
    }

    return {
      category: mapCategoryBasic(parent),
      categories: children.map(mapCategoryBasic),
      product_details: children.map((c) => ({
        ...mapCategoryBasic(c),
        products: productsByChild.get(String(c._id)) || [],
      })),
    };
  },
};

export default ProductService;
