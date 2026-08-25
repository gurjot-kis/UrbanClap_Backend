import PageContentModel from "../models/static-contents.model.js";

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

    if (data.spotlightContent?.length) {
      data.spotlightContent.sort(
        (a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0),
      );
    }

    return data;
  },
};

export default PageContentService;
