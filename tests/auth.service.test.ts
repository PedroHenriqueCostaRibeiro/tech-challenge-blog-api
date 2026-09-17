import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { AppDataSource } from "../src/config/data-source";
import { authService } from "../src/services/auth.service";

/**
 * Testes do AuthService.
 *
 * O repositorio e mockado (sem banco real), mas o bcrypt e o jsonwebtoken sao
 * os de verdade: sao eles que decidem se uma senha confere e se um token e
 * legitimo. Mocka-los testaria o mock, nao a seguranca.
 *
 * Custo baixo de proposito: 4 rounds no hash de teste em vez dos 10 de
 * producao, so para o teste nao ficar lento.
 */

const SECRET = "segredo-de-teste";
const SENHA = "senha123";
const HASH = bcrypt.hashSync(SENHA, 4);

const DOCENTE = {
  id: "3841afa9-e48e-4afd-8728-87307ff9bf97",
  name: "Maria Silva",
  email: "maria@escola.edu.br",
  passwordHash: HASH,
};

const repo = {
  findOne: jest.fn(),
};

beforeAll(() => {
  jest.spyOn(AppDataSource, "getRepository").mockReturnValue(repo as any);
});

beforeEach(() => {
  jest.clearAllMocks();
  process.env.JWT_SECRET = SECRET;
});

describe("AuthService.login: credenciais validas", () => {
  it("devolve token e dados do usuario", async () => {
    repo.findOne.mockResolvedValueOnce(DOCENTE);

    const resultado = await authService.login(DOCENTE.email, SENHA);

    expect(resultado.user).toEqual({
      id: DOCENTE.id,
      name: DOCENTE.name,
      email: DOCENTE.email,
    });
    expect(typeof resultado.token).toBe("string");
  });

  it("nunca devolve o hash da senha", async () => {
    repo.findOne.mockResolvedValueOnce(DOCENTE);

    const resultado = await authService.login(DOCENTE.email, SENHA);

    // Serializa tudo: pega o hash ate se ele estiver aninhado em algum lugar.
    expect(JSON.stringify(resultado)).not.toContain(HASH);
    expect(JSON.stringify(resultado)).not.toContain("passwordHash");
  });

  it("assina o token com o id e o nome do docente", async () => {
    repo.findOne.mockResolvedValueOnce(DOCENTE);

    const { token } = await authService.login(DOCENTE.email, SENHA);
    const payload = jwt.verify(token, SECRET) as jwt.JwtPayload;

    expect(payload.sub).toBe(DOCENTE.id);
    expect(payload.name).toBe(DOCENTE.name);
  });

  it("o token nao carrega a senha nem o hash", async () => {
    repo.findOne.mockResolvedValueOnce(DOCENTE);

    const { token } = await authService.login(DOCENTE.email, SENHA);

    // O payload de um JWT e apenas base64: qualquer pessoa consegue ler.
    const payload = Buffer.from(token.split(".")[1], "base64").toString();
    expect(payload).not.toContain(SENHA);
    expect(payload).not.toContain(HASH);
  });

  it("normaliza o email antes de consultar (espacos e maiusculas)", async () => {
    repo.findOne.mockResolvedValueOnce(DOCENTE);

    await authService.login("  MARIA@Escola.edu.BR  ", SENHA);

    expect(repo.findOne).toHaveBeenCalledWith(
      expect.objectContaining({ where: { email: "maria@escola.edu.br" } })
    );
  });

  it("pede o hash explicitamente, porque a coluna tem select:false", async () => {
    repo.findOne.mockResolvedValueOnce(DOCENTE);

    await authService.login(DOCENTE.email, SENHA);

    const argumentos = repo.findOne.mock.calls[0][0];
    expect(argumentos.select).toMatchObject({ passwordHash: true });
  });
});

describe("AuthService.login: credenciais invalidas", () => {
  it("responde 401 quando a senha esta errada", async () => {
    repo.findOne.mockResolvedValueOnce(DOCENTE);

    await expect(
      authService.login(DOCENTE.email, "senha-errada")
    ).rejects.toMatchObject({ statusCode: 401 });
  });

  it("responde 401 quando o email nao existe", async () => {
    repo.findOne.mockResolvedValueOnce(null);

    await expect(
      authService.login("ninguem@escola.edu.br", SENHA)
    ).rejects.toMatchObject({ statusCode: 401 });
  });

  it("usa a MESMA mensagem para senha errada e email inexistente", async () => {
    // Mensagens diferentes entregariam a um atacante quais emails existem
    // no sistema -- bastaria observar qual erro volta.
    repo.findOne.mockResolvedValueOnce(DOCENTE);
    const erroSenha = await authService
      .login(DOCENTE.email, "errada")
      .catch((e) => e);

    repo.findOne.mockResolvedValueOnce(null);
    const erroEmail = await authService
      .login("ninguem@escola.edu.br", SENHA)
      .catch((e) => e);

    expect(erroSenha.message).toBe(erroEmail.message);
    expect(erroSenha.statusCode).toBe(erroEmail.statusCode);
  });

  it("responde 400 quando email ou senha vem vazios", async () => {
    await expect(authService.login("", SENHA)).rejects.toMatchObject({
      statusCode: 400,
    });
    await expect(authService.login(DOCENTE.email, "")).rejects.toMatchObject({
      statusCode: 400,
    });

    expect(repo.findOne).not.toHaveBeenCalled();
  });
});

describe("AuthService: JWT_SECRET", () => {
  it("falha alto quando o segredo nao esta configurado", async () => {
    // Preferimos quebrar o login a assinar tokens com um valor padrao: um
    // segredo conhecido permitiria a qualquer pessoa forjar credenciais.
    delete process.env.JWT_SECRET;
    repo.findOne.mockResolvedValueOnce(DOCENTE);

    await expect(
      authService.login(DOCENTE.email, SENHA)
    ).rejects.toMatchObject({ statusCode: 500 });
  });
});

describe("AuthService.verifyToken", () => {
  function tokenValido(): string {
    return jwt.sign({ sub: DOCENTE.id, name: DOCENTE.name }, SECRET);
  }

  it("devolve o payload de um token legitimo", () => {
    const payload = authService.verifyToken(tokenValido());

    expect(payload.sub).toBe(DOCENTE.id);
    expect(payload.name).toBe(DOCENTE.name);
  });

  it("recusa token adulterado", () => {
    expect(() => authService.verifyToken(tokenValido() + "x")).toThrow();
    expect(() => authService.verifyToken("nem-parece-um-token")).toThrow();
  });

  it("recusa token assinado com outro segredo", () => {
    const forjado = jwt.sign({ sub: "invasor" }, "outro-segredo");

    expect(() => authService.verifyToken(forjado)).toThrow();
  });

  it("recusa token expirado", () => {
    const expirado = jwt.sign({ sub: DOCENTE.id }, SECRET, { expiresIn: -10 });

    expect(() => authService.verifyToken(expirado)).toThrow();
  });

  it("responde 401 nas recusas, nao 500", () => {
    try {
      authService.verifyToken("token-invalido");
      throw new Error("deveria ter lancado");
    } catch (erro: any) {
      expect(erro.statusCode).toBe(401);
    }
  });
});

describe("AuthService.findById", () => {
  it("devolve o usuario sem o hash", async () => {
    repo.findOne.mockResolvedValueOnce(DOCENTE);

    const usuario = await authService.findById(DOCENTE.id);

    expect(usuario).toEqual({
      id: DOCENTE.id,
      name: DOCENTE.name,
      email: DOCENTE.email,
    });
  });

  it("responde 404 quando o usuario nao existe mais", async () => {
    repo.findOne.mockResolvedValueOnce(null);

    await expect(authService.findById(DOCENTE.id)).rejects.toMatchObject({
      statusCode: 404,
    });
  });
});
