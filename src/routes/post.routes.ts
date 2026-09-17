import { Router } from "express";
import { postController } from "../controllers/post.controller";
import { ensureAuth } from "../middlewares/ensureAuth";

const router = Router();

// ---------------------------------------------------------------------------
// Leitura: publica. Estudantes consultam o blog sem precisar de conta.
// ---------------------------------------------------------------------------

// IMPORTANTE: /search precisa vir antes de /:id,
// caso contrario "search" seria capturado como um id.
router.get("/search", (req, res, next) => postController.search(req, res, next));

router.get("/", (req, res, next) => postController.index(req, res, next));
router.get("/:id", (req, res, next) => postController.show(req, res, next));

// ---------------------------------------------------------------------------
// Escrita: exclusiva de docentes autenticados.
//
// Esta e a unica barreira que importa. As telas protegidas no React existem
// para nao mostrar ao usuario portas que ele nao pode abrir, mas quem impede
// de fato um curl direto na API sao estas tres linhas.
// ---------------------------------------------------------------------------

router.post("/", ensureAuth, (req, res, next) =>
  postController.store(req, res, next)
);
router.put("/:id", ensureAuth, (req, res, next) =>
  postController.update(req, res, next)
);
router.delete("/:id", ensureAuth, (req, res, next) =>
  postController.destroy(req, res, next)
);

export default router;
