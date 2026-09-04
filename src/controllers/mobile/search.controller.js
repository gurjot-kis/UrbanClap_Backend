import { sendError, sendSuccess } from "../../helpers/response.helper.js";
import SearchService from "../../services/search.service.js";

export const SearchController = {
  SearchItem: async (req, res) => {
    try {
      const { q, type, categoryId, subCategoryId, page } = req.query;

      if (!q || q.trim().length < 2) {
        return sendError(res, {
          code: 400,
          message: "Query must be at least 2 characters long",
        });
      }

      const data = await SearchService.search({
        query: q,
        type: type,
        categoryId: categoryId,
        subCategoryId: subCategoryId,
        page: parseInt(page) || 1,
        userId: req.user?._id ?? null,
      });

      return sendSuccess(res, {
        message: "Search results fetched successfully",
        data,
      });
    } catch (error) {
      return sendError(res, {
        code: 500,
        message: "Failed to search items",
        error: error.message,
      });
    }
  },

  SuggestSearch: async (req, res) => {
    try {
      const { prefix, limit } = req.query;

      if (!prefix || prefix.trim().length < 2) {
        return sendSuccess(res, {
          message: "Search suggestions fetched successfully",
          data: [],
        });
      }

      const results = await SearchService.suggest({
        prefix,
        limit: parseInt(limit) || 8,
      });
      return sendSuccess(res, {
        message: "Search suggestions fetched successfully",
        data: results,
      });
    } catch (error) {
      return sendError(res, {
        code: 500,
        message: "Failed to fetch search suggestions",
        error: error.message,
      });
    }
  },
};

export default SearchController;
