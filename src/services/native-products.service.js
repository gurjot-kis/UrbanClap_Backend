import NativeCategory from "../models/nativeCategory.model.js";
import NativeProduct from "../models/nativeProduct.model.js";
import NativeDescription from "../models/native-description.model.js";

export const NativeProductService = {
  getNativeProductsListForMobile: async () => {
    // ─── 1. Fetch all active categories ───────────────────────────────────
    const categories = await NativeCategory.find(
      { status: "active" },
      { _id: 1, name: 1, title: 1, description: 1, category_image: 1 },
    ).lean();

    // ─── 2. Fetch last 5 products per category in parallel ────────────────
    const productsByCategory = await Promise.all(
      categories.map(async (cat) => {
        const products = await NativeProduct.find(
          { category_id: cat._id, status: "active" },
          {
            _id: 1,
            product_name: 1,
            main_image: 1,
            base_price: 1,
            rating: 1,
            options: 1,
          },
        )
          .sort({ createdAt: -1 })
          .limit(5)
          .lean();

        return {
          categoryName: cat.name,
          categoryTitle: cat.title,
          categoryDescription: cat.description,
          products: products.map((p) => ({
            _id: p._id,
            product_name: p.product_name,
            main_image: p.main_image,
            base_price: p.base_price,
            rating: p.rating,
            options_count: p.options?.length ?? 0,
          })),
        };
      }),
    );

    // ─── 3. Newly launched — last 5 products overall ──────────────────────
    const newlyLaunched = await NativeProduct.find(
      { status: "active" },
      {
        _id: 1,
        product_name: 1,
        main_image: 1,
        base_price: 1,
        rating: 1,
        options: 1,
      },
    )
      .sort({ createdAt: -1 })
      .limit(3)
      .lean();

    // ─── 4. Build dynamic response ────────────────────────────────────────
    const response = {
      categories: categories.map((cat) => ({
        _id: cat._id,
        name: cat.name,
        category_image: cat.category_image,
      })),
    };

    // category name as dynamic key with title, description and products
    productsByCategory.forEach(
      ({ categoryName, categoryTitle, categoryDescription, products }) => {
        response[categoryName] = {
          title: categoryTitle,
          description: categoryDescription,
          products,
        };
      },
    );

    // newly launched
    response["newly_launched"] = {
      title: "Newly Launched",
      products: newlyLaunched.map((p) => ({
        _id: p._id,
        product_name: p.product_name,
        main_image: p.main_image,
        base_price: p.base_price,
        rating: p.rating,
        options_count: p.options?.length ?? 0,
      })),
    };

    return response;
  },

  getNativeDescriptionForMobile: async () => {
    const description = await NativeDescription.findOne(
      {},
      {
        _id: 1,
        descriptionMedia: 1,
      },
    ).lean();

    if (!description) {
      return {
        _id: null,
        descriptionMedia: [],
      };
    }

    description.descriptionMedia.sort((a, b) => a.sort_order - b.sort_order);

    return {
      _id: description._id,
      descriptionMedia: description.descriptionMedia,
    };
  },

  getNativeProductDetailForMobile: async (id) => {
    const product = await NativeProduct.findOne(
      { _id: id, status: "active" },
      {
        _id: 1,
        product_name: 1,
        slug: 1,
        base_price: 1,
        main_image: 1,
        rating: 1,
        options: 1,
        exchange_steps: 1,
        banner_gallery: 1,
        product_details: 1,
        product_specification: 1,
        category_id: 1,
        sub_category_id: 1,
      },
    ).lean();

    if (!product) throw new Error("Product not found");

    // ─── Sort options: no natural order field, keep as-is ─────────────────
    const options = (product.options ?? []).map((opt) => ({
      _id: opt._id,
      label: opt.label,
      image: opt.image ?? null,
      price: opt.price,
      rating: opt.rating,
    }));

    // ─── Sort exchange_steps by step number ascending ──────────────────────
    const exchangeSteps = (product.exchange_steps ?? [])
      .sort((a, b) => a.step - b.step)
      .map((s) => ({
        _id: s._id,
        step: s.step,
        url: s.url,
      }));

    // ─── Sort banner_gallery by sort_order ascending ───────────────────────
    const bannerGallery = (product.banner_gallery ?? [])
      .sort((a, b) => a.sort_order - b.sort_order)
      .map((item) => ({
        _id: item._id,
        type: item.type,
        sort_order: item.sort_order,
        ...(item.type === "slider"
          ? {
              slider_title: item.slider_title ?? null,
              slider_images: item.slider_images ?? [],
            }
          : { url: item.url }),
      }));

    // ─── Sort product_details by sort_order ascending ─────────────────────
    const productDetails = (product.product_details ?? [])
      .sort((a, b) => a.sort_order - b.sort_order)
      .map((item) => ({
        _id: item._id,
        type: item.type,
        sort_order: item.sort_order,
        ...(item.type === "slider"
          ? {
              slider_title: item.slider_title ?? null,
              slider_images: item.slider_images ?? [],
            }
          : { url: item.url }),
      }));

    // ─── Sort product_specification.full_desc_content by sort_order ───────
    const specification = {
      short_desc_image: product.product_specification?.short_desc_image ?? null,
      full_desc_content: (
        product.product_specification?.full_desc_content ?? []
      )
        .sort((a, b) => a.sort_order - b.sort_order)
        .map((item) => ({
          sort_order: item.sort_order,
          image: item.image,
        })),
    };

    return {
      _id: product._id,
      product_name: product.product_name,
      slug: product.slug,
      base_price: product.base_price,
      main_image: product.main_image,
      rating: product.rating,
      category_id: product.category_id,
      sub_category_id: product.sub_category_id ?? null,
      options,
      exchange_steps: exchangeSteps,
      banner_gallery: bannerGallery,
      product_details: productDetails,
      product_specification: specification,
    };
  },
};

export default NativeProductService;
