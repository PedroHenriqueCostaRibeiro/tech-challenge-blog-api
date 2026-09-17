/**
 * Amplia o Request do Express com o usuario autenticado.
 * O middleware ensureAuth preenche este campo apos validar o JWT.
 */
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        name: string;
      };
    }
  }
}

export {};
