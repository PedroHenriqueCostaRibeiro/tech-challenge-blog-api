import { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { ensureAuth } from "../src/middlewares/ensureAuth";

/**
 * Testes do middleware de autenticacao.
 *
 * Ele e a fronteira real de seguranca: esconder um botao no React e UX, mas
 * quem de fato barra um curl direto na API e este middleware.
 */

const SECRET = "segredo-de-teste";
const DOCENTE = { id: "3841afa9-e48e-4afd-8728-87307ff9bf97", name: "Maria" };

beforeEach(() => {
  process.env.JWT_SECRET = SECRET;
});

function tokenValido(): string {
  return jwt.sign({ sub: DOCENTE.id, name: DOCENTE.name }, SECRET);
}

/** Monta req/res/next falsos e roda o middleware. */
function executar(authorization?: string) {
  const req = { headers: authorization ? { authorization } : {} } as Request;
  const res = {} as Response;
  const next = jest.fn() as NextFunction & jest.Mock;

  ensureAuth(req, res, next);

  return { req, next };
}

/** O erro passado para next(), se houver. */
function erroDe(next: jest.Mock): any {
  return next.mock.calls[0]?.[0];
}

describe("ensureAuth: bloqueio", () => {
  it("responde 401 quando nao ha cabecalho Authorization", () => {
    const { next } = executar();

    expect(erroDe(next)?.statusCode).toBe(401);
  });

  it("responde 401 quando falta o esquema Bearer", () => {
    const { next } = executar(tokenValido());

    expect(erroDe(next)?.statusCode).toBe(401);
  });

  it("responde 401 quando o esquema e outro", () => {
    const { next } = executar(`Basic ${tokenValido()}`);

    expect(erroDe(next)?.statusCode).toBe(401);
  });

  it("responde 401 quando ha Bearer mas nao ha token", () => {
    const { next } = executar("Bearer ");

    expect(erroDe(next)?.statusCode).toBe(401);
  });

  it("responde 401 para token adulterado", () => {
    const { next } = executar(`Bearer ${tokenValido()}adulterado`);

    expect(erroDe(next)?.statusCode).toBe(401);
  });

  it("responde 401 para token assinado com outro segredo", () => {
    const forjado = jwt.sign({ sub: "invasor" }, "outro-segredo");

    const { next } = executar(`Bearer ${forjado}`);

    expect(erroDe(next)?.statusCode).toBe(401);
  });

  it("responde 401 para token expirado", () => {
    const expirado = jwt.sign({ sub: DOCENTE.id }, SECRET, { expiresIn: -10 });

    const { next } = executar(`Bearer ${expirado}`);

    expect(erroDe(next)?.statusCode).toBe(401);
  });

  it("nao popula req.user quando bloqueia", () => {
    const { req } = executar();

    expect(req.user).toBeUndefined();
  });
});

describe("ensureAuth: liberacao", () => {
  it("segue adiante com token valido", () => {
    const { next } = executar(`Bearer ${tokenValido()}`);

    expect(next).toHaveBeenCalledWith(); // next() sem erro
  });

  it("popula req.user com quem o token identifica", () => {
    const { req } = executar(`Bearer ${tokenValido()}`);

    expect(req.user).toEqual({ id: DOCENTE.id, name: DOCENTE.name });
  });

  it("aceita o esquema em qualquer capitalizacao", () => {
    const { next } = executar(`bearer ${tokenValido()}`);

    expect(next).toHaveBeenCalledWith();
  });
});
