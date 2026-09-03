import express from "express";
import { SearchController } from "../../controllers/mobile/index.controller.js";

const router = express.Router();

router.get("/", SearchController.SearchItem);
router.get("/suggest", SearchController.SuggestSearch);

export default router;
