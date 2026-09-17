import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { AppDataSource } from "../src/config/data-source";
import { authService } from "../src/services/auth.service";
import { AppError } from "../src/errors/AppError";

/**
 * Testes unitarios do AuthService.
 *
 * Mesma estrategia do post.service.test.ts: o repositorio do TypeORM e
 * substituido por mocks, entao nao existe banco de dados envolvido.
 * O bcrypt e o jsonwebtoken rodam de verdade, porque e justamente a
 * comparacao de senha e a assinatura do token que queremos validar.
 */

const repo = {
  findOne: jest.fn(),
};

const PASSWORD = "senha123";
let passwordHash: string;

beforeAll(async () => {
  jest.spyOn(AppDataSource, "getRepository").mockReturnValue(repo as any);
  // Poucos rounds: os testes rodam rapido e a seguranca nao importa aqui.
  passwordHash = await bcrypt.hash(PASSWORD, 4);
  process.env.JWT_SECRET = "segredo-de-teste";
  process.env.JWT_EXPIRES_IN = "8h";
});

beforeEach(() => {
  jest.clearAllMocks();
  process.env.JWT_SECRET = "segredo-de-teste";
});

function teacher() {
  return {
    id: "uuid-prof-1",
    name: "Maria Silva",
    email: "maria@escola.edu.br",
    role: "teacher",
    passwordHash,
  };
}

describe("AuthService.login (autenticacao)", () => {
  it("devolve token e usuario quando as credenciais estao corretas", async () => {
    repo.findOne.mockResolvedValueOnce(teacher());

    const result = await authService.login("maria@escola.edu.br", PASSWORD);

    expect(typeof result.token).toBe("string");
    expect(result.user).toEqual({
      id: "uuid-prof-1",
      name: "Maria Silva",
      email: "maria@escola.edu.br",
      role: "teacher",
    });
  });

  it("nunca expoe o hash da senha na resposta", async () => {
    repo.findOne.mockResolvedValueOnce(teacher());

    const result = await authService.login("maria@escola.edu.br", PASSWORD);

    expect(result.user).not.toHaveProperty("passwordHash");
  });

  it("normaliza o email (espacos e maiusculas) antes de consultar", async () => {
    repo.findOne.mockResolvedValueOnce(teacher());

    await authService.login("  MARIA@Escola.edu.br  ", PASSWORD);

    expect(repo.findOne).toHaveBeenCalledWith(
      expect.objectContaining({ where: { email: "maria@escola.edu.br" } })
    );
  });

  it("pede explicitamente o passwordHash, que tem select: false na entidade", async () => {
    repo.findOne.mockResolvedValueOnce(teacher());

    await authService.login("maria@escola.edu.br", PASSWORD);

    expect(repo.findOne).toHaveBeenCalledWith(
      expect.objectContaining({
        select: expect.objectContaining({ passwordHash: true }),
      })
    );
  });

  it("lanca AppError 401 quando a senha esta errada", async () => {
    repo.findOne.mockResolvedValueOnce(teacher());

    await expect(
      authService.login("maria@escola.edu.br", "senha-errada")
    ).rejects.toMatchObject({ statusCode: 401 });
  });

  it("lanca AppError 401 quando o email nao existe", async () => {
    repo.findOne.mockResolvedValueOnce(null);

    await expect(
      authService.login("ninguem@escola.edu.br", PASSWORD)
    ).rejects.toMatchObject({ statusCode: 401 });
  });

  it("usa a mesma mensagem para email inexistente e senha errada", async () => {
    repo.findOne.mockResolvedValueOnce(null);
    const semEmail = await authService
      .login("ninguem@escola.edu.br", PASSWORD)
      .catch((e: AppError) => e.message);

    repo.findOne.mockResolvedValueOnce(teacher());
    const senhaErrada = await authService
      .login("maria@escola.edu.br", "errada")
      .catch((e: AppError) => e.message);

    // Se as mensagens diferissem, daria para descobrir quais emails existem.
    expect(semEmail).toBe(senhaErrada);
  });

  it("lanca AppError 400 quando email ou senha vem vazios", async () => {
    await expect(authService.login("", PASSWORD)).rejects.toMatchObject({
      statusCode: 400,
    });
    await expect(
      authService.login("maria@escola.edu.br", "")
    ).rejects.toMatchObject({ statusCode: 400 });

    // Nem deve consultar o banco nesses casos
    expect(repo.findOne).not.toHaveBeenCalled();
  });

  it("lanca AppError 500 quando JWT_SECRET nao esta configurado", async () => {
    delete process.env.JWT_SECRET;
    repo.findOne.mockResolvedValueOnce(teacher());

    await expect(
      authService.login("maria@escola.edu.br", PASSWORD)
    ).rejects.toMatchObject({ statusCode: 500 });
  });
});

describe("AuthService.verifyToken (validacao do token)", () => {
  it("decodifica um token emitido pelo proprio login", async () => {
    repo.findOne.mockResolvedValueOnce(teacher());
    const { token } = await authService.login("maria@escola.edu.br", PASSWORD);

    const payload = authService.verifyToken(token);

    expect(payload.sub).toBe("uuid-prof-1");
    expect(payload.role).toBe("teacher");
  });

  it("lanca AppError 401 para token malformado", () => {
    expect(() => authService.verifyToken("nao-e-um-token")).toThrow(AppError);
    expect(() => authService.verifyToken("nao-e-um-token")).toThrow(
      /invalido ou expirado/i
    );
  });

  it("lanca AppError 401 para token assinado com outro segredo", () => {
    const forjado = jwt.sign({ sub: "x", role: "teacher" }, "outro-segredo");

    expect(() => authService.verifyToken(forjado)).toThrow(AppError);
  });

  it("lanca AppError 401 para token expirado", () => {
    const expirado = jwt.sign(
      { sub: "uuid-prof-1", name: "Maria", role: "teacher" },
      "segredo-de-teste",
      { expiresIn: "-1s" }
    );

    expect(() => authService.verifyToken(expirado)).toThrow(AppError);
  });
});

describe("AuthService.findById (reidratacao da sessao)", () => {
  it("devolve o usuario publico quando encontrado", async () => {
    repo.findOne.mockResolvedValueOnce(teacher());

    const user = await authService.findById("uuid-prof-1");

    expect(user).toEqual({
      id: "uuid-prof-1",
      name: "Maria Silva",
      email: "maria@escola.edu.br",
      role: "teacher",
    });
  });

  it("lanca AppError 404 quando o usuario nao existe", async () => {
    repo.findOne.mockResolvedValueOnce(null);

    await expect(authService.findById("nao-existe")).rejects.toMatchObject({
      statusCode: 404,
    });
  });
});
