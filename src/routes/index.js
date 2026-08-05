import express from 'express';
import authRoutes from './auth.routes.js';
import categoryRoutes from './category.routes.js';
import subCategoryRoutes from './sub-category.routes.js';
import productRoutes from './product.routes.js';
import userRoutes from './user.routes.js';
import dashboardRoutes from './dashboard.routes.js';
import adminRoutes from './admin.routes.js';
import cartRoutes from './cart.routes.js';
import addressRoutes from './address.routes.js';
import orderRoutes from './order.routes.js';
import bannerRoutes from './banner.routes.js';
import cartSettingsRoutes from './cart-settings.routes.js';
import vendorRoutes from './vendor/index.js';

const router = express.Router();

router.get('/', (req, res) => {
  res.send('Hello World');
});

// POST /api/signup
// POST /api/login
router.use(authRoutes);
router.use("/categories", categoryRoutes);
router.use(subCategoryRoutes);
router.use(productRoutes);
router.use(userRoutes);
router.use(dashboardRoutes);
router.use(adminRoutes);
router.use("/cart", cartRoutes);
router.use(addressRoutes);
router.use(orderRoutes);
router.use(bannerRoutes);
router.use(cartSettingsRoutes);
router.use('/vendor', vendorRoutes);

export default router;