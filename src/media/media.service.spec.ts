import { BadRequestException } from "@nestjs/common";
import { MediaService } from "./media.service";

describe("MediaService", () => {
  it("refuse un fichier qui imite une image uniquement par son nom", async () => {
    const service = new MediaService();
    const file = {
      originalname: "faux.jpg",
      mimetype: "image/jpeg",
      buffer: Buffer.from("ceci n’est pas une image"),
    } as Express.Multer.File;

    await expect(service.saveImage(file)).rejects.toThrow(BadRequestException);
  });
});
