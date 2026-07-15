import "reflect-metadata";
import { DataSource } from "typeorm";
import * as dotenv from "dotenv";
import { Post } from "../entities/Post";

dotenv.config();

const useSsl = process.env.DB_SSL === "true";

export const AppDataSource = new DataSource({
  type: "postgres",
  // Producao (Render): usa a DATABASE_URL da plataforma.
  // Local (Docker): continua com as variaveis DB_* separadas.
  ...(process.env.DATABASE_URL
    ? { url: process.env.DATABASE_URL }
    : {
        host: process.env.DB_HOST || "localhost",
        port: Number(process.env.DB_PORT) || 5432,
        username: process.env.DB_USERNAME || "postgres",
        password: process.env.DB_PASSWORD || "postgres",
        database: process.env.DB_DATABASE || "blog",
      }),
  ssl: useSsl ? { rejectUnauthorized: false } : false,
  synchronize: process.env.DB_SYNCHRONIZE === "true",
  logging: process.env.DB_LOGGING === "true",
  entities: [Post],
  migrations: ["src/migrations/*.ts"],
  subscribers: [],
});