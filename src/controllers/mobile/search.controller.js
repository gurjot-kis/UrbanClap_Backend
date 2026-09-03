import { recommend, search, suggest } from "../../services/search.service.js";

export const SearchController = {
  SearchItem: async (req, res) => {
    try {
      const { q, type, categoryId, subCategoryId, page } = req.query;

      if (!q || q.trim().length < 2)
        return res
          .status(400)
          .json({ success: false, message: "Query too short" });

      const data = await search({
        query: q,
        type: type,
        categoryId: categoryId,
        subCategoryId: subCategoryId,
        page: parseInt(page) || 1,
        userId: req.user?._id ?? null,
      });

      res.json({ success: true, ...data });
    } catch (error) {
      console.log(error);
    }
  },

  SuggestSearch: async (req, res) => {
    try {
      const { prefix, limit } = req.query;

      if (!prefix || prefix.length < 2)
        return res.json({ success: true, results: [] });

      const results = await suggest({ prefix, limit: parseInt(limit) || 8 });
      res.json({ success: true, results });
    } catch (error) {
      console.log(error);
    }
  },
};

export default SearchController;
