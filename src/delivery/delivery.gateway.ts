import { JwtService } from "@nestjs/jwt";
import { UserRole } from "@prisma/client";
import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
  WsException,
} from "@nestjs/websockets";
import { Server, Socket } from "socket.io";
import { JwtPayload } from "../auth/auth.types";
import { PrismaService } from "../prisma/prisma.service";
import { DeliveryTrackingService } from "./delivery-tracking.service";
import { DriverLocationDto } from "./dto/delivery-assignment.dto";

interface DeliverySocketData {
  userId?: string;
  role?: UserRole;
  orderId?: string;
}
type DeliverySocket = Socket;

@WebSocketGateway({
  namespace: "/delivery",
  cors: { origin: true, credentials: true },
})
export class DeliveryGateway implements OnGatewayConnection {
  @WebSocketServer() server: Server;
  constructor(
    private readonly jwt: JwtService,
    private readonly prisma: PrismaService,
    private readonly tracking: DeliveryTrackingService,
  ) {}

  async handleConnection(client: DeliverySocket) {
    const socketData = client.data as DeliverySocketData;
    const token =
      typeof client.handshake.auth?.token === "string"
        ? client.handshake.auth.token
        : undefined;
    if (token) {
      try {
        const payload = await this.jwt.verifyAsync<JwtPayload>(token);
        const user = await this.prisma.user.findFirst({
          where: {
            id: payload.sub,
            isActive: true,
            tokenVersion: payload.tokenVersion,
          },
        });
        if (!user) throw new Error();
        socketData.userId = user.id;
        socketData.role = user.role;
        if (user.role === UserRole.ADMIN) {
          await client.join("admin");
        } else if (user.role === UserRole.DELIVERER) {
          await client.join(`driver:${user.id}`);
        } else {
          const reference = String(client.handshake.auth?.reference ?? "");
          const order = await this.prisma.order.findFirst({
            where: { reference, customerId: user.id },
            select: { id: true },
          });
          if (!order) throw new Error();
          socketData.orderId = order.id;
          await client.join(`order:${order.id}`);
        }
        return;
      } catch {
        client.disconnect();
        return;
      }
    }
    client.disconnect();
  }

  @SubscribeMessage("driver:location")
  async location(
    @ConnectedSocket() client: DeliverySocket,
    @MessageBody() dto: DriverLocationDto,
  ) {
    const socketData = client.data as DeliverySocketData;
    if (socketData.role !== UserRole.DELIVERER || !socketData.userId)
      throw new WsException("Accès livreur requis.");
    const location = await this.tracking.recordLocation(socketData.userId, dto);
    const assignment = await this.prisma.deliveryAssignment.findUnique({
      where: { id: dto.assignmentId },
      include: { stops: true },
    });
    this.server.to("admin").emit("delivery:location", location);
    for (const stop of assignment?.stops ?? [])
      this.server
        .to(`order:${stop.orderId}`)
        .emit("delivery:location", location);
    return { success: true, recordedAt: location.recordedAt };
  }
}
