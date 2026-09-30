import {
  ConflictException,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";
import { compare, hash } from "bcryptjs";
import { PrismaService } from "../prisma/prisma.service";
import { AuthenticatedUser, JwtPayload } from "./auth.types";
import { LoginDto } from "./dto/login.dto";
import { ChangePasswordDto } from "./dto/change-password.dto";
import { GoogleAuthDto } from "./dto/google-auth.dto";
import { OAuth2Client } from "google-auth-library";
import { UserRole } from "@prisma/client";
import { RegisterDto } from "./dto/register.dto";

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
  ) {}

  async register(dto: RegisterDto) {
    try {
      const user = await this.prisma.user.create({
        data: {
          email: dto.email.trim().toLowerCase(),
          displayName: dto.displayName.trim(),
          passwordHash: await hash(dto.password, 12),
          role: UserRole.CUSTOMER,
        },
      });
      return this.issueSession(user);
    } catch (error) {
      if (
        error &&
        typeof error === "object" &&
        "code" in error &&
        error.code === "P2002"
      ) {
        throw new ConflictException("Cette adresse e-mail est déjà utilisée.");
      }
      throw error;
    }
  }

  async login(dto: LoginDto): Promise<{
    accessToken: string;
    expiresIn: string;
    user: AuthenticatedUser;
  }> {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email.trim().toLowerCase() },
    });
    if (
      !user?.isActive ||
      !user.passwordHash ||
      !(await compare(dto.password, user.passwordHash))
    ) {
      throw new UnauthorizedException("E-mail ou mot de passe incorrect.");
    }

    return this.issueSession(user);
  }

  async googleLogin(dto: GoogleAuthDto) {
    const clientId = this.config.get<string>("GOOGLE_CLIENT_ID");
    if (!clientId)
      throw new UnauthorizedException("Google Sign-In n’est pas configuré.");
    const ticket = await new OAuth2Client(clientId)
      .verifyIdToken({
        idToken: dto.idToken,
        audience: clientId,
      })
      .catch(() => null);
    const google = ticket?.getPayload();
    if (!google?.sub || !google.email || !google.email_verified) {
      throw new UnauthorizedException("Compte Google non vérifié.");
    }
    const email = google.email.toLowerCase();
    let user = await this.prisma.user.findFirst({
      where: { OR: [{ googleSubject: google.sub }, { email }] },
    });
    if (!user) {
      const allowed = (this.config.get<string>("GOOGLE_ALLOWED_EMAILS") ?? "")
        .split(",")
        .map((value) => value.trim().toLowerCase())
        .filter(Boolean);
      user = await this.prisma.user.create({
        data: {
          email,
          googleSubject: google.sub,
          displayName: google.name?.trim() || email.split("@")[0],
          avatarUrl: google.picture,
          role: allowed.includes(email) ? UserRole.ADMIN : UserRole.CUSTOMER,
        },
      });
    } else if (user.googleSubject && user.googleSubject !== google.sub) {
      throw new UnauthorizedException(
        "Ce compte Google ne correspond pas au compte lié.",
      );
    } else if (!user.googleSubject) {
      user = await this.prisma.user.update({
        where: { id: user.id },
        data: {
          googleSubject: google.sub,
          avatarUrl: google.picture ?? user.avatarUrl,
        },
      });
    }
    if (!user.isActive)
      throw new ForbiddenException("Ce compte est désactivé.");
    return this.issueSession(user);
  }

  private async issueSession(user: {
    id: string;
    email: string;
    displayName: string;
    role: UserRole;
    tokenVersion: number;
  }) {
    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      role: user.role,
      tokenVersion: user.tokenVersion,
    };
    const authenticatedUser: AuthenticatedUser = {
      id: user.id,
      email: user.email,
      displayName: user.displayName,
      role: user.role,
    };

    return {
      accessToken: await this.jwtService.signAsync(payload),
      expiresIn: process.env.JWT_EXPIRES_IN ?? "8h",
      user: authenticatedUser,
    };
  }

  async changePassword(
    userId: string,
    dto: ChangePasswordDto,
  ): Promise<{ success: true }> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (
      !user?.passwordHash ||
      !(await compare(dto.currentPassword, user.passwordHash))
    ) {
      throw new UnauthorizedException("Le mot de passe actuel est incorrect.");
    }
    if (dto.currentPassword === dto.newPassword) {
      throw new UnauthorizedException(
        "Le nouveau mot de passe doit être différent.",
      );
    }
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        passwordHash: await hash(dto.newPassword, 12),
        tokenVersion: { increment: 1 },
      },
    });
    return { success: true };
  }
}
