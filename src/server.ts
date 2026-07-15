import "reflect-metadata";
import * as dotenv from "dotenv";
import app from "./app";
import { AppDataSource } from "./config/data-source";

dotenv.config();

const PORT = Number(process.env.PORT) || 3000;

async function bootstrap(): Promise<void> {
  try {
    await AppDataSource.initialize();
    console.log("Conexao com o banco de dados estabelecida.");

    app.listen(PORT, () => {
      console.log(`Servidor rodando em http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error("Falha ao iniciar a aplicacao:", error);
    process.exit(1);
  }
}

bootstrap();
