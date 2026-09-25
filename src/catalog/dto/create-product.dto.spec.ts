import { validate } from "class-validator";
import { CreateProductDto } from "./create-product.dto";

function product(imageUrl: string): CreateProductDto {
  return Object.assign(new CreateProductDto(), {
    categoryId: "category-id",
    name: "Poulet braisé",
    price: 5000,
    imageUrl,
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
