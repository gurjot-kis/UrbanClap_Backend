import multer from "multer";
import path from "path";
import crypto from "crypto";
import { fileURLToPath } from "url";
import fs from "fs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const UPLOADS_ROOT = path.join(__dirname, "../uploads");

const ALLOWED_MIME_TYPES = [
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/avif",
];

const fileFilter = (_req, file, cb) => {
  if (ALLOWED_MIME_TYPES.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error("Only image files (jpeg, png, webp, gif) are allowed"), false);
  }
};

const createStorage = (subfolder) =>
  multer.diskStorage({
    destination: (_req, _file, cb) => {
      const dest = path.join(UPLOADS_ROOT, subfolder);
      fs.mkdirSync(dest, { recursive: true }); // ✅ auto-create nested folders
      cb(null, dest);
    },
    filename: (_req, file, cb) => {
      const uniqueSuffix = crypto.randomUUID();
      const ext = path.extname(file.originalname).toLowerCase();
      cb(null, `${uniqueSuffix}${ext}`);
    },
  });

// ✅ fix — each field gets its own storage destination
const productStorage = multer.diskStorage({
  destination: (_req, file, cb) => {
    let subfolder = "products";
    if (file.fieldname === "variantImages") {
      subfolder = "products/variants";
    }
    const dest = path.join(UPLOADS_ROOT, subfolder);
    fs.mkdirSync(dest, { recursive: true });
    cb(null, dest);
  },
  filename: (_req, file, cb) => {
    const uniqueSuffix = crypto.randomUUID();
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `${uniqueSuffix}${ext}`);
  },
});

export const uploadProductImages = multer({
  storage: productStorage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 },
}).fields([
  { name: "mainImage", maxCount: 1 },
  { name: "featuredImages", maxCount: 10 },
  { name: "variantImages", maxCount: 20 }, // ✅ bump to 20 to match max variants
]);

export const uploadCategoryImage = multer({
  storage: createStorage("categories"),
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB per file
}).single("category_image");

export const uploadSubCategoryImage = multer({
  storage: createStorage("sub-categories"),
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB per file
}).single("sub_category_image");

export const uploadAdminProfilePicture = multer({
  storage: createStorage("admin"),
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB per file
}).single("profile_picture");

export const uploadBannerImage = multer({
  storage: createStorage("banners"),
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB per file
}).single("banner_image");

export const uploadWarehouseImage = multer({
  storage: createStorage("warehouses"),
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB per file
}).single("warehouse_image");
