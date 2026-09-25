import { Controller, Get, Query, UseGuards } from "@nestjs/common";
import { UserRole } from "@prisma/client";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { Roles } from "../auth/decorators/roles.decorator";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../auth/guards/roles.guard";
import { ReportRangeQueryDto } from "./dto/report-range-query.dto";
import { ReportsService } from "./reports.service";

@ApiTags("admin/reports")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
@Controller("admin/reports")
export class AdminReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get("dashboard")
  @ApiOperation({ summary: "Afficher les indicateurs de ventes" })
  dashboard(@Query() query: ReportRangeQueryDto) {
    return this.reportsService.dashboard(query);
  }
}
