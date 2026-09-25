import { ConflictException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { DeliveryService } from "./delivery.service";

describe("DeliveryService", () => {
  it("sélectionne une zone contenant la position", async () => {
    const prisma = {
      deliveryZone: {
        findMany: jest.fn().mockResolvedValue([
          {
            id: "zone-1",
            name: "Centre",
            centerLat: new Prisma.Decimal(4.05),
            centerLng: new Prisma.Decimal(9.7),
            radiusKm: new Prisma.Decimal(10),
            fee: new Prisma.Decimal(1000),
            estimatedMin: 30,
            estimatedMax: 60,
          },
        ]),
      },
    };
    const service = new DeliveryService(prisma as never);

    const quote = await service.quote(4.06, 9.71, new Prisma.Decimal(500));

    expect(quote.zoneId).toBe("zone-1");
    expect(quote.fee.toString()).toBe("1000");
    expect(quote.distanceKm).toBeLessThan(10);
  });

  it("refuse une position hors des zones actives", async () => {
    const prisma = {
      deliveryZone: {
        findMany: jest.fn().mockResolvedValue([
          {
            id: "zone-1",
            name: "Centre",
            centerLat: new Prisma.Decimal(4.05),
            centerLng: new Prisma.Decimal(9.7),
            radiusKm: new Prisma.Decimal(1),
            fee: new Prisma.Decimal(1000),
          },
        ]),
      },
    };
    const service = new DeliveryService(prisma as never);

    await expect(
      service.quote(5, 10.5, new Prisma.Decimal(500)),
    ).rejects.toThrow(ConflictException);
  });
  it("applique toujours le minimum de 500 FCFA", async () => {
    const prisma = {
      deliveryZone: {
        findMany: jest.fn().mockResolvedValue([]),
      },
    };
    const service = new DeliveryService(prisma as never);

    const quote = await service.quote(4.06, 9.71, new Prisma.Decimal(0));

    expect(quote.fee.toString()).toBe("500");
  });
});
