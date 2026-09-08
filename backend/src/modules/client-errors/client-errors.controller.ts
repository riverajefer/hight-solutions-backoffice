import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  Req,
} from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import type { Request } from 'express';
import { Public } from '../../common/decorators/public.decorator';
import { ClientErrorsService } from './client-errors.service';
import { ReportClientErrorDto } from './dto/report-client-error.dto';

@ApiTags('client-errors')
@Controller('client-errors')
export class ClientErrorsController {
  constructor(private readonly service: ClientErrorsService) {}

  /**
   * Recibe los errores de JavaScript que ocurren en el navegador.
   *
   * Es público porque un error puede ocurrir antes del login o justo cuando la
   * sesión expira, que son escenarios que también hay que poder diagnosticar.
   * El límite de peticiones es bajo para que un bucle de errores en un cliente
   * no inunde el log.
   */
  @Post()
  @Public()
  @Throttle({ default: { ttl: 60_000, limit: 20 } })
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Reportar un error ocurrido en el frontend' })
  @ApiResponse({ status: 204, description: 'Error registrado en el log' })
  report(@Body() dto: ReportClientErrorDto, @Req() req: Request): void {
    this.service.report(dto, {
      ip: req.ip,
      userAgent: req.get('user-agent'),
    });
  }
}
