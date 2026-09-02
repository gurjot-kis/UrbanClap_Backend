import PageContentModel from "../models/static-contents.model.js";
import CategoryModel from "../models/category.model.js";

export const PageContentService = {
  HomePagePromotionalBanner: async () => {
    const data = await PageContentModel.findOne({
      page: "Home",
      section: "promotional_banner",
      key: "main_promotional_banner",
    })
      .select("backgroundImage sliderContent")
      .lean();

    if (!data) {
      throw new Error("Home page promotional banner not found");
    }

    return data;
  },

  HomePageSpotlightData: async () => {
    const data = await PageContentModel.findOne({
      page: "Home",
      section: "spotlight",
      key: "home_spotlight",
    })
      .select("sectionTitle spotlightContent")
      .lean();

    if (!data) {
      throw new Error("Home page spotlight data not found");
    }

    const spotlightContent = (data.spotlightContent ?? [])
      .filter((item) => item.status === "active")
      .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));

    const categoryIds = spotlightContent
      .filter((item) => item.categoryId)
      .map((item) => item.categoryId);

    let categoryMap = {};

    if (categoryIds.length) {
      const childCategories = await CategoryModel.find({
        parent_id: { $in: categoryIds },
        status: "active",
      })
        .select("_id name category_image parent_id")
        .lean();

      childCategories.forEach(({ parent_id, ...category }) => {
        const parentId = parent_id.toString();

        if (!categoryMap[parentId]) {
          categoryMap[parentId] = [];
        }

        categoryMap[parentId].push(category);
      });
    }
    data.spotlightContent = spotlightContent.map(
      ({ status, categoryId, ...item }, index) => ({
        ...item,
        sortOrder: index + 1,
        ...(categoryId
          ? {
              categoryDetails: categoryMap[categoryId.toString()] ?? [],
            }
          : {}),
      }),
    );

    return data;
  },
};

export default PageContentService;
