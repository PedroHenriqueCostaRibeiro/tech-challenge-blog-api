import { Router } from "express";
import { postController } from "../controllers/post.controller";

const router = Router();

// IMPORTANTE: /search precisa vir antes de /:id,
// caso contrario "search" seria capturado como um id.
router.get("/search", (req, res, next) => postController.search(req, res, next));

router.get("/", (req, res, next) => postController.index(req, res, next));
router.get("/:id", (req, res, next) => postController.show(req, res, next));
router.post("/", (req, res, next) => postController.store(req, res, next));
router.put("/:id", (req, res, next) => postController.update(req, res, next));
router.delete("/:id", (req, res, next) => postController.destroy(req, res, next));

export default router;
