import Product from "../models/product.model.js";
import Category from "../models/category.model.js";

const isValidObjectId = (id) => /^[a-f\d]{24}$/i.test(String(id ?? ""));
const relativeUploadPath = (subfolder, filename) =>
  `/uploads/${subfolder}/${filename}`;

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
  variants: (p.variants || []).map(({ label, price, image }) => ({
    label,
    price,
    image,
  })),
  durationMinutes: p.durationMinutes,
  rating: p.rating,
  status: p.status,
  createdAt: p.createdAt,
  updatedAt: p.updatedAt,
});

const mapCategoryBasic = (c) => ({
  _id: c._id,
  name: c.name,
  category_image: c.category_image || "",
});

const slugify = (str) =>
  String(str)
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "");

const parseMaybeJSON = (value, fieldName) => {
  if (value === undefined || value === null || value === "") return undefined;
  if (typeof value !== "string") return value;
  try {
    return JSON.parse(value);
  } catch {
    throw new Error(`Invalid ${fieldName} format`);
  }
};

export const ProductService = {
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

  // ─── Admin Panel ────────────────────────────────────────────────────────
  getAllProducts: async ({
    page = 1,
    limit = 10,
    status,
    category_id,
    search,
    sortBy = "createdAt",
    sortOrder = "desc",
  } = {}) => {
    // ── Validate pagination params ──
    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);
    if (isNaN(pageNum) || pageNum < 1) throw new Error("Invalid page number");
    if (isNaN(limitNum) || limitNum < 1 || limitNum > 100)
      throw new Error("Invalid limit number");

    // ── Build filter ──
    const filter = {};

    if (status) {
      const validStatuses = ["pending", "active", "rejected"];
      if (!validStatuses.includes(status))
        throw new Error("Invalid status value");
      filter.status = status;
    }

    if (category_id) {
      if (!isValidObjectId(category_id)) throw new Error("Invalid category_id");
      filter.category_id = category_id;
    }

    if (search && String(search).trim()) {
      filter.name = { $regex: String(search).trim(), $options: "i" };
    }

    // ── Build sort ──
    const allowedSortFields = [
      "createdAt",
      "updatedAt",
      "basePrice",
      "name",
      "rating.average",
    ];
    const sortField = allowedSortFields.includes(sortBy) ? sortBy : "createdAt";
    const sortDir = sortOrder === "asc" ? 1 : -1;
    const sort = { [sortField]: sortDir };

    // ── Run count + query in parallel ──
    const skip = (pageNum - 1) * limitNum;

    const [total, products] = await Promise.all([
      Product.countDocuments(filter),
      Product.find(filter)
        .select("-variants.costPrice") // hide cost price from listing
        .sort(sort)
        .skip(skip)
        .limit(limitNum)
        .lean()
        .exec(),
    ]);

    const totalPages = Math.ceil(total / limitNum);

    return {
      data: products.map(mapProduct),
      pagination: {
        total,
        totalPages,
        currentPage: pageNum,
        limit: limitNum,
        hasNextPage: pageNum < totalPages,
        hasPrevPage: pageNum > 1,
      },
    };
  },

  createProduct: async (body, files = {}) => {
    const {
      name,
      description = "",
      shortDescription = "",
      includes,
      category_id,
      sub_category_id,
      vendor_id,
      basePrice,
      variantLabel = "",
      variants,
      durationMinutes = 0,
      status = "pending",
      slug: slugInput,
    } = body;

    // ── Basic field validation ──
    if (!name || !String(name).trim()) {
      throw new Error("Product name is required");
    }
    if (basePrice === undefined || basePrice === null || basePrice === "") {
      throw new Error("Base price is required");
    }
    if (!isValidObjectId(category_id)) {
      throw new Error("Invalid category_id");
    }
    if (sub_category_id && !isValidObjectId(sub_category_id)) {
      throw new Error("Invalid sub_category_id");
    }
    if (vendor_id && !isValidObjectId(vendor_id)) {
      throw new Error("Invalid vendor_id");
    }

    // ── Category checks ──
    const category = await Category.findById(category_id).lean().exec();
    if (!category) throw new Error("Category not found");

    if (sub_category_id) {
      const subCategory = await Category.findById(sub_category_id)
        .lean()
        .exec();
      if (
        !subCategory ||
        String(subCategory.parent_id) !== String(category_id)
      ) {
        throw new Error("Sub-category not found in this category");
      }
    }

    // ── Files ──
    const mainImageFile = files?.mainImage?.[0];
    if (!mainImageFile) throw new Error("Main image is required");
    const mainImage = relativeUploadPath("products", mainImageFile.filename);

    const images = (files?.featuredImages || []).map((f) =>
      relativeUploadPath("products", f.filename),
    );

    // ✅ Build variant image path lookup by index
    const variantImageFiles = files?.variantImages || [];
    const variantImagePaths = variantImageFiles.map((f) =>
      relativeUploadPath("products/variants", f.filename),
    );

    // ── Parse JSON-ish fields sent as strings via formdata ──
    const parsedIncludes = parseMaybeJSON(includes, "includes") || [];
    const parsedVariants = parseMaybeJSON(variants, "variants") || [];

    if (!Array.isArray(parsedIncludes))
      throw new Error("Invalid includes format");
    if (!Array.isArray(parsedVariants))
      throw new Error("Invalid variants format");

    // ✅ Map imageIndex → actual uploaded file path
    const normalizedVariants = parsedVariants.map((v) => {
      const imageIndex = v.imageIndex ?? null;
      const image =
        imageIndex !== null && variantImagePaths[imageIndex]
          ? variantImagePaths[imageIndex]
          : (v.image ?? null); // fallback: URL string if passed directly

      return {
        label: v.label,
        price: Number(v.price),
        costPrice: Number(v.costPrice),
        image,
      };
    });

    // ── Slug ──
    let slug = slugify(slugInput || name);
    const existing = await Product.findOne({ slug }).lean().exec();
    if (existing) {
      if (slugInput) {
        // user explicitly supplied a slug that's taken
        throw new Error("Slug already exists");
      }
      // auto-generated collision, make it unique
      slug = `${slug}-${Date.now().toString(36)}`;
    }

    const product = await Product.create({
      name: String(name).trim(),
      slug,
      description,
      shortDescription,
      includes: parsedIncludes,
      mainImage,
      images,
      category_id,
      sub_category_id: sub_category_id || null,
      vendor_id: vendor_id || null,
      basePrice: Number(basePrice),
      variantLabel,
      variants: normalizedVariants,
      durationMinutes: Number(durationMinutes) || 0,
      status,
    });

    return mapProduct(product.toObject());
  },

  updateProduct: async (id, body, files = {}) => {
    if (!isValidObjectId(id)) throw new Error("Invalid product id");

    // ── Fetch existing product ──
    const existing = await Product.findById(id).lean().exec();
    if (!existing) throw new Error("Product not found");

    const {
      name,
      description,
      shortDescription,
      includes,
      category_id,
      sub_category_id,
      vendor_id,
      basePrice,
      variantLabel,
      variants,
      durationMinutes,
      status,
      slug: slugInput,
    } = body;

    // ── Category validation (only if provided) ──
    if (category_id !== undefined) {
      if (!isValidObjectId(category_id)) throw new Error("Invalid category_id");
      const category = await Category.findById(category_id).lean().exec();
      if (!category) throw new Error("Category not found");
    }

    const resolvedCategoryId = category_id ?? String(existing.category_id);

    if (
      sub_category_id !== undefined &&
      sub_category_id !== null &&
      sub_category_id !== ""
    ) {
      if (!isValidObjectId(sub_category_id))
        throw new Error("Invalid sub_category_id");
      const subCategory = await Category.findById(sub_category_id)
        .lean()
        .exec();
      if (
        !subCategory ||
        String(subCategory.parent_id) !== String(resolvedCategoryId)
      ) {
        throw new Error("Sub-category not found in this category");
      }
    }

    if (vendor_id !== undefined && vendor_id !== null && vendor_id !== "") {
      if (!isValidObjectId(vendor_id)) throw new Error("Invalid vendor_id");
    }

    // ── Slug (only if name or slug changed) ──
    let slug = existing.slug;
    if (slugInput || name) {
      const newSlug = slugify(slugInput || name);
      if (newSlug !== existing.slug) {
        const conflict = await Product.findOne({
          slug: newSlug,
          _id: { $ne: id },
        })
          .lean()
          .exec();
        if (conflict) throw new Error("Slug already exists");
        slug = newSlug;
      }
    }

    // ────────────────────────────────────────────────────────────────────────
    // IMAGE HANDLING
    // ────────────────────────────────────────────────────────────────────────

    // ── Main image: use new file if uploaded, else keep existing ──
    const mainImageFile = files?.mainImage?.[0];
    const mainImage = mainImageFile
      ? relativeUploadPath("products", mainImageFile.filename)
      : existing.mainImage;

    // ── Featured images: replace all if new files uploaded, else keep existing ──
    const featuredFiles = files?.featuredImages || [];
    const images =
      featuredFiles.length > 0
        ? featuredFiles.map((f) => relativeUploadPath("products", f.filename))
        : existing.images;

    // ── Variant images: build path array from new uploads ──
    const variantImageFiles = files?.variantImages || [];
    const variantImagePaths = variantImageFiles.map((f) =>
      relativeUploadPath("products/variants", f.filename),
    );

    // ────────────────────────────────────────────────────────────────────────
    // VARIANT HANDLING
    // ────────────────────────────────────────────────────────────────────────

    let finalVariants = existing.variants; // default: keep everything as-is

    if (variants !== undefined) {
      const parsedVariants = parseMaybeJSON(variants, "variants");
      if (!Array.isArray(parsedVariants))
        throw new Error("Invalid variants format");

      // Build a map of existing variants keyed by lowercase label for fast lookup
      const existingVariantMap = new Map(
        existing.variants.map((v) => [v.label.toLowerCase(), v]),
      );

      const updatedMap = new Map(
        existing.variants.map((v) => [v.label.toLowerCase(), { ...v }]),
      );

      for (const incoming of parsedVariants) {
        const key = String(incoming.label).toLowerCase();
        const existingVariant = existingVariantMap.get(key);

        // Resolve image for this incoming variant
        let image;
        if (incoming.imageIndex !== null && incoming.imageIndex !== undefined) {
          // New file uploaded for this variant
          image =
            variantImagePaths[incoming.imageIndex] ??
            existingVariant?.image ??
            null;
        } else if (existingVariant) {
          // No new image → keep old image
          image = existingVariant.image ?? null;
        } else {
          // Brand new variant with no image
          image = incoming.image ?? null;
        }

        if (existingVariant) {
          // ── Matched: update only provided fields ──
          updatedMap.set(key, {
            label: existingVariant.label, // label is the key, keep original casing
            price:
              incoming.price !== undefined
                ? Number(incoming.price)
                : existingVariant.price,
            costPrice:
              incoming.costPrice !== undefined
                ? Number(incoming.costPrice)
                : existingVariant.costPrice,
            image,
          });
        } else {
          // ── New variant: add it ──
          updatedMap.set(key, {
            label: incoming.label,
            price: Number(incoming.price),
            costPrice: Number(incoming.costPrice),
            image,
          });
        }
      }

      finalVariants = Array.from(updatedMap.values());
    }

    // ────────────────────────────────────────────────────────────────────────
    // BUILD UPDATE PAYLOAD — only include fields that were actually sent
    // ────────────────────────────────────────────────────────────────────────

    const updatePayload = {
      mainImage,
      images,
      slug,
      variants: finalVariants,
    };

    if (name !== undefined) updatePayload.name = String(name).trim();
    if (description !== undefined) updatePayload.description = description;
    if (shortDescription !== undefined)
      updatePayload.shortDescription = shortDescription;
    if (variantLabel !== undefined) updatePayload.variantLabel = variantLabel;
    if (durationMinutes !== undefined)
      updatePayload.durationMinutes = Number(durationMinutes);
    if (status !== undefined) updatePayload.status = status;
    if (basePrice !== undefined) updatePayload.basePrice = Number(basePrice);
    if (category_id !== undefined) updatePayload.category_id = category_id;
    if (vendor_id !== undefined) updatePayload.vendor_id = vendor_id || null;

    if (sub_category_id !== undefined) {
      updatePayload.sub_category_id =
        sub_category_id === "" || sub_category_id === null
          ? null
          : sub_category_id;
    }

    if (includes !== undefined) {
      const parsedIncludes = parseMaybeJSON(includes, "includes");
      if (!Array.isArray(parsedIncludes))
        throw new Error("Invalid includes format");
      updatePayload.includes = parsedIncludes;
    }

    // ── Save ──
    const updated = await Product.findByIdAndUpdate(
      id,
      { $set: updatePayload },
      { new: true, runValidators: true },
    )
      .lean()
      .exec();

    return mapProduct(updated);
  },

  updateProductStatus: async (id, status) => {
    if (!isValidObjectId(id)) throw new Error("Invalid product id");

    if (!status) throw new Error("Status is required");
    const validStatuses = ["pending", "active", "rejected"];
    if (!validStatuses.includes(status))
      throw new Error("Invalid status value");

    const existing = await Product.findById(id).select("status").lean().exec();
    if (!existing) throw new Error("Product not found");

    const updated = await Product.findByIdAndUpdate(
      id,
      { $set: { status } },
      { new: true },
    )
      .lean()
      .exec();

    return mapProduct(updated);
  },

  deleteProduct: async (id) => {
    if (!isValidObjectId(id)) throw new Error("Invalid product id");

    const product = await Product.findById(id).lean().exec();
    if (!product) throw new Error("Product not found");

    await Product.findByIdAndDelete(id).exec();

    return {
      _id: product._id,
      name: product.name,
      slug: product.slug,
    };
  },
};

export default ProductService;
