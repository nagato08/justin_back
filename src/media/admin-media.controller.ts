import {
  Controller,
  ParseFilePipeBuilder,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { UserRole } from "@prisma/client";
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiOperation,
  ApiTags,
} from "@nestjs/swagger";
import { Roles } from "../auth/decorators/roles.decorator";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../auth/guards/roles.guard";
import { MediaService } from "./media.service";

@ApiTags("admin/media")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
@Controller("admin/media")
export class AdminMediaController {
  constructor(private readonly mediaService: MediaService) {}

  @Post("images")
  @UseInterceptors(FileInterceptor("file", { limits: { fileSize: 5_000_000 } }))
  @ApiConsumes("multipart/form-data")
  @ApiBody({
    schema: {
      type: "object",
      required: ["file"],
      properties: { file: { type: "string", format: "binary" } },
    },
  })
  @ApiOperation({ summary: "Téléverser une image produit de 5 Mo maximum" })
  upload(
    @UploadedFile(
      new ParseFilePipeBuilder()
        .addMaxSizeValidator({ maxSize: 5_000_000 })
        .build({ fileIsRequired: true }),
    )
    file: Express.Multer.File,
  ) {
    return this.mediaService.saveImage(file);
  }
}
