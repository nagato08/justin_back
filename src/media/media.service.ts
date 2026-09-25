import { BadRequestException, Injectable } from "@nestjs/common";
import { randomUUID } from "crypto";
import { mkdir, writeFile } from "fs/promises";
import { join } from "path";

@Injectable()
export class MediaService {
  async saveImage(file: Express.Multer.File): Promise<{ url: string }> {
    const extension = this.detectExtension(file.buffer);
    if (!extension) {
      throw new BadRequestException(
        "Le fichier doit être une image JPEG, PNG ou WebP valide.",
      );
    }

    const directory = join(process.cwd(), "uploads", "products");
    await mkdir(directory, { recursive: true });
    const filename = `${randomUUID()}.${extension}`;
    await writeFile(join(directory, filename), file.buffer, { flag: "wx" });
    return { url: `/uploads/products/${filename}` };
  }

  private detectExtension(buffer: Buffer): "jpg" | "png" | "webp" | null {
    if (
      buffer.length >= 3 &&
      buffer[0] === 0xff &&
      buffer[1] === 0xd8 &&
      buffer[2] === 0xff
    ) {
      return "jpg";
    }
    if (
      buffer.length >= 8 &&
      buffer
        .subarray(0, 8)
        .equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))
    ) {
      return "png";
    }
    if (
      buffer.length >= 12 &&
      buffer.subarray(0, 4).toString("ascii") === "RIFF" &&
      buffer.subarray(8, 12).toString("ascii") === "WEBP"
    ) {
      return "webp";
    }
    return null;
  }
}
