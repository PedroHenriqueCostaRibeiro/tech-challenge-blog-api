import { Router } from "express";
import { authController } from "../controllers/auth.controller";
import { ensureAuth } from "../middlewares/ensureAuth";

const router = Router();

router.post("/login", (req, res, next) => authController.login(req, res, next));

// Reidrata a sessao no front a partir do token guardado no navegador.
router.get("/me", ensureAuth, (req, res, next) =>
  authController.me(req, res, next)
);

export default router;
