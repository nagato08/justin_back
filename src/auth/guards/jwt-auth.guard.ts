import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { Request } from "express";
import { PrismaService } from "../../prisma/prisma.service";
import { AuthenticatedUser, JwtPayload } from "../auth.types";

type AuthenticatedRequest = Request & { user?: AuthenticatedUser };

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const token = this.extractToken(request);
    if (!token) throw new UnauthorizedException("Authentification requise.");

    try {
      const payload = await this.jwtService.verifyAsync<JwtPayload>(token);
      const user = await this.prisma.user.findUnique({
        where: { id: payload.sub },
        select: {
          id: true,
          email: true,
          displayName: true,
          role: true,
          isActive: true,
          tokenVersion: true,
        },
      });
      if (!user?.isActive || user.tokenVersion !== payload.tokenVersion) {
        throw new UnauthorizedException();
      }

      request.user = {
        id: user.id,
        email: user.email,
        displayName: user.displayName,
        role: user.role,
      };
      return true;
    } catch {
      throw new UnauthorizedException("Jeton invalide ou expiré.");
    }
  }

  private extractToken(request: Request): string | undefined {
    const [type, token] = request.headers.authorization?.split(" ") ?? [];
    return type === "Bearer" ? token : undefined;
  }
}
