import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Logger } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../database/prisma.service';
import { WS_EVENTS, WS_ROOMS } from './ws-events.types';

@WebSocketGateway({
  namespace: '/ws',
  cors: {
    origin: true,
    credentials: true,
  },
})
export class WsEventsGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(WsEventsGateway.name);

  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {}

  async handleConnection(client: Socket) {
    try {
      const token =
        client.handshake.auth?.token ||
        client.handshake.headers?.authorization?.replace('Bearer ', '');

      if (!token) {
        this.logger.warn(`Client ${client.id} disconnected: no token`);
        client.disconnect();
        return;
      }

      const secret = this.configService.get<string>('JWT_ACCESS_SECRET');
      const payload = await this.jwtService.verifyAsync(token, { secret });
      const userId = payload.sub;

      if (!userId) {
        client.disconnect();
        return;
      }

      // Check if user has approve_advance_payments permission
      const hasPermission = await this.prisma.user.findFirst({
        where: {
          id: userId,
          isActive: true,
          role: {
            permissions: {
              some: { permission: { name: 'approve_advance_payments' } },
            },
          },
        },
        select: { id: true },
      });

      client.data.userId = userId;

      if (hasPermission) {
        client.join(WS_ROOMS.ADVANCE_PAYMENT_APPROVALS);
        this.logger.log(
          `Client ${client.id} (user: ${userId}) joined advance_payment_approvals room`,
        );
      }

      this.logger.log(`Client ${client.id} connected (user: ${userId})`);
    } catch (error) {
      this.logger.warn(
        `Client ${client.id} disconnected: invalid token - ${error.message}`,
      );
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client ${client.id} disconnected`);
  }

  emitApprovalCreated(data: unknown) {
    this.server
      .to(WS_ROOMS.ADVANCE_PAYMENT_APPROVALS)
      .emit(WS_EVENTS.APPROVAL_REQUEST_CREATED, data);
  }

  emitApprovalUpdated(data: unknown) {
    this.server
      .to(WS_ROOMS.ADVANCE_PAYMENT_APPROVALS)
      .emit(WS_EVENTS.APPROVAL_REQUEST_UPDATED, data);
  }
}
