import { Request, Response, NextFunction } from "express";
import { AppError } from "../errors/AppError";
import { authService } from "../services/auth.service";
import { UserRole } from "../entities/User";

/**
 * Exige um JWT valido no cabecalho Authorization.
 * Em caso de sucesso, popula req.user para os handlers seguintes.
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
    next(new AppError("Formato invalido. Use: Authorization: Bearer <token>.", 401));
    return;
  }

  try {
    const payload = authService.verifyToken(token);
    req.user = { id: payload.sub, name: payload.name, role: payload.role };
    next();
  } catch (error) {
    next(error);
  }
}

/**
 * Restringe a rota a determinados papeis.
 * Use sempre depois de ensureAuth, que e quem preenche req.user.
 */
export function ensureRole(...roles: UserRole[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      next(new AppError("Usuario nao autenticado.", 401));
      return;
    }

    if (!roles.includes(req.user.role)) {
      next(new AppError("Voce nao tem permissao para executar esta acao.", 403));
      return;
    }

    next();
  };
}
