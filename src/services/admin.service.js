import bcrypt from "bcryptjs";
import User from "../models/user.model.js";
import Product from "../models/product.model.js";
import Order from "../models/order.model.js";

const normalizeEmail = (value) => String(value).trim().toLowerCase();
const normalizeName = (value) => String(value).trim();

const buildAdminResponse = (user) => ({
  user_id: user.user_id,
  fullName: user.name,
  email: user.email,
  phone: user.phone || "",
  address: user.address || "",
  profilePicture: user.profilePicture || "",
});

export const AdminService = {
  getProfile: async ({ user_id }) => {
    const admin = await User.findOne({
      user_id: String(user_id).trim(),
      role: "SuperAdmin",
    })
      .select("user_id name email phone address profilePicture -_id")
      .lean()
      .exec();

    if (!admin) {
      throw new Error("Admin not found");
    }

    return {
      user_id: admin.user_id,
      fullName: admin.name,
      email: admin.email,
      phone: admin.phone || "",
      address: admin.address || "",
      profilePicture: admin.profilePicture || "",
    };
  },

  updateProfile: async ({
    user_id,
    fullName,
    email,
    phone,
    address,
    password,
    profilePicture,
  }) => {
    if (
      !fullName &&
      !email &&
      !phone &&
      address === undefined &&
      !password &&
      !profilePicture
    ) {
      throw new Error("At least one field is required to update");
    }

    const admin = await User.findOne({
      user_id: String(user_id).trim(),
      role: "SuperAdmin",
    }).exec();

    if (!admin) {
      throw new Error("Admin not found");
    }

    if (email) {
      const normalizedEmail = normalizeEmail(email);
      const duplicate = await User.findOne({
        email: normalizedEmail,
        user_id: { $ne: String(user_id).trim() },
      }).exec();

      if (duplicate) {
        throw new Error("Email already in use");
      }

      admin.email = normalizedEmail;
    }

    if (fullName) {
      admin.name = normalizeName(fullName);
    }

    if (phone !== undefined) {
      admin.phone = String(phone).trim();
    }

    if (address !== undefined) {
      admin.address = String(address).trim();
    }

    if (password) {
      admin.passwordHash = await bcrypt.hash(String(password), 10);
    }

    if (profilePicture) {
      admin.profilePicture = profilePicture;
    }

    await admin.save();

    return buildAdminResponse(admin);
  },

  getDashboardData: async () => {
    const [totalUsers, totalProducts, totalOrders, earningResult] =
      await Promise.all([
        User.countDocuments({
          role: "User",
        }),

        Product.countDocuments(),
        Order.countDocuments(),

        // Count only successfully paid orders for earnings
        Order.aggregate([
          {
            $match: {
              paymentStatus: "paid",
            },
          },
          {
            $group: {
              _id: null,
              totalEarning: {
                $sum: "$pricing.grandTotal",
              },
            },
          },
        ]),
      ]);

    const totalEarning = earningResult[0]?.totalEarning || 0;

    return {
      totalUsers,
      totalProducts,
      totalOrders,
      totalEarning,
    };
  },
};

export default AdminService;
