import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { ensureAuth, ensureRole } from "../src/middlewares/ensureAuth";
import { AppError } from "../src/errors/AppError";

/**
 * Testes do middleware que protege as rotas de escrita de posts.
 *
 * E a peca que garante o requisito 6 do desafio no lado do servidor:
 * sem ele, qualquer pessoa poderia criar, editar ou excluir postagens
 * mesmo com o front-end bloqueando as telas.
 */

const SECRET = "segredo-de-teste";

beforeAll(() => {
  process.env.JWT_SECRET = SECRET;
});

function mockRequest(authorization?: string): Request {
  return { headers: authorization ? { authorization } : {} } as Request;
}

const res = {} as Response;

function tokenFor(role = "teacher", id = "uuid-prof-1"): string {
  return jwt.sign({ sub: id, name: "Maria Silva", role }, SECRET);
}

/** Extrai o erro que o middleware passou para next(). */
function errorFrom(next: jest.Mock): AppError {
  expect(next).toHaveBeenCalledTimes(1);
  return next.mock.calls[0][0] as AppError;
}

describe("ensureAuth (autenticacao)", () => {
  it("aceita um Bearer token valido e popula req.user", () => {
    const req = mockRequest(`Bearer ${tokenFor()}`);
    const next = jest.fn() as unknown as NextFunction;

    ensureAuth(req, res, next);

    // next() sem argumento = seguiu adiante sem erro
    expect(next).toHaveBeenCalledWith();
    expect(req.user).toEqual({
      id: "uuid-prof-1",
      name: "Maria Silva",
      role: "teacher",
    });
  });

  it("aceita o esquema 'bearer' em minusculas", () => {
    const req = mockRequest(`bearer ${tokenFor()}`);
    const next = jest.fn() as unknown as NextFunction;

    ensureAuth(req, res, next);

    expect(next).toHaveBeenCalledWith();
  });

  it("recusa com 401 quando nao ha cabecalho Authorization", () => {
    const next = jest.fn();

    ensureAuth(mockRequest(), res, next as unknown as NextFunction);

    expect(errorFrom(next).statusCode).toBe(401);
  });

  it("recusa com 401 quando o esquema nao e Bearer", () => {
    const next = jest.fn();

    ensureAuth(
      mockRequest(`Basic ${tokenFor()}`),
      res,
      next as unknown as NextFunction
    );

    expect(errorFrom(next).statusCode).toBe(401);
  });

  it("recusa com 401 quando vem 'Bearer' sem o token", () => {
    const next = jest.fn();

    ensureAuth(mockRequest("Bearer"), res, next as unknown as NextFunction);

    expect(errorFrom(next).statusCode).toBe(401);
  });

  it("recusa com 401 um token assinado com outro segredo", () => {
    const forjado = jwt.sign({ sub: "x", role: "teacher" }, "outro-segredo");
    const next = jest.fn();

    ensureAuth(
      mockRequest(`Bearer ${forjado}`),
      res,
      next as unknown as NextFunction
    );

    expect(errorFrom(next).statusCode).toBe(401);
  });

  it("recusa com 401 um token expirado", () => {
    const expirado = jwt.sign({ sub: "x", role: "teacher" }, SECRET, {
      expiresIn: "-1s",
    });
    const next = jest.fn();

    ensureAuth(
      mockRequest(`Bearer ${expirado}`),
      res,
      next as unknown as NextFunction
    );

    expect(errorFrom(next).statusCode).toBe(401);
  });

  it("nao deixa passar quando a requisicao e recusada", () => {
    const req = mockRequest("Bearer token-invalido");
    const next = jest.fn();

    ensureAuth(req, res, next as unknown as NextFunction);

    expect(req.user).toBeUndefined();
  });
});

describe("ensureRole (autorizacao)", () => {
  it("deixa passar quando o papel do usuario e permitido", () => {
    const req = { user: { id: "1", name: "Maria", role: "teacher" } } as Request;
    const next = jest.fn() as unknown as NextFunction;

    ensureRole("teacher")(req, res, next);

    expect(next).toHaveBeenCalledWith();
  });

  it("recusa com 403 quando o papel nao esta na lista", () => {
    const req = {
      user: { id: "1", name: "Aluno", role: "student" },
    } as unknown as Request;
    const next = jest.fn();

    ensureRole("teacher")(req, res, next as unknown as NextFunction);

    expect(errorFrom(next).statusCode).toBe(403);
  });

  it("recusa com 401 quando ensureAuth nao rodou antes", () => {
    const next = jest.fn();

    ensureRole("teacher")({} as Request, res, next as unknown as NextFunction);

    expect(errorFrom(next).statusCode).toBe(401);
  });
});
