import {
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { Prisma, UserRole } from "@prisma/client";
import { hash } from "bcryptjs";
import { PrismaService } from "../prisma/prisma.service";
import { CreateUserDto } from "./dto/create-user.dto";
import { ResetPasswordDto } from "./dto/reset-password.dto";
import { UpdateUserDto } from "./dto/update-user.dto";

const PUBLIC_USER_SELECT = {
  id: true,
  email: true,
  displayName: true,
  role: true,
  isActive: true,
  lastLoginAt: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.UserSelect;

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  list() {
    return this.prisma.user.findMany({
      select: PUBLIC_USER_SELECT,
      orderBy: { createdAt: "desc" },
    });
  }

  async create(dto: CreateUserDto) {
    try {
      return await this.prisma.user.create({
        data: {
          email: dto.email.trim().toLowerCase(),
          displayName: dto.displayName.trim(),
          passwordHash: dto.password ? await hash(dto.password, 12) : null,
          role: dto.role ?? UserRole.DELIVERER,
        },
        select: PUBLIC_USER_SELECT,
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002"
      ) {
        throw new ConflictException("Cette adresse e-mail est déjà utilisée.");
      }
      throw error;
    }
  }

  async update(id: string, dto: UpdateUserDto, actorId: string) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundException("Utilisateur introuvable.");
    if (
      id === actorId &&
      (dto.isActive === false ||
        (dto.role !== undefined && dto.role !== UserRole.ADMIN))
    ) {
      throw new ConflictException(
        "Vous ne pouvez pas désactiver ou rétrograder votre propre compte.",
      );
    }
    return this.prisma.user.update({
      where: { id },
      data: {
        ...dto,
        ...(dto.displayName && { displayName: dto.displayName.trim() }),
      },
      select: PUBLIC_USER_SELECT,
    });
  }

  async resetPassword(id: string, dto: ResetPasswordDto) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!user) throw new NotFoundException("Utilisateur introuvable.");
    await this.prisma.user.update({
      where: { id },
      data: {
        passwordHash: await hash(dto.password, 12),
        tokenVersion: { increment: 1 },
      },
    });
    return { success: true };
  }
}
