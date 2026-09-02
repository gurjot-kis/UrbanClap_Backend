import { sendError, sendSuccess } from "../../helpers/response.helper.js";
import PageContentService from "../../services/page-content.service.js";

export const PageContentController = {
  fetchHomePagePromotionalBannerData: async (req, res) => {
    try {
      const result = await PageContentService.HomePagePromotionalBanner();

      return sendSuccess(res, {
        message: "Promotional banner data fetched successfully",
        data: result,
      });
    } catch (error) {
      return sendError(res, {
        code: 500,
        message: error.message,
      });
    }
  },

  fetchSpotlightData: async (req, res) => {
    try {
      const result = await PageContentService.HomePageSpotlightData();

      return sendSuccess(res, {
        message: "Spotlight data fetched successfully",
        data: result,
      });
    } catch (error) {
      return sendError(res, {
        code: 500,
        message: error.message,
      });
    }
  },
};

export default PageContentController;
