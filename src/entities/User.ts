import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from "typeorm";

/**
 * Docente que pode publicar no blog.
 *
 * Nao existe coluna de "papel": o unico tipo de usuario com conta e o docente.
 * Estudantes leem o blog sem login, entao um campo de papel so teria um valor
 * possivel e nenhuma decisao dependeria dele.
 */
@Entity("users")
export class User {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ type: "varchar", length: 120 })
  name!: string;

  @Column({ type: "varchar", length: 180, unique: true })
  email!: string;

  /**
   * Hash bcrypt da senha (sempre 60 caracteres). A senha em texto puro nunca
   * e persistida.
   *
   * "select: false" mantem a coluna fora das consultas comuns, entao nenhum
   * endpoint devolve o hash por acidente. O login precisa dele e o pede
   * explicitamente no "select" do findOne.
   */
  @Column({ name: "password_hash", type: "varchar", length: 60, select: false })
  passwordHash!: string;

  @CreateDateColumn({ name: "created_at" })
  createdAt!: Date;

  @UpdateDateColumn({ name: "updated_at" })
  updatedAt!: Date;
}
