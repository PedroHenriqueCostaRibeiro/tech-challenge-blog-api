import { ILike, Repository } from "typeorm";
import { AppDataSource } from "../config/data-source";
import { Post } from "../entities/Post";
import { AppError } from "../errors/AppError";

export interface CreatePostDTO {
  title: string;
  content: string;
  author: string;
}

export type UpdatePostDTO = Partial<CreatePostDTO>;

/**
 * Formato de um UUID (as versoes que o Postgres aceita na coluna uuid).
 *
 * Precisamos dele porque consultar a coluna "id" com uma string que nao e UUID
 * faz o proprio banco lancar (string_to_uuid), e o erro chegaria ao cliente
 * como 500 -- quando a resposta correta e 404.
 */
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export class PostService {
  private get repository(): Repository<Post> {
    return AppDataSource.getRepository(Post);
  }

  async findAll(): Promise<Post[]> {
    return this.repository.find({ order: { createdAt: "DESC" } });
  }

  async findById(id: string): Promise<Post> {
    this.ensureValidId(id);

    const post = await this.repository.findOne({ where: { id } });
    if (!post) {
      throw new AppError(`Post com id "${id}" nao encontrado.`, 404);
    }
    return post;
  }

  async search(term: string): Promise<Post[]> {
    const query = (term ?? "").trim();
    if (!query) {
      return [];
    }
    return this.repository.find({
      where: [
        { title: ILike(`%${query}%`) },
        { content: ILike(`%${query}%`) },
      ],
      order: { createdAt: "DESC" },
    });
  }

  async create(data: CreatePostDTO): Promise<Post> {
    this.validate(data);
    const post = this.repository.create({
      title: data.title.trim(),
      content: data.content.trim(),
      author: data.author.trim(),
    });
    return this.repository.save(post);
  }

  async update(id: string, data: UpdatePostDTO): Promise<Post> {
    const post = await this.findById(id);

    if (data.title !== undefined) post.title = data.title.trim();
    if (data.content !== undefined) post.content = data.content.trim();
    if (data.author !== undefined) post.author = data.author.trim();

    this.validate(post);
    return this.repository.save(post);
  }

  async delete(id: string): Promise<void> {
    this.ensureValidId(id);

    const result = await this.repository.delete({ id });
    if (!result.affected) {
      throw new AppError(`Post com id "${id}" nao encontrado.`, 404);
    }
  }

  /**
   * Um id que nem tem forma de UUID nao pode corresponder a nenhum registro,
   * entao a resposta correta e 404 -- e nao 500, que e o que aconteceria se
   * deixassemos a string malformada chegar ao banco.
   *
   * A validacao acontece ANTES da consulta de proposito: e justamente a
   * consulta que provoca o erro.
   */
  private ensureValidId(id: string): void {
    if (!UUID_PATTERN.test(id)) {
      throw new AppError(`Post com id "${id}" nao encontrado.`, 404);
    }
  }

  private validate(data: Partial<CreatePostDTO>): void {
    const missing: string[] = [];
    if (!data.title || !data.title.trim()) missing.push("title");
    if (!data.content || !data.content.trim()) missing.push("content");
    if (!data.author || !data.author.trim()) missing.push("author");

    if (missing.length > 0) {
      throw new AppError(
        `Campos obrigatorios ausentes ou vazios: ${missing.join(", ")}.`,
        400
      );
    }
  }
}

export const postService = new PostService();
