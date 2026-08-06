import { sendError, sendSuccess } from "../helpers/response.helper.js";
import { AddressService } from "../services/address.service.js";

export const AddressController = {
  addAddress: async (req, res) => {
    try {
      const userId = req.user?._id;
      const data = await AddressService.addAddress(userId, req.body || {});

      return sendSuccess(res, {
        code: 200,
        message: "Address added successfully",
        data,
      });
    } catch (err) {
      return sendError(res, {
        code: err.statusCode || 400,
        message: err.message || "Unable to add address",
        error: err.message || null,
      });
    }
  },

  listAddresses: async (req, res) => {
    try {
      const userId = req.user?._id;
      const data = await AddressService.listAddresses(userId);

      return sendSuccess(res, {
        code: 200,
        message: "Address list fetched successfully",
        data,
      });
    } catch (err) {
      return sendError(res, {
        code: err.statusCode || 400,
        message: err.message || "Unable to fetch addresses",
        error: err.message || null,
      });
    }
  },

  getAddressById: async (req, res) => {
    try {
      const userId = req.user?._id;
      const { id } = req.params;
      const data = await AddressService.getAddressById(userId, id);

      return sendSuccess(res, {
        code: 200,
        message: "Address fetched successfully",
        data,
      });
    } catch (err) {
      return sendError(res, {
        code: err.statusCode || 400,
        message: err.message || "Unable to fetch address",
        error: err.message || null,
      });
    }
  },

  updateAddress: async (req, res) => {
    try {
      const userId = req.user?._id;
      const { id } = req.params;
      const data = await AddressService.updateAddress(
        userId,
        id,
        req.body || {},
      );

      return sendSuccess(res, {
        code: 200,
        message: "Address updated successfully",
        data,
      });
    } catch (err) {
      return sendError(res, {
        code: err.statusCode || 400,
        message: err.message || "Unable to update address",
        error: err.message || null,
      });
    }
  },

  deleteAddress: async (req, res) => {
    try {
      const userId = req.user?._id;
      const { id } = req.params;
      const data = await AddressService.deleteAddress(userId, id);

      return sendSuccess(res, {
        code: 200,
        message: "Address deleted successfully",
        data,
      });
    } catch (err) {
      return sendError(res, {
        code: err.statusCode || 400,
        message: err.message || "Unable to delete address",
        error: err.message || null,
      });
    }
  },

  setDefaultAddress: async (req, res) => {
    try {
      const userId = req.user?._id;
      const { id } = req.params;
      const data = await AddressService.setDefaultAddress(userId, id);

      return sendSuccess(res, {
        code: 200,
        message: "Default address updated successfully",
        data,
      });
    } catch (err) {
      return sendError(res, {
        code: err.statusCode || 400,
        message: err.message || "Unable to update default address",
        error: err.message || null,
      });
    }
  },
};

export default AddressController;
