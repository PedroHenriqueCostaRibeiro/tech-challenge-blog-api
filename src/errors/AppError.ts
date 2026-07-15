/**
 * Erro de aplicacao com status HTTP associado.
 * Lancado pelas camadas de servico e tratado pelo middleware de erros.
 */
export class AppError extends Error {
  public readonly statusCode: number;

  constructor(message: string, statusCode = 400) {
    super(message);
    this.name = "AppError";
    this.statusCode = statusCode;
    Object.setPrototypeOf(this, AppError.prototype);
  }
}
