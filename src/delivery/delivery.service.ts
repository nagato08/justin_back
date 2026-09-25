import {
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { CreateDeliveryZoneDto } from "./dto/create-delivery-zone.dto";
import { UpdateDeliveryZoneDto } from "./dto/update-delivery-zone.dto";

const MINIMUM_DELIVERY_FEE = new Prisma.Decimal(500);

export interface DeliveryQuote {
  zoneId: string | null;
  zoneName: string | null;
  fee: Prisma.Decimal;
  distanceKm: number | null;
  estimatedMin: number | null;
  estimatedMax: number | null;
}

@Injectable()
export class DeliveryService {
  constructor(private readonly prisma: PrismaService) {}

  listPublicZones() {
    return this.prisma.deliveryZone.findMany({
      where: { isActive: true },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    });
  }

  listAdminZones() {
    return this.prisma.deliveryZone.findMany({
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    });
  }

  async quote(
    latitude: number | undefined,
    longitude: number | undefined,
    fallbackFee: Prisma.Decimal,
  ): Promise<DeliveryQuote> {
    const zones = await this.prisma.deliveryZone.findMany({
      where: { isActive: true },
      orderBy: [{ sortOrder: "asc" }, { radiusKm: "asc" }],
    });
    if (zones.length === 0) {
      return {
        zoneId: null,
        zoneName: null,
        fee: Prisma.Decimal.max(fallbackFee, MINIMUM_DELIVERY_FEE),
        distanceKm: null,
        estimatedMin: null,
        estimatedMax: null,
      };
    }
    if (latitude === undefined || longitude === undefined) {
      throw new ConflictException(
        "La position GPS est nécessaire pour calculer la livraison.",
      );
    }

    for (const zone of zones) {
      const distanceKm = this.distanceKm(
        latitude,
        longitude,
        Number(zone.centerLat),
        Number(zone.centerLng),
      );
      if (distanceKm <= Number(zone.radiusKm)) {
        return {
          zoneId: zone.id,
          zoneName: zone.name,
          fee: Prisma.Decimal.max(zone.fee, MINIMUM_DELIVERY_FEE),
          distanceKm: Number(distanceKm.toFixed(2)),
          estimatedMin: zone.estimatedMin,
          estimatedMax: zone.estimatedMax,
        };
      }
    }
    throw new ConflictException(
      "Cette position est hors de la zone de livraison.",
    );
  }

  async create(dto: CreateDeliveryZoneDto) {
    this.validateEstimates(dto.estimatedMin, dto.estimatedMax);
    try {
      return await this.prisma.deliveryZone.create({
        data: {
          name: dto.name.trim(),
          centerLat: new Prisma.Decimal(dto.centerLat),
          centerLng: new Prisma.Decimal(dto.centerLng),
          radiusKm: new Prisma.Decimal(dto.radiusKm),
          fee: new Prisma.Decimal(dto.fee),
          estimatedMin: dto.estimatedMin,
          estimatedMax: dto.estimatedMax,
          sortOrder: dto.sortOrder,
          isActive: dto.isActive,
        },
      });
    } catch (error) {
      this.handleUnique(error);
    }
  }

  async update(id: string, dto: UpdateDeliveryZoneDto) {
    const current = await this.prisma.deliveryZone.findUnique({
      where: { id },
    });
    if (!current) throw new NotFoundException("Zone de livraison introuvable.");
    this.validateEstimates(
      dto.estimatedMin ?? current.estimatedMin ?? undefined,
      dto.estimatedMax ?? current.estimatedMax ?? undefined,
    );
    try {
      return await this.prisma.deliveryZone.update({
        where: { id },
        data: this.toUpdateData(dto),
      });
    } catch (error) {
      this.handleUnique(error);
    }
  }

  async remove(id: string): Promise<void> {
    const zone = await this.prisma.deliveryZone.findUnique({ where: { id } });
    if (!zone) throw new NotFoundException("Zone de livraison introuvable.");
    await this.prisma.deliveryZone.update({
      where: { id },
      data: { isActive: false },
    });
  }

  private toUpdateData(
    dto: UpdateDeliveryZoneDto,
  ): Prisma.DeliveryZoneUpdateInput {
    return {
      ...dto,
      ...(dto.name && { name: dto.name.trim() }),
      ...(dto.centerLat !== undefined && {
        centerLat: new Prisma.Decimal(dto.centerLat),
      }),
      ...(dto.centerLng !== undefined && {
        centerLng: new Prisma.Decimal(dto.centerLng),
      }),
      ...(dto.radiusKm !== undefined && {
        radiusKm: new Prisma.Decimal(dto.radiusKm),
      }),
      ...(dto.fee !== undefined && { fee: new Prisma.Decimal(dto.fee) }),
    };
  }

  private validateEstimates(min?: number, max?: number): void {
    if (min !== undefined && max !== undefined && min > max) {
      throw new ConflictException(
        "Le délai minimum ne peut pas dépasser le délai maximum.",
      );
    }
  }

  private distanceKm(
    lat1: number,
    lng1: number,
    lat2: number,
    lng2: number,
  ): number {
    const radians = (value: number) => (value * Math.PI) / 180;
    const dLat = radians(lat2 - lat1);
    const dLng = radians(lng2 - lng1);
    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos(radians(lat1)) *
        Math.cos(radians(lat2)) *
        Math.sin(dLng / 2) ** 2;
    return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }

  private handleUnique(error: unknown): never {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      throw new ConflictException("Une zone porte déjà ce nom.");
    }
    throw error;
  }
}
