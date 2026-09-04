import express from "express";
import authMiddleware from "../../middlewares/auth.middleware.js";
import { authorizeRoles, ROLES } from "../../middlewares/role.middleware.js";
import { SynonymController } from "../../controllers/admin/index.controller.js";

const router = express.Router();
router.use(authMiddleware, authorizeRoles(ROLES.SUPER_ADMIN));

router
  .route("/")
  .get(SynonymController.getAllSynonyms)
  .post(SynonymController.AddSynonym);

router
  .route("/:id")
  .get(SynonymController.getSynonymById)
  .put(SynonymController.UpdateSynonym)
  .delete(SynonymController.deleteSynonym);

export default router;
