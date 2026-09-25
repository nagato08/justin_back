import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from "@nestjs/common";
import { UserRole } from "@prisma/client";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { AuthenticatedUser } from "../auth/auth.types";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { Roles } from "../auth/decorators/roles.decorator";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../auth/guards/roles.guard";
import { CreateUserDto } from "./dto/create-user.dto";
import { ResetPasswordDto } from "./dto/reset-password.dto";
import { UpdateUserDto } from "./dto/update-user.dto";
import { UsersService } from "./users.service";

@ApiTags("admin/users")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
@Controller("admin/users")
export class AdminUsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @ApiOperation({ summary: "Lister les comptes de l’équipe" })
  list() {
    return this.usersService.list();
  }

  @Post()
  @ApiOperation({ summary: "Créer un compte employé" })
  create(@Body() dto: CreateUserDto) {
    return this.usersService.create(dto);
  }

  @Patch(":id")
  @ApiOperation({ summary: "Modifier ou désactiver un compte" })
  update(
    @Param("id") id: string,
    @Body() dto: UpdateUserDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.usersService.update(id, dto, actor.id);
  }

  @Post(":id/reset-password")
  @ApiOperation({ summary: "Réinitialiser le mot de passe d’un compte" })
  resetPassword(@Param("id") id: string, @Body() dto: ResetPasswordDto) {
    return this.usersService.resetPassword(id, dto);
  }
}
