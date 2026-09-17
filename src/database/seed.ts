import "reflect-metadata";
import * as dotenv from "dotenv";
import bcrypt from "bcryptjs";
import { AppDataSource } from "../config/data-source";
import { User } from "../entities/User";

dotenv.config();

/**
 * Cria os docentes de demonstracao. Sem eles nao ha como fazer login.
 *
 * Com Docker:        docker compose exec app node dist/database/seed.js
 * Local, sem Docker: npm run seed
 *
 * O script e idempotente: rodar de novo nao duplica ninguem.
 */

const DOCENTES = [
  { name: "Maria Silva", email: "maria@escola.edu.br", password: "senha123" },
  { name: "Joao Souza", email: "joao@escola.edu.br", password: "senha123" },
];

const SALT_ROUNDS = 10;

async function seed(): Promise<void> {
  await AppDataSource.initialize();
  const repository = AppDataSource.getRepository(User);

  for (const docente of DOCENTES) {
    const email = docente.email.toLowerCase();
    const existente = await repository.findOne({ where: { email } });

    if (existente) {
      console.log(`- ${email} ja existe, ignorando.`);
      continue;
    }

    await repository.save(
      repository.create({
        name: docente.name,
        email,
        passwordHash: await bcrypt.hash(docente.password, SALT_ROUNDS),
      })
    );

    console.log(`+ ${email} criado (senha: ${docente.password}).`);
  }

  await AppDataSource.destroy();
  console.log("Seed concluido.");
}

seed().catch(async (error) => {
  console.error("Falha ao executar o seed:", error);

  if (AppDataSource.isInitialized) {
    await AppDataSource.destroy();
  }

  process.exit(1);
});
