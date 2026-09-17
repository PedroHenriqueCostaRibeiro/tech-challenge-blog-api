import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { Repository } from "typeorm";
import { AppDataSource } from "../config/data-source";
import { User, UserRole } from "../entities/User";
import { AppError } from "../errors/AppError";

/** Usuario "publico": o formato devolvido pela API, sem o hash da senha. */
export interface AuthenticatedUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
}

export interface LoginResult {
  token: string;
  user: AuthenticatedUser;
}

/** Conteudo assinado dentro do JWT. */
export interface TokenPayload {
  sub: string;
  name: string;
  role: UserRole;
}

export class AuthService {
  private get repository(): Repository<User> {
    return AppDataSource.getRepository(User);
  }

  async login(email: string, password: string): Promise<LoginResult> {
    if (!email?.trim() || !password) {
      throw new AppError("Informe email e senha.", 400);
    }

    const user = await this.repository.findOne({
      where: { email: email.trim().toLowerCase() },
      // passwordHash tem "select: false" na entidade; aqui pedimos de proposito.
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        passwordHash: true,
      },
    });

    // Mensagem identica para email inexistente e senha errada: nao entregamos
    // a quem tenta adivinhar a informacao de quais emails estao cadastrados.
    const invalidCredentials = new AppError("Email ou senha invalidos.", 401);

    if (!user) {
      throw invalidCredentials;
    }

    const passwordMatches = await bcrypt.compare(password, user.passwordHash);
    if (!passwordMatches) {
      throw invalidCredentials;
    }

    return {
      token: this.signToken(user),
      user: this.toAuthenticatedUser(user),
    };
  }

  /** Usado pelo GET /auth/me: o front reidrata a sessao a partir do token. */
  async findById(id: string): Promise<AuthenticatedUser> {
    const user = await this.repository.findOne({ where: { id } });
    if (!user) {
      throw new AppError("Usuario nao encontrado.", 404);
    }
    return this.toAuthenticatedUser(user);
  }

  verifyToken(token: string): TokenPayload {
    try {
      return jwt.verify(token, this.secret()) as TokenPayload;
    } catch {
      // Cobre token adulterado, assinatura invalida e token expirado.
      throw new AppError("Token invalido ou expirado.", 401);
    }
  }

  private signToken(user: User): string {
    const payload: TokenPayload = {
      sub: user.id,
      name: user.name,
      role: user.role,
    };

    const options: jwt.SignOptions = {
      expiresIn: (process.env.JWT_EXPIRES_IN ||
        "8h") as jwt.SignOptions["expiresIn"],
    };

    return jwt.sign(payload, this.secret(), options);
  }

  /**
   * Sem valor padrao de proposito: um segredo "de fallback" no codigo
   * permitiria forjar tokens em producao caso a variavel fosse esquecida.
   */
  private secret(): string {
    const secret = process.env.JWT_SECRET;
    if (!secret) {
      throw new AppError("JWT_SECRET nao configurado no ambiente.", 500);
    }
    return secret;
  }

  private toAuthenticatedUser(user: User): AuthenticatedUser {
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
    };
  }
}

export const authService = new AuthService();
