import { BadRequestException, Injectable } from "@nestjs/common";
import { OrderStatus, PaymentStatus, Prisma } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { ReportRangeQueryDto } from "./dto/report-range-query.dto";

@Injectable()
export class ReportsService {
  constructor(private readonly prisma: PrismaService) {}

  async dashboard(query: ReportRangeQueryDto) {
    const to = query.to ? new Date(query.to) : new Date();
    const from = query.from
      ? new Date(query.from)
      : new Date(to.getTime() - 30 * 24 * 60 * 60 * 1000);
    if (from >= to) {
      throw new BadRequestException("La date de début doit précéder la fin.");
    }
    const range = { gte: from, lte: to };

    const [ordersByStatus, orderTotals, revenue, popularProducts] =
      await Promise.all([
        this.prisma.order.groupBy({
          by: ["status"],
          where: { createdAt: range },
          orderBy: { status: "asc" },
          _count: { _all: true },
        }),
        this.prisma.order.aggregate({
          where: {
            createdAt: range,
            status: { not: OrderStatus.CANCELLED },
          },
          _count: { _all: true },
          _sum: { total: true, deliveryFee: true },
          _avg: { total: true },
        }),
        this.prisma.payment.aggregate({
          where: { status: PaymentStatus.SUCCEEDED, paidAt: range },
          _sum: { amount: true },
          _count: { _all: true },
        }),
        this.prisma.orderItem.groupBy({
          by: ["productName"],
          where: {
            order: {
              createdAt: range,
              status: { not: OrderStatus.CANCELLED },
            },
          },
          _sum: { quantity: true, lineTotal: true },
          orderBy: { _sum: { quantity: "desc" } },
          take: 10,
        }),
      ]);

    const statusCounts = Object.fromEntries(
      Object.values(OrderStatus).map((status) => [status, 0]),
    ) as Record<OrderStatus, number>;
    for (const row of ordersByStatus) {
      statusCounts[row.status] = row._count._all;
    }

    return {
      range: { from: from.toISOString(), to: to.toISOString() },
      orders: {
        total: Object.values(statusCounts).reduce(
          (sum, value) => sum + value,
          0,
        ),
        activeTotal: orderTotals._count._all,
        byStatus: statusCounts,
        grossValue: orderTotals._sum.total ?? new Prisma.Decimal(0),
        deliveryFees: orderTotals._sum.deliveryFee ?? new Prisma.Decimal(0),
        averageValue: orderTotals._avg.total ?? new Prisma.Decimal(0),
      },
      payments: {
        receivedCount: revenue._count._all,
        receivedAmount: revenue._sum.amount ?? new Prisma.Decimal(0),
      },
      popularProducts: popularProducts.map((row) => ({
        name: row.productName,
        quantity: row._sum.quantity ?? 0,
        amount: row._sum.lineTotal ?? new Prisma.Decimal(0),
      })),
    };
  }
}
