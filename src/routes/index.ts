import { Router } from "express";
import postRoutes from "./post.routes";
import authRoutes from "./auth.routes";

const routes = Router();

routes.get("/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

routes.use("/auth", authRoutes);
routes.use("/posts", postRoutes);

export default routes;
