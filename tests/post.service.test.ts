import { AppDataSource } from "../src/config/data-source";
import { postService } from "../src/services/post.service";
import { AppError } from "../src/errors/AppError";

/**
 * Testes unitarios do PostService.
 *
 * O repositorio do TypeORM e "mockado" (substituido por funcoes falsas),
 * entao NAO precisamos de um banco de dados real para rodar os testes.
 * Assim testamos apenas a logica de negocio: validacao, tratamento de
 * "nao encontrado" (404) e as operacoes de criar, editar e excluir.
 */

// Repositorio falso: cada metodo e uma funcao espia (jest.fn)
const repo = {
  find: jest.fn(),
  findOne: jest.fn(),
  create: jest.fn(),
  save: jest.fn(),
  delete: jest.fn(),
};

beforeAll(() => {
  // Sempre que o service pedir o repositorio, devolvemos o nosso mock
  jest.spyOn(AppDataSource, "getRepository").mockReturnValue(repo as any);
});

beforeEach(() => {
  jest.clearAllMocks();
});

describe("PostService.create (criacao)", () => {
  it("cria um post com dados validos e remove espacos em branco", async () => {
    repo.create.mockImplementation((data) => data);
    repo.save.mockResolvedValueOnce({
      id: "uuid-1",
      title: "Aula",
      content: "Conteudo",
      author: "Prof",
    });

    const result = await postService.create({
      title: "  Aula  ",
      content: "  Conteudo  ",
      author: "  Prof  ",
    });

    // Os campos devem chegar ao repositorio ja "trimados"
    expect(repo.create).toHaveBeenCalledWith({
      title: "Aula",
      content: "Conteudo",
      author: "Prof",
    });
    expect(repo.save).toHaveBeenCalledTimes(1);
    expect(result.id).toBe("uuid-1");
  });

  it("lanca AppError 400 quando faltam campos obrigatorios", async () => {
    await expect(
      postService.create({ title: "", content: "", author: "" })
    ).rejects.toMatchObject({ statusCode: 400 });

    // Nao deve tentar salvar nada
    expect(repo.save).not.toHaveBeenCalled();
  });

  it("lanca AppError quando o titulo tem apenas espacos", async () => {
    await expect(
      postService.create({ title: "   ", content: "ok", author: "ok" })
    ).rejects.toBeInstanceOf(AppError);
  });
});

describe("PostService.update (edicao)", () => {
  it("atualiza os campos informados de um post existente", async () => {
    repo.findOne.mockResolvedValueOnce({
      id: "uuid-1",
      title: "Antigo",
      content: "Antigo",
      author: "Antigo",
    });
    repo.save.mockImplementation(async (data) => data);

    const result = await postService.update("uuid-1", { title: "  Novo  " });

    expect(result.title).toBe("Novo"); // trimado e atualizado
    expect(result.content).toBe("Antigo"); // inalterado
    expect(repo.save).toHaveBeenCalledTimes(1);
  });

  it("lanca AppError 404 ao editar post inexistente", async () => {
    repo.findOne.mockResolvedValueOnce(null);

    await expect(
      postService.update("nao-existe", { title: "x" })
    ).rejects.toMatchObject({ statusCode: 404 });
  });
});

describe("PostService.delete (exclusao)", () => {
  it("exclui quando o post existe (affected = 1)", async () => {
    repo.delete.mockResolvedValueOnce({ affected: 1 });

    await expect(postService.delete("uuid-1")).resolves.toBeUndefined();
    expect(repo.delete).toHaveBeenCalledWith({ id: "uuid-1" });
  });

  it("lanca AppError 404 quando nada foi excluido (affected = 0)", async () => {
    repo.delete.mockResolvedValueOnce({ affected: 0 });

    await expect(postService.delete("nao-existe")).rejects.toMatchObject({
      statusCode: 404,
    });
  });
});

describe("PostService.findById / findAll (leitura)", () => {
  it("retorna o post quando encontrado", async () => {
    repo.findOne.mockResolvedValueOnce({ id: "uuid-1", title: "Aula" });

    const post = await postService.findById("uuid-1");
    expect(post.id).toBe("uuid-1");
  });

  it("lanca AppError 404 quando nao encontra o id", async () => {
    repo.findOne.mockResolvedValueOnce(null);

    await expect(postService.findById("nao-existe")).rejects.toMatchObject({
      statusCode: 404,
    });
  });

  it("lista todos os posts ordenados por data de criacao", async () => {
    repo.find.mockResolvedValueOnce([{ id: "1" }, { id: "2" }]);

    const posts = await postService.findAll();
    expect(posts).toHaveLength(2);
    expect(repo.find).toHaveBeenCalledWith({ order: { createdAt: "DESC" } });
  });
});

describe("PostService.search (busca)", () => {
  it("retorna lista vazia sem consultar o banco quando o termo e vazio", async () => {
    const result = await postService.search("   ");

    expect(result).toEqual([]);
    expect(repo.find).not.toHaveBeenCalled();
  });

  it("consulta por titulo e conteudo quando ha termo", async () => {
    repo.find.mockResolvedValueOnce([{ id: "1", title: "Aula de historia" }]);

    const result = await postService.search("historia");

    expect(repo.find).toHaveBeenCalledTimes(1);
    expect(result).toHaveLength(1);
  });
});
