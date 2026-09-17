import { Request, Response, NextFunction } from "express";
import { AppError } from "../errors/AppError";
import { authService } from "../services/auth.service";

/**
 * Exige um JWT valido no cabecalho Authorization e, em caso de sucesso,
 * popula req.user para os handlers seguintes.
 *
 * Esta e a fronteira real de seguranca da aplicacao. Esconder um botao no
 * React e experiencia de uso; quem de fato impede um curl direto na API e
 * este middleware.
 */
export function ensureAuth(
  req: Request,
  _res: Response,
  next: NextFunction
): void {
  const header = req.headers.authorization;

  if (!header) {
    next(new AppError("Token de autenticacao nao informado.", 401));
    return;
  }

  const [scheme, token] = header.split(" ");

  if (!/^Bearer$/i.test(scheme) || !token) {
    next(
      new AppError("Formato invalido. Use: Authorization: Bearer <token>.", 401)
    );
    return;
  }

  try {
    const payload = authService.verifyToken(token);
    req.user = { id: payload.sub, name: payload.name };
    next();
  } catch (error) {
    next(error);
  }
}
