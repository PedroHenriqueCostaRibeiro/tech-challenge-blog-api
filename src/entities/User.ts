import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from "typeorm";

/**
 * Papeis disponiveis no sistema.
 * Por ora so existe "teacher": apenas docentes escrevem posts.
 */
export type UserRole = "teacher";

@Entity("users")
export class User {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ type: "varchar", length: 120 })
  name!: string;

  @Column({ type: "varchar", length: 180, unique: true })
  email!: string;

  /**
   * Hash bcrypt da senha (sempre 60 caracteres).
   * A senha em texto puro nunca e persistida.
   *
   * "select: false" deixa a coluna de fora das consultas normais, entao um
   * GET acidental jamais vaza o hash. O login precisa dele e o pede
   * explicitamente via "select" no findOne.
   */
  @Column({ name: "password_hash", type: "varchar", length: 60, select: false })
  passwordHash!: string;

  @Column({ type: "varchar", length: 20, default: "teacher" })
  role!: UserRole;

  @CreateDateColumn({ name: "created_at" })
  createdAt!: Date;

  @UpdateDateColumn({ name: "updated_at" })
  updatedAt!: Date;
}
