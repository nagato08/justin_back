import { validate } from "class-validator";
import { CreateProductDto } from "./create-product.dto";

function product(imageUrl?: string): CreateProductDto {
  return Object.assign(new CreateProductDto(), {
    categoryId: "category-id",
    name: "Poulet braisé",
    price: 5000,
    ...(imageUrl ? { imageUrl } : {}),
  });
}

describe("CreateProductDto imageUrl", () => {
  it.each([
    "/uploads/products/550e8400-e29b-41d4-a716-446655440000.webp",
    "https://images.example.com/products/poulet.jpg",
  ])("accepte l’image %s", async (imageUrl) => {
    expect(await validate(product(imageUrl))).toHaveLength(0);
  });

  it.each(["javascript:alert(1)", "data:image/png;base64,AAAA", "/etc/passwd"])(
    "refuse la valeur %s",
    async (imageUrl) => {
      const errors = await validate(product(imageUrl));
      expect(errors.some((error) => error.property === "imageUrl")).toBe(true);
    },
  );
});

describe("CreateProductDto imageUrls", () => {
  it("accepte une galerie de huit images valides", async () => {
    const dto = product();
    dto.imageUrls = Array.from(
      { length: 8 },
      (_, index) => `/uploads/products/photo-${index}.webp`,
    );
    expect(await validate(dto)).toHaveLength(0);
  });

  it("refuse plus de huit images", async () => {
    const dto = product();
    dto.imageUrls = Array.from(
      { length: 9 },
      (_, index) => `/uploads/products/photo-${index}.webp`,
    );
    const errors = await validate(dto);
    expect(errors.some((error) => error.property === "imageUrls")).toBe(true);
  });

  it("refuse une adresse dangereuse dans la galerie", async () => {
    const dto = product();
    dto.imageUrls = ["/uploads/products/photo.webp", "javascript:alert(1)"];
    const errors = await validate(dto);
    expect(errors.some((error) => error.property === "imageUrls")).toBe(true);
  });
});
