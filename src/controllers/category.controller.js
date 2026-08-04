import { CategoryService } from "../services/category.service.js";

import Category from "../models/category.model.js";



const sendError = (res, code, message) => {
  return res.status(code).json({
    success: false,
    code,
    message,
    data: null,
  });
};

export const CategoryController = {
  createCategory: async (req, res) => {
    try {
      const payload = { ...(req.body || {}) };
      if (req.file) {
        payload.category_image = `/uploads/categories/${req.file.filename}`;
      }

      const data = await CategoryService.createCategory(payload);
      return res.status(200).json({
        success: true,
        code: 200,
        message: "Category created successfully",
        data,
      });
    } catch (err) {
      const message = err?.message || "Category creation failed";

      if (message === "Category already exists") {
        return sendError(res, 409, message);
      }

      return sendError(res, 400, message);
    }
  },

getCategories: async (req, res) => {
  try {
    const categories = await Category.aggregate([
      {
        $match: { level: 1 }
      },
      {
        $lookup: {
          from: "categories",
          let: { parentId: "$_id" },
          pipeline: [
            {
              $match: {
                $expr: { $eq: ["$parent_id", "$$parentId"] }
              }
            },
            {
              $lookup: {
                from: "categories",
                let: { childId: "$_id" },
                pipeline: [
                  {
                    $match: {
                      $expr: { $eq: ["$parent_id", "$$childId"] }
                    }
                  },
                  {
                    $project: {
                      name: 1,
                      level: 1,
                      description: 1,
                      category_image: 1
                    }
                  }
                ],
                as: "children"
              }
            },
            {
              $project: {
                name: 1,
                level: 1,
                description: 1,
                category_image: 1,
                children: 1
              }
            }
          ],
          as: "children"
        }
      },
      {
        $project: {
          name: 1,
          level: 1,
          description: 1,
          category_image: 1,
          children: 1
        }
      }
    ]);

    res.status(200).json({
      success: true,
      data: categories
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
},

  getCategoryById: async (req, res) => {
    try {
      const { category_id } = req.params || {};
      const data = await CategoryService.getCategoryById({ category_id });
      return res.status(200).json({
        success: true,
        code: 200,
        message: "Category fetched successfully",
        data,
      });
    } catch (err) {
      const message = err?.message || "Unable to fetch category";

      if (message === "Category not found") {
        return sendError(res, 404, message);
      }

      return sendError(res, 400, message);
    }
  },

  updateCategory: async (req, res) => {
    try {
      const { category_id } = req.params || {};
      const payload = { ...(req.body || {}) };
      if (req.file) {
        payload.category_image = `/uploads/categories/${req.file.filename}`;
      }

      const data = await CategoryService.updateCategory({ category_id, ...payload });
      return res.status(200).json({
        success: true,
        code: 200,
        message: "Category updated successfully",
        data,
      });
    } catch (err) {
      const message = err?.message || "Category update failed";

      if (message === "Category not found") {
        return sendError(res, 404, message);
      }

      if (message === "Category name already exists") {
        return sendError(res, 409, message);
      }

      return sendError(res, 400, message);
    }
  },

  deleteCategory: async (req, res) => {
    try {
      const { category_id } = req.params || {};
      const data = await CategoryService.deleteCategory({ category_id });
      return res.status(200).json({
        success: true,
        code: 200,
        message: "Category deleted successfully",
        data,
      });
    } catch (err) {
      const message = err?.message || "Category deletion failed";

      if (message === "Category not found") {
        return sendError(res, 404, message);
      }

      return sendError(res, 400, message);
    }
  },
};

export default CategoryController;

