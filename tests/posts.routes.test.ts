import request from "supertest";
import jwt from "jsonwebtoken";
import app from "../src/app";
import { postService } from "../src/services/post.service";

/**
 * Testes de integracao das rotas de posts.
 *
 * Sobem o Express de verdade (rotas + middlewares + errorHandler) via supertest,
 * com o PostService mockado — entao nao ha banco de dados envolvido.
 *
 * O objetivo e provar, ponta a ponta, o requisito 6 do Tech Challenge:
 * leitura e publica, escrita exige docente autenticado. Bloquear so as telas
 * no React nao bastaria: um curl direto na API contornaria o front inteiro.
 */

const SECRET = "segredo-de-teste";

beforeAll(() => {
  process.env.JWT_SECRET = SECRET;
});

beforeEach(() => {
  jest.restoreAllMocks();
});

function teacherToken(): string {
  return jwt.sign(
    { sub: "uuid-prof-1", name: "Maria Silva", role: "teacher" },
    SECRET
  );
}

const novoPost = {
  title: "Revolucao Francesa",
  content: "Aula sobre 1789.",
  author: "Prof. Maria",
};

describe("Rotas publicas de leitura", () => {
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

describe("Rotas de escrita sem autenticacao", () => {
  it("POST /posts sem token responde 401 e nao chama o service", async () => {
    const create = jest.spyOn(postService, "create");

    const res = await request(app).post("/posts").send(novoPost).expect(401);

    expect(res.body.error).toMatch(/token/i);
    expect(create).not.toHaveBeenCalled();
  });

  it("PUT /posts/:id sem token responde 401 e nao chama o service", async () => {
    const update = jest.spyOn(postService, "update");

    await request(app).put("/posts/1").send({ title: "x" }).expect(401);

    expect(update).not.toHaveBeenCalled();
  });

  it("DELETE /posts/:id sem token responde 401 e nao chama o service", async () => {
    const remove = jest.spyOn(postService, "delete");

    await request(app).delete("/posts/1").expect(401);

    expect(remove).not.toHaveBeenCalled();
  });

  it("POST /posts com token forjado responde 401", async () => {
    const create = jest.spyOn(postService, "create");
    const forjado = jwt.sign({ sub: "x", role: "teacher" }, "outro-segredo");

    await request(app)
      .post("/posts")
      .set("Authorization", `Bearer ${forjado}`)
      .send(novoPost)
      .expect(401);

    expect(create).not.toHaveBeenCalled();
  });

  it("POST /posts com token expirado responde 401", async () => {
    const expirado = jwt.sign({ sub: "x", role: "teacher" }, SECRET, {
      expiresIn: "-1s",
    });

    await request(app)
      .post("/posts")
      .set("Authorization", `Bearer ${expirado}`)
      .send(novoPost)
      .expect(401);
  });

  it("POST /posts com papel diferente de teacher responde 403", async () => {
    const create = jest.spyOn(postService, "create");
    const aluno = jwt.sign({ sub: "x", name: "Aluno", role: "student" }, SECRET);

    await request(app)
      .post("/posts")
      .set("Authorization", `Bearer ${aluno}`)
      .send(novoPost)
      .expect(403);

    expect(create).not.toHaveBeenCalled();
  });
});

describe("Rotas de escrita com docente autenticado", () => {
  it("POST /posts cria a postagem e responde 201", async () => {
    const create = jest
      .spyOn(postService, "create")
      .mockResolvedValue({ id: "uuid-1", ...novoPost } as any);

    const res = await request(app)
      .post("/posts")
      .set("Authorization", `Bearer ${teacherToken()}`)
      .send(novoPost)
      .expect(201);

    expect(res.body.id).toBe("uuid-1");
    expect(create).toHaveBeenCalledWith(novoPost);
  });

  it("PUT /posts/:id edita e responde 200", async () => {
    jest
      .spyOn(postService, "update")
      .mockResolvedValue({ id: "uuid-1", ...novoPost } as any);

    await request(app)
      .put("/posts/uuid-1")
      .set("Authorization", `Bearer ${teacherToken()}`)
      .send({ title: "Novo titulo" })
      .expect(200);
  });

  it("DELETE /posts/:id exclui e responde 204", async () => {
    jest.spyOn(postService, "delete").mockResolvedValue(undefined);

    await request(app)
      .delete("/posts/uuid-1")
      .set("Authorization", `Bearer ${teacherToken()}`)
      .expect(204);
  });

  it("propaga o 400 do service quando faltam campos obrigatorios", async () => {
    // Autenticado, mas com corpo invalido: o erro deve ser de validacao, nao de auth.
    await request(app)
      .post("/posts")
      .set("Authorization", `Bearer ${teacherToken()}`)
      .send({ title: "" })
      .expect(400);
  });
});
