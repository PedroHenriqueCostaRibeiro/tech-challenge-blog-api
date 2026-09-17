import "reflect-metadata";
import * as dotenv from "dotenv";
import bcrypt from "bcryptjs";
import { AppDataSource } from "../config/data-source";
import { User, UserRole } from "../entities/User";

dotenv.config();

/**
 * Popula a tabela de usuarios com docentes de demonstracao.
 * Rode com: npm run seed
 *
 * O script e idempotente: rodar de novo nao duplica ninguem.
 */

const SEED_TEACHERS: Array<{
  name: string;
  email: string;
  password: string;
  role: UserRole;
}> = [
  {
    name: "Maria Silva",
    email: "maria@escola.edu.br",
    password: "senha123",
    role: "teacher",
  },
  {
    name: "Joao Souza",
    email: "joao@escola.edu.br",
    password: "senha123",
    role: "teacher",
  },
];

const SALT_ROUNDS = 10;

async function seed(): Promise<void> {
  await AppDataSource.initialize();
  const repository = AppDataSource.getRepository(User);

  for (const teacher of SEED_TEACHERS) {
    const email = teacher.email.toLowerCase();
    const existing = await repository.findOne({ where: { email } });

    if (existing) {
      console.log(`- ${email} ja existe, ignorando.`);
      continue;
    }

    const user = repository.create({
      name: teacher.name,
      email,
      role: teacher.role,
      passwordHash: await bcrypt.hash(teacher.password, SALT_ROUNDS),
    });

    await repository.save(user);
    console.log(`+ ${email} criado (senha: ${teacher.password}).`);
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
