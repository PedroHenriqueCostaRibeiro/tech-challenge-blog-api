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

export class PostService {
  private get repository(): Repository<Post> {
    return AppDataSource.getRepository(Post);
  }

  async findAll(): Promise<Post[]> {
    return this.repository.find({ order: { createdAt: "DESC" } });
  }

  async findById(id: string): Promise<Post> {
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
    const result = await this.repository.delete({ id });
    if (!result.affected) {
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
