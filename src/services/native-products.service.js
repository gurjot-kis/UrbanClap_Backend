import NativeCategory from "../models/nativeCategory.model.js";
import NativeProduct from "../models/nativeProduct.model.js";

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
      .limit(5)
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
};

export default NativeProductService;
