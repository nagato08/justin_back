import {
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import {
  DeliveryAssignmentStatus,
  DeliveryStopStatus,
  FulfillmentType,
  OrderStatus,
  OutboxEventType,
  Prisma,
  UserRole,
} from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { canTransitionOrder } from "../orders/order-status.transitions";
import { canTransitionDeliveryStop } from "./delivery-stop.transitions";
import {
  CreateDeliveryAssignmentDto,
  DriverLocationDto,
} from "./dto/delivery-assignment.dto";

@Injectable()
export class DeliveryTrackingService {
  constructor(private readonly prisma: PrismaService) {}

  async createAssignment(dto: CreateDeliveryAssignmentDto) {
    const driver = await this.prisma.user.findFirst({
      where: { id: dto.driverId, role: UserRole.DELIVERER, isActive: true },
    });
    if (!driver) throw new NotFoundException("Livreur introuvable.");
    const orders = await this.prisma.order.findMany({
      where: { id: { in: [...new Set(dto.orderIds)] } },
    });
    if (orders.length !== new Set(dto.orderIds).size)
      throw new NotFoundException("Une commande est introuvable.");
    if (
      orders.some(
        (o) =>
          o.fulfillmentType !== FulfillmentType.DELIVERY ||
          !o.deliveryLatitude ||
          !o.deliveryLongitude,
      )
    ) {
      throw new ConflictException(
        "Chaque commande doit avoir une position GPS de livraison.",
      );
    }
    const eligibleStatuses: OrderStatus[] = [
      OrderStatus.READY,
      OrderStatus.OUT_FOR_DELIVERY,
    ];
    if (orders.some((o) => !eligibleStatuses.includes(o.status))) {
      throw new ConflictException(
        "Seules les commandes prêtes peuvent être planifiées.",
      );
    }
    const ordered: Array<{ order: (typeof orders)[number]; distance: number }> =
      [];
    let latitude = dto.startLatitude;
    let longitude = dto.startLongitude;
    const remaining = [...orders];
    while (remaining.length) {
      remaining.sort(
        (a, b) =>
          this.distance(
            latitude,
            longitude,
            Number(a.deliveryLatitude),
            Number(a.deliveryLongitude),
          ) -
          this.distance(
            latitude,
            longitude,
            Number(b.deliveryLatitude),
            Number(b.deliveryLongitude),
          ),
      );
      const order = remaining.shift()!;
      const distance = this.distance(
        latitude,
        longitude,
        Number(order.deliveryLatitude),
        Number(order.deliveryLongitude),
      );
      ordered.push({ order, distance });
      latitude = Number(order.deliveryLatitude);
      longitude = Number(order.deliveryLongitude);
    }
    return this.prisma.deliveryAssignment.create({
      data: {
        driverId: dto.driverId,
        stops: {
          create: ordered.map(({ order, distance }, index) => ({
            orderId: order.id,
            sequence: index + 1,
            estimatedDistanceKm: new Prisma.Decimal(distance.toFixed(2)),
            estimatedDurationMin: Math.max(1, Math.round(distance / 0.35)),
          })),
        },
      },
      include: {
        driver: { select: { id: true, displayName: true } },
        stops: { orderBy: { sequence: "asc" }, include: { order: true } },
      },
    });
  }

  listAssignments() {
    return this.prisma.deliveryAssignment.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        driver: { select: { id: true, displayName: true } },
        stops: { orderBy: { sequence: "asc" }, include: { order: true } },
        locations: { orderBy: { recordedAt: "desc" }, take: 1 },
      },
    });
  }

  getDriverAssignments(driverId: string) {
    return this.prisma.deliveryAssignment.findMany({
      where: {
        driverId,
        status: {
          in: [
            DeliveryAssignmentStatus.PLANNED,
            DeliveryAssignmentStatus.IN_PROGRESS,
          ],
        },
      },
      include: {
        stops: {
          orderBy: { sequence: "asc" },
          include: {
            order: {
              select: {
                id: true,
                reference: true,
                status: true,
                fulfillmentType: true,
                customerName: true,
                customerPhone: true,
                deliveryAddress: true,
                deliveryLatitude: true,
                deliveryLongitude: true,
                deliveryInstructions: true,
              },
            },
          },
        },
      },
    });
  }

  async start(id: string, driverId: string) {
    const assignment = await this.authorizeDriver(id, driverId);
    if (
      assignment.status === DeliveryAssignmentStatus.COMPLETED ||
      assignment.status === DeliveryAssignmentStatus.CANCELLED
    ) {
      throw new ConflictException("Cette tournée ne peut plus être démarrée.");
    }
    return this.prisma.deliveryAssignment.update({
      where: { id },
      data: {
        status: DeliveryAssignmentStatus.IN_PROGRESS,
        startedAt: assignment.startedAt ?? new Date(),
      },
    });
  }

  async recordLocation(driverId: string, dto: DriverLocationDto) {
    const assignment = await this.authorizeDriver(dto.assignmentId, driverId);
    if (assignment.status !== DeliveryAssignmentStatus.IN_PROGRESS)
      throw new ConflictException("La tournée doit être démarrée.");
    return this.prisma.deliveryLocation.create({
      data: {
        assignmentId: dto.assignmentId,
        latitude: new Prisma.Decimal(dto.latitude),
        longitude: new Prisma.Decimal(dto.longitude),
        accuracy: dto.accuracy,
        heading: dto.heading,
        speed: dto.speed,
      },
    });
  }

  async updateStop(
    stopId: string,
    driverId: string,
    status: DeliveryStopStatus,
  ) {
    return this.prisma.$transaction(async (tx) => {
      const stop = await tx.deliveryStop.findFirst({
        where: { id: stopId, assignment: { driverId } },
        include: {
          order: true,
          assignment: { select: { status: true } },
        },
      });
      if (!stop) throw new NotFoundException("Arrêt introuvable.");
      if (stop.assignment.status !== DeliveryAssignmentStatus.IN_PROGRESS) {
        throw new ConflictException(
          "La tournée doit être démarrée pour modifier un arrêt.",
        );
      }
      if (!canTransitionDeliveryStop(stop.status, status)) {
        throw new ConflictException(
          `Passage de l’arrêt de ${stop.status} à ${status} impossible.`,
        );
      }
      if (!canTransitionOrder(stop.order.status, OrderStatus.DELIVERED)) {
        throw new ConflictException(
          "Le statut actuel de la commande interdit cette action.",
        );
      }

      const now = new Date();
      const stopUpdate = await tx.deliveryStop.updateMany({
        where: { id: stopId, status: stop.status },
        data: {
          status,
          arrivedAt:
            status === DeliveryStopStatus.ARRIVED ? now : stop.arrivedAt,
          deliveredAt:
            status === DeliveryStopStatus.DELIVERED ? now : undefined,
        },
      });
      if (stopUpdate.count !== 1) {
        throw new ConflictException(
          "L’arrêt a été modifié entre-temps. Actualisez la tournée.",
        );
      }

      if (status === DeliveryStopStatus.DELIVERED) {
        const orderUpdate = await tx.order.updateMany({
          where: { id: stop.orderId, status: stop.order.status },
          data: { status: OrderStatus.DELIVERED },
        });
        if (orderUpdate.count !== 1) {
          throw new ConflictException(
            "La commande a été modifiée entre-temps. Actualisez la tournée.",
          );
        }
        await tx.orderStatusHistory.create({
          data: {
            orderId: stop.orderId,
            fromStatus: stop.order.status,
            toStatus: OrderStatus.DELIVERED,
            actorId: driverId,
          },
        });
        await tx.outboxEvent.create({
          data: {
            type: OutboxEventType.ORDER_STATUS_CHANGED,
            orderId: stop.orderId,
            payload: {
              reference: stop.order.reference,
              customerPhone: stop.order.customerPhone,
              fromStatus: stop.order.status,
              toStatus: OrderStatus.DELIVERED,
            },
          },
        });
      }

      const openStops = await tx.deliveryStop.count({
        where: {
          assignmentId: stop.assignmentId,
          status: {
            in: [DeliveryStopStatus.PENDING, DeliveryStopStatus.ARRIVED],
          },
        },
      });
      if (openStops === 0) {
        await tx.deliveryAssignment.updateMany({
          where: {
            id: stop.assignmentId,
            status: DeliveryAssignmentStatus.IN_PROGRESS,
          },
          data: {
            status: DeliveryAssignmentStatus.COMPLETED,
            completedAt: now,
          },
        });
      }

      return tx.deliveryStop.findUniqueOrThrow({ where: { id: stopId } });
    });
  }

  async customerTracking(reference: string, customerId: string) {
    const stop = await this.prisma.deliveryStop.findFirst({
      where: { order: { reference, customerId } },
      include: {
        assignment: {
          include: {
            locations: { orderBy: { recordedAt: "desc" }, take: 1 },
            stops: {
              orderBy: { sequence: "asc" },
              select: { sequence: true, status: true, orderId: true },
            },
          },
        },
      },
    });
    if (!stop) throw new NotFoundException("Livraison introuvable.");
    return {
      assignmentId: stop.assignmentId,
      status: stop.assignment.status,
      stopSequence: stop.sequence,
      stopsBefore: stop.assignment.stops.filter(
        (s) => s.sequence < stop.sequence && s.status !== "DELIVERED",
      ).length,
      latestLocation: stop.assignment.locations[0] ?? null,
    };
  }

  private async authorizeDriver(id: string, driverId: string) {
    const assignment = await this.prisma.deliveryAssignment.findFirst({
      where: { id, driverId },
    });
    if (!assignment) throw new NotFoundException("Tournée introuvable.");
    return assignment;
  }

  private distance(lat1: number, lng1: number, lat2: number, lng2: number) {
    const rad = (x: number) => (x * Math.PI) / 180;
    const dLat = rad(lat2 - lat1),
      dLng = rad(lng2 - lng1);
    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos(rad(lat1)) * Math.cos(rad(lat2)) * Math.sin(dLng / 2) ** 2;
    return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }
}
