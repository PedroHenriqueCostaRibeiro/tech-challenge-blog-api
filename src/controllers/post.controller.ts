import { Request, Response, NextFunction } from "express";
import { postService } from "../services/post.service";

export class PostController {
  // GET /posts
  async index(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const posts = await postService.findAll();
      res.json(posts);
    } catch (error) {
      next(error);
    }
  }

  // GET /posts/search?q=termo
  async search(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const term = (req.query.q ?? req.query.term ?? "") as string;
      const posts = await postService.search(term);
      res.json(posts);
    } catch (error) {
      next(error);
    }
  }

  // GET /posts/:id
  async show(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const post = await postService.findById(req.params.id);
      res.json(post);
    } catch (error) {
      next(error);
    }
  }

  // POST /posts
  async store(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { title, content, author } = req.body;
      const post = await postService.create({ title, content, author });
      res.status(201).json(post);
    } catch (error) {
      next(error);
    }
  }

  // PUT /posts/:id
  async update(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { title, content, author } = req.body;
      const post = await postService.update(req.params.id, {
        title,
        content,
        author,
      });
      res.json(post);
    } catch (error) {
      next(error);
    }
  }

  // DELETE /posts/:id
  async destroy(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      await postService.delete(req.params.id);
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  }
}

export const postController = new PostController();
