import request from "supertest";
import jwt from "jsonwebtoken";
import app from "../src/app";
import { postService } from "../src/services/post.service";
import { authService } from "../src/services/auth.service";
import { AppError } from "../src/errors/AppError";

/**
 * Testes de integracao das rotas.
 *
 * Sobem o Express de verdade (rotas + middlewares + errorHandler) via
 * supertest, com os services mockados -- entao nao ha banco envolvido.
 *
 * O objetivo e provar o requisito 6 ponta a ponta: leitura e publica, escrita
 * exige docente autenticado. Bloquear so as telas no React nao bastaria, ja
 * que um curl direto na API contornaria o front inteiro. Estes testes sao a
 * prova disso.
 */

const SECRET = "segredo-de-teste";
const DOCENTE = { id: "3841afa9-e48e-4afd-8728-87307ff9bf97", name: "Maria" };

beforeAll(() => {
  process.env.JWT_SECRET = SECRET;
});

beforeEach(() => {
  jest.restoreAllMocks();
});

function token(): string {
  return jwt.sign({ sub: DOCENTE.id, name: DOCENTE.name }, SECRET);
}

const novoPost = {
  title: "Revolucao Francesa",
  content: "Aula sobre 1789.",
  author: "Prof. Maria",
};

describe("Leitura e publica (estudantes nao precisam de conta)", () => {
  it("GET /posts responde sem token", async () => {
    jest.spyOn(postService, "findAll").mockResolvedValue([]);

    await request(app).get("/posts").expect(200);
  });

  it("GET /posts/search responde sem token", async () => {
    jest.spyOn(postService, "search").mockResolvedValue([]);

    await request(app).get("/posts/search?q=revolucao").expect(200);
  });

  it("GET /posts/:id responde sem token", async () => {
    jest.spyOn(postService, "findById").mockResolvedValue({ id: "1" } as any);

    await request(app).get("/posts/1").expect(200);
  });

  it("GET /health responde sem token", async () => {
    await request(app).get("/health").expect(200);
  });
});

describe("Escrita sem autenticacao e bloqueada", () => {
  it("POST /posts responde 401 e nao chega ao service", async () => {
    const create = jest.spyOn(postService, "create");

    const res = await request(app).post("/posts").send(novoPost).expect(401);

    expect(res.body.error).toMatch(/token/i);
    // O mais importante: a requisicao nem chegou a regra de negocio.
    expect(create).not.toHaveBeenCalled();
  });

  it("PUT /posts/:id responde 401 e nao chega ao service", async () => {
    const update = jest.spyOn(postService, "update");

    await request(app).put("/posts/1").send({ title: "x" }).expect(401);

    expect(update).not.toHaveBeenCalled();
  });

  it("DELETE /posts/:id responde 401 e nao chega ao service", async () => {
    const remove = jest.spyOn(postService, "delete");

    await request(app).delete("/posts/1").expect(401);

    expect(remove).not.toHaveBeenCalled();
  });

  it("token forjado com outro segredo nao passa", async () => {
    const create = jest.spyOn(postService, "create");
    const forjado = jwt.sign({ sub: "invasor", name: "Invasor" }, "outro");

    await request(app)
      .post("/posts")
      .set("Authorization", `Bearer ${forjado}`)
      .send(novoPost)
      .expect(401);

    expect(create).not.toHaveBeenCalled();
  });
});

describe("Escrita com docente autenticado e liberada", () => {
  it("POST /posts responde 201", async () => {
    jest
      .spyOn(postService, "create")
      .mockResolvedValue({ id: "1", ...novoPost } as any);

    await request(app)
      .post("/posts")
      .set("Authorization", `Bearer ${token()}`)
      .send(novoPost)
      .expect(201);
  });

  it("PUT /posts/:id responde 200", async () => {
    jest.spyOn(postService, "update").mockResolvedValue({ id: "1" } as any);

    await request(app)
      .put("/posts/1")
      .set("Authorization", `Bearer ${token()}`)
      .send({ title: "Novo" })
      .expect(200);
  });

  it("DELETE /posts/:id responde 204", async () => {
    jest.spyOn(postService, "delete").mockResolvedValue(undefined);

    await request(app)
      .delete("/posts/1")
      .set("Authorization", `Bearer ${token()}`)
      .expect(204);
  });
});

describe("Rotas de autenticacao", () => {
  it("POST /auth/login devolve token e usuario", async () => {
    jest.spyOn(authService, "login").mockResolvedValue({
      token: "um-token",
      user: { id: DOCENTE.id, name: DOCENTE.name, email: "maria@escola.edu.br" },
    });

    const res = await request(app)
      .post("/auth/login")
      .send({ email: "maria@escola.edu.br", password: "senha123" })
      .expect(200);

    expect(res.body.token).toBe("um-token");
    expect(res.body.user.email).toBe("maria@escola.edu.br");
    expect(JSON.stringify(res.body)).not.toContain("passwordHash");
  });

  it("POST /auth/login com credenciais erradas responde 401", async () => {
    // O service e quem decide se as credenciais conferem (coberto em
    // auth.service.test.ts). Aqui verificamos que a rota propaga o 401 dele
    // ate a resposta HTTP, em vez de transformar em 500.
    jest
      .spyOn(authService, "login")
      .mockRejectedValue(new AppError("Email ou senha invalidos.", 401));

    const res = await request(app)
      .post("/auth/login")
      .send({ email: "maria@escola.edu.br", password: "errada" })
      .expect(401);

    expect(res.body.error).toBe("Email ou senha invalidos.");
  });

  it("GET /auth/me sem token responde 401", async () => {
    await request(app).get("/auth/me").expect(401);
  });

  it("GET /auth/me com token devolve o usuario", async () => {
    jest.spyOn(authService, "findById").mockResolvedValue({
      id: DOCENTE.id,
      name: DOCENTE.name,
      email: "maria@escola.edu.br",
    });

    const res = await request(app)
      .get("/auth/me")
      .set("Authorization", `Bearer ${token()}`)
      .expect(200);

    expect(res.body.id).toBe(DOCENTE.id);
  });
});
