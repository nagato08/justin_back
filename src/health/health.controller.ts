import { Controller, Get, ServiceUnavailableException } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { PrismaService } from "../prisma/prisma.service";

@ApiTags("health")
@Controller("health")
export class HealthController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  @ApiOperation({ summary: "Vérifier que l'API fonctionne" })
  check(): { status: string; timestamp: string } {
    return { status: "ok", timestamp: new Date().toISOString() };
  }

  @Get("ready")
  @ApiOperation({ summary: "Vérifier la connexion à PostgreSQL" })
  async ready(): Promise<{ status: string; database: string }> {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return { status: "ok", database: "connected" };
    } catch {
      throw new ServiceUnavailableException("Base de données indisponible.");
    }
  }
}
