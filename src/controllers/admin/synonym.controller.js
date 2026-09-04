import { sendError, sendSuccess } from "../../helpers/response.helper.js";
import SynonymMapModel from "../../models/synonymMap.model.js";
import { invalidateCache } from "../../utils/synonymCache.js";

const SynonymController = {
  getAllSynonyms: async (req, res) => {
    try {
      const synonyms = await SynonymMapModel.find()
        .sort({ usageCount: -1 })
        .lean();
      return sendSuccess(res, {
        message: "Synonyms fetched successfully",
        data: synonyms,
      });
    } catch (error) {
      return sendError(res, {
        code: 500,
        message: "Failed to fetch synonyms",
        error: error.message,
      });
    }
  },

  getSynonymById: async (req, res) => {
    try {
      const { id } = req.params;

      const synonym = await SynonymMapModel.findById(id).lean();

      if (!synonym) {
        return sendError(res, {
          code: 404,
          message: "Synonym not found",
        });
      }

      return sendSuccess(res, {
        message: "Synonym fetched successfully",
        data: synonym,
      });
    } catch (error) {
      return sendError(res, {
        code: 500,
        message: "Failed to fetch synonym",
        error: error.message,
      });
    }
  },

  AddSynonym: async (req, res) => {
    try {
      const { term, synonyms, bidirectional } = req.body;
      const doc = await SynonymMapModel.create({
        term,
        synonyms,
        bidirectional,
      });
      await invalidateCache();
      return sendSuccess(res, {
        message: "Synonym added successfully",
        data: doc,
      });
    } catch (error) {
      console.error("Error adding synonym:", error);
      return sendError(res, {
        code: 500,
        message: "Failed to add synonym",
        error: error.message,
      });
    }
  },

  UpdateSynonym: async (req, res) => {
    try {
      const { term, synonyms, bidirectional, status } = req.body;

      const updateData = {};

      if (term !== undefined) {
        updateData.term = term;
      }

      if (bidirectional !== undefined) {
        updateData.bidirectional = bidirectional;
      }

      if (status !== undefined) {
        updateData.status = status;
      }

      // Append new synonyms without removing existing ones
      if (Array.isArray(synonyms) && synonyms.length > 0) {
        updateData.$addToSet = {
          synonyms: {
            $each: synonyms,
          },
        };
      }

      const doc = await SynonymMapModel.findByIdAndUpdate(
        req.params.id,
        updateData,
        {
          new: true,
          runValidators: true,
        },
      );

      if (!doc) {
        return sendError(res, {
          code: 404,
          message: "Synonym not found",
        });
      }

      await invalidateCache();

      return sendSuccess(res, {
        message: "Synonym updated successfully",
        data: doc,
      });
    } catch (error) {
      console.error("Error updating synonym:", error);

      return sendError(res, {
        code: 500,
        message: "Failed to update synonym",
        error: error.message,
      });
    }
  },

  deleteSynonym: async (req, res) => {
    try {
      const doc = await SynonymMapModel.findByIdAndDelete(req.params.id);
      if (!doc) {
        return sendError(res, { code: 404, message: "Synonym not found" });
      }
      await invalidateCache();
      return sendSuccess(res, {
        message: "Synonym deleted successfully",
        data: doc,
      });
    } catch (error) {
      console.error("Error deleting synonym:", error);
      return sendError(res, {
        code: 500,
        message: "Failed to delete synonym",
        error: error.message,
      });
    }
  },
};

export default SynonymController;
