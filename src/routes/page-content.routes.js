import express from "express";
import { PageContentController } from "../controllers/page-content.controller.js";

const router = express.Router();

router.get(
  "/home/promotional-banner",
  PageContentController.fetchHomePagePromotionalBannerData,
);

router.get("/home/spotlights", PageContentController.fetchSpotlightData);

export default router;
