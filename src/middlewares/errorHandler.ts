import { Request, Response, NextFunction } from "express";
import { AppError } from "../errors/AppError";

// Middleware de erro do Express (precisa dos 4 parametros).
export function errorHandler(
  error: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  if (error instanceof AppError) {
    res.status(error.statusCode).json({ error: error.message });
    return;
  }

  console.error("Erro inesperado:", error);
  res.status(500).json({ error: "Erro interno do servidor." });
}

// Middleware para rotas nao encontradas (404).
export function notFoundHandler(req: Request, res: Response): void {
  res.status(404).json({ error: `Rota nao encontrada: ${req.method} ${req.originalUrl}` });
}
