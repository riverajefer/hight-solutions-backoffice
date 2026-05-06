import {
  Controller,
  Get,
  Param,
  NotFoundException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { Public } from '../../common/decorators';
import { PrismaService } from '../../database/prisma.service';
import { ApprovalRequestRegistry } from './approval-request-registry';

@ApiTags('approvals')
@Controller('approvals')
export class WhatsappResolveController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly approvalRegistry: ApprovalRequestRegistry,
  ) {}

  @Public()
  @Get('resolve/:requestId')
  @ApiOperation({ summary: 'Resolve approval request to entity redirect info' })
  @ApiResponse({ status: 200, description: 'Returns requestType and entityId for redirect' })
  @ApiResponse({ status: 404, description: 'Request not found' })
  async resolveApproval(@Param('requestId') requestId: string) {
    const ctx = await this.prisma.whatsappActionContext.findFirst({
      where: { requestId },
      orderBy: { createdAt: 'desc' },
    });
    if (!ctx) {
      throw new NotFoundException('Solicitud no encontrada');
    }

    const handler = this.approvalRegistry.getHandler(ctx.requestType);
    if (!handler) {
      throw new NotFoundException('Handler no encontrado para este tipo de solicitud');
    }

    const entityId = await handler.getEntityId(requestId);
    if (!entityId) {
      throw new NotFoundException('Entidad asociada no encontrada');
    }

    return { requestType: ctx.requestType, entityId };
  }
}
