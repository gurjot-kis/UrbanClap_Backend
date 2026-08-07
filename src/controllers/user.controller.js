import { UserService } from "../services/user.service.js";

const sendError = (res, code, message) => {
  return res.status(code).json({
    success: false,
    code,
    message,
    data: null,
  });
};

export const UserController = {
  getUsers: async (req, res) => {
    try {
      const { page, limit, search, status } = req.query;
      const { users, pagination } = await UserService.getUsers({
        page,
        limit,
        search,
        status,
      });
      return res.status(200).json({
        success: true,
        code: 200,
        message: "Users fetched successfully",
        data: users,
        pagination,
      });
    } catch (err) {
      const message = err?.message || "Unable to fetch users";
      if (message === "status must be 0 or 1")
        return sendError(res, 400, message);
      return sendError(res, 500, "Unable to fetch users");
    }
  },

  getUserById: async (req, res) => {
    try {
      const { user_id } = req.params || {};
      const data = await UserService.getUserById({ user_id });
      return res.status(200).json({
        success: true,
        code: 200,
        message: "User fetched successfully",
        data,
      });
    } catch (err) {
      const message = err?.message || "Unable to fetch user";

      if (message === "User not found") {
        return sendError(res, 404, message);
      }

      return sendError(res, 400, message);
    }
  },

  addUser: async (req, res) => {
    try {
      const { fullName, email, password, phone, address, status } =
        req.body || {};
      const data = await UserService.addUser({
        fullName,
        email,
        password,
        phone,
        address,
        status,
      });
      return res.status(201).json({
        success: true,
        code: 201,
        message: "User created successfully",
        data,
      });
    } catch (err) {
      const message = err?.message || "User creation failed";

      if (message === "User already exists") {
        return sendError(res, 409, message);
      }

      return sendError(res, 400, message);
    }
  },

  // PUT /users/:user_id — full replace
  updateUser: async (req, res) => {
    try {
      const { user_id } = req.params || {};
      const {
        fullName,
        email,
        password,
        phone,
        address,
        status,
        vendorCategories,
        serviceableAreas,
        currentLocation,
        isAvailableNow,
        isVendorVerified,
      } = req.body || {};
      const data = await UserService.updateUser({
        user_id,
        fullName,
        email,
        password,
        phone,
        address,
        status,
        vendorCategories,
        serviceableAreas,
        currentLocation,
        isAvailableNow,
        isVendorVerified,
      });
      return res.status(200).json({
        success: true,
        code: 200,
        message: "User updated successfully",
        data,
      });
    } catch (err) {
      const message = err?.message || "User update failed";

      if (message === "User not found") {
        return sendError(res, 404, message);
      }

      if (message === "Email already in use") {
        return sendError(res, 409, message);
      }

      return sendError(res, 400, message);
    }
  },

  editUser: async (req, res) => {
    try {
      const { user_id } = req.params || {};
      const { fullName, email, password, phone, address, status } =
        req.body || {};
      const data = await UserService.editUser({
        user_id,
        fullName,
        email,
        password,
        phone,
        address,
        status,
      });
      return res.status(200).json({
        success: true,
        code: 200,
        message: "User updated successfully",
        data,
      });
    } catch (err) {
      const message = err?.message || "User update failed";

      if (message === "User not found") {
        return sendError(res, 404, message);
      }

      if (message === "Email already in use") {
        return sendError(res, 409, message);
      }

      return sendError(res, 400, message);
    }
  },

  deleteUser: async (req, res) => {
    try {
      const { user_id } = req.params || {};
      const data = await UserService.deleteUser({ user_id });
      return res.status(200).json({
        success: true,
        code: 200,
        message: "User deleted successfully",
        data,
      });
    } catch (err) {
      const message = err?.message || "User deletion failed";

      if (message === "User not found") {
        return sendError(res, 404, message);
      }

      return sendError(res, 400, message);
    }
  },

  updateUserLocation: async (req, res) => {
    try {
      const user_id = req.user?.user_id;
      const { latitude, longitude } = req.body || {};
      const data = await UserService.updateUserLocation({
        user_id,
        latitude,
        longitude,
      });
      return res.status(200).json({
        success: true,
        code: 200,
        message: "Location updated successfully",
        data,
      });
    } catch (err) {
      const message = err?.message || "Location update failed";

      if (message === "User not found") {
        return sendError(res, 404, message);
      }

      return sendError(res, 400, message);
    }
  },
};

export default UserController;
