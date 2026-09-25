import { Injectable } from "@nestjs/common";
import { Prisma, StoreSettings } from "@prisma/client";
import { DateTime } from "luxon";
import { PrismaService } from "../prisma/prisma.service";
import { UpdateStoreSettingsDto } from "./dto/update-store-settings.dto";
import {
  OrderingWindow,
  PublicStoreStatus,
  StoreSettingsRecord,
} from "./store-settings.types";

@Injectable()
export class StoreSettingsService {
  constructor(private readonly prisma: PrismaService) {}

  async getSettings(): Promise<StoreSettings> {
    return this.prisma.storeSettings.upsert({
      where: { id: 1 },
      create: { id: 1 },
      update: {},
    });
  }

  async update(dto: UpdateStoreSettingsDto): Promise<StoreSettings> {
    const { nextOpeningAt, defaultDeliveryFee, ...data } = dto;
    const deliveryFee =
      defaultDeliveryFee === undefined
        ? {}
        : { defaultDeliveryFee: new Prisma.Decimal(defaultDeliveryFee) };
    return this.prisma.storeSettings.upsert({
      where: { id: 1 },
      create: {
        id: 1,
        ...data,
        ...deliveryFee,
        nextOpeningAt: nextOpeningAt ? new Date(nextOpeningAt) : null,
      },
      update: {
        ...data,
        ...deliveryFee,
        ...(nextOpeningAt !== undefined && {
          nextOpeningAt: nextOpeningAt ? new Date(nextOpeningAt) : null,
        }),
      },
    });
  }

  getOrderingWindow(
    settings: StoreSettingsRecord,
    target: Date,
  ): OrderingWindow {
    const local = DateTime.fromJSDate(target, { zone: settings.timezone });
    return {
      start: local.startOf("day").toJSDate(),
      end: local.plus({ days: 1 }).startOf("day").toJSDate(),
    };
  }

  getPublicStatus(
    settings: StoreSettingsRecord,
    _now = new Date(),
  ): PublicStoreStatus {
    void _now;
    if (settings.isManuallyClosed) {
      return this.toPublicStatus(
        settings,
        false,
        "MANUALLY_CLOSED",
        settings.manualClosureReason ??
          "Les commandes sont temporairement closes.",
      );
    }

    return this.toPublicStatus(
      settings,
      true,
      "OPEN",
      "Les commandes sont ouvertes.",
    );
  }

  private toPublicStatus(
    settings: StoreSettingsRecord,
    isOpen: boolean,
    reason: PublicStoreStatus["reason"],
    message: string,
  ): PublicStoreStatus {
    return {
      businessName: settings.businessName,
      isOpen,
      reason,
      message,
      ordersOpenAt: settings.ordersOpenAt,
      ordersCloseAt: settings.ordersCloseAt,
      timezone: settings.timezone,
      allowPreorders: settings.allowPreorders,
      mobileMoneyEnabled: settings.mobileMoneyEnabled,
      nextOpeningAt: settings.nextOpeningAt?.toISOString() ?? null,
    };
  }
}
