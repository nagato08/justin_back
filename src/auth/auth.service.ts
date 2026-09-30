import {
  ConflictException,
  ForbiddenException,
  HttpException,
  HttpStatus,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { compare, hash } from "bcryptjs";
import { PrismaService } from "../prisma/prisma.service";
import { AuthenticatedUser, JwtPayload } from "./auth.types";
import { LoginDto } from "./dto/login.dto";
import { ChangePasswordDto } from "./dto/change-password.dto";
import { PhoneAuthDto } from "./dto/phone-auth.dto";
import { FirebaseTokenVerifier } from "./firebase-token.verifier";
import { UserRole } from "@prisma/client";
import { RegisterDto } from "./dto/register.dto";

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly firebase: FirebaseTokenVerifier,
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
      if (isUniqueViolation(error)) {
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

  async phoneLogin(dto: PhoneAuthDto) {
    const { uid, phone } = await this.firebase.verifyPhoneToken(dto.idToken);
    let user = await this.prisma.user.findFirst({
      where: { OR: [{ firebaseUid: uid }, { phone }] },
    });
    if (!user) {
      const displayName = dto.displayName?.trim();
      if (!displayName) {
        throw new HttpException(
          "Indiquez votre nom pour créer votre compte.",
          HttpStatus.PRECONDITION_REQUIRED,
        );
      }
      user = await this.prisma.user
        .create({
          data: {
            phone,
            firebaseUid: uid,
            displayName,
            role: UserRole.CUSTOMER,
          },
        })
        .catch((error: unknown) => {
          if (isUniqueViolation(error)) {
            throw new ConflictException("Ce numéro est déjà utilisé.");
          }
          throw error;
        });
    } else if (user.firebaseUid && user.firebaseUid !== uid) {
      throw new UnauthorizedException(
        "Ce numéro ne correspond pas au compte lié.",
      );
    } else if (!user.firebaseUid || user.phone !== phone) {
      user = await this.prisma.user.update({
        where: { id: user.id },
        data: { firebaseUid: uid, phone },
      });
    }
    if (!user.isActive)
      throw new ForbiddenException("Ce compte est désactivé.");
    return this.issueSession(user);
  }

  private async issueSession(user: {
    id: string;
    email: string | null;
    phone: string | null;
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
      phone: user.phone,
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

function isUniqueViolation(error: unknown): boolean {
  return (
    !!error &&
    typeof error === "object" &&
    "code" in error &&
    error.code === "P2002"
  );
}
