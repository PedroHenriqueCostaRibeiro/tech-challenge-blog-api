import { Router } from "express";
import { authController } from "../controllers/auth.controller";
import { ensureAuth } from "../middlewares/ensureAuth";

const router = Router();

router.post("/login", (req, res, next) => authController.login(req, res, next));

// Permite ao front reidratar a sessao a partir do token guardado no navegador.
// Decodificar o JWT no cliente apenas leria o que ele afirma; so o servidor
// verifica a assinatura e se o usuario ainda existe.
router.get("/me", ensureAuth, (req, res, next) =>
  authController.me(req, res, next)
);

export default router;
