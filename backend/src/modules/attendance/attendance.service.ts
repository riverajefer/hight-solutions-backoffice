import {
  Injectable,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { AttendanceRepository } from './attendance.repository';
import { AttendanceSource } from '../../generated/prisma';
import { ClockInDto, ClockOutDto, AttendanceFilterDto, AdjustAttendanceDto } from './dto';

@Injectable()
export class AttendanceService {
  constructor(private readonly repository: AttendanceRepository) {}

  /**
   * Marca entrada para un usuario.
   * Lanza ConflictException si ya tiene un registro activo.
   */
  async clockIn(userId: string, dto?: ClockInDto, ip?: string) {
    const existing = await this.repository.findActiveRecord(userId);
    if (existing) {
      throw new ConflictException(
        'Ya tienes una entrada activa. Debes marcar salida antes de marcar una nueva entrada.',
      );
    }

    // Preparar metadatos incluyendo el mock de geolocalización por IP
    let finalMetadata = dto?.metadata ? { ...dto.metadata } : {};
    
    if (ip) {
      finalMetadata.ipAddress = ip;
      // Mock de geolocalización por IP (backend enrichment)
      // En un entorno real se usaría un servicio externo como ipapi, maxmind, etc.
      finalMetadata.geoIp = {
        country: 'Colombia', // Mock
        city: 'Bogotá',      // Mock
        lat: 4.6097,
        lng: -74.0817,
      };
    }

    return this.repository.createClockIn(userId, new Date(), dto?.notes, Object.keys(finalMetadata).length > 0 ? finalMetadata : undefined);
  }

  /**
   * Marca salida para un usuario.
   * Lanza NotFoundException si no hay registro activo.
   */
  async clockOut(userId: string, dto: ClockOutDto) {
    const active = await this.repository.findActiveRecord(userId);
    if (!active) {
      throw new NotFoundException('No tienes una entrada activa para marcar salida.');
    }
    return this.repository.updateClockOut(active.id, new Date(), AttendanceSource.BUTTON, dto.notes);
  }

  /**
   * Devuelve el estado actual de asistencia del usuario.
   */
  async getMyStatus(userId: string): Promise<{ active: boolean; record: any | null }> {
    const record = await this.repository.findActiveRecord(userId);
    return { active: !!record, record: record ?? null };
  }

  /**
   * Devuelve los registros propios del usuario con filtros.
   */
  async getMyRecords(userId: string, filters: AttendanceFilterDto) {
    return this.repository.findMyRecords(userId, filters);
  }

  /**
   * Devuelve todos los registros (admin/manager).
   */
  async findAll(filters: AttendanceFilterDto) {
    return this.repository.findAll(filters);
  }

  /**
   * Ajusta un registro (admin). Lanza NotFoundException si no existe.
   */
  async adjustRecord(id: string, dto: AdjustAttendanceDto) {
    const result = await this.repository.adjustRecord(id, dto);
    if (!result) {
      throw new NotFoundException(`Registro de asistencia con id ${id} no encontrado.`);
    }
    return result;
  }

  /**
   * Registra un heartbeat de actividad (fire & forget desde el interceptor).
   * No debe bloquear el request.
   */
  async recordHeartbeat(userId: string, endpoint?: string): Promise<void> {
    await this.repository.createHeartbeat(userId, endpoint);
  }

  /**
   * Cierra automáticamente los registros de usuarios inactivos (> 30 min sin heartbeat).
   * Llamado por el cron job cada 15 minutos.
   * Retorna el número de registros cerrados.
   */
  async autoCloseInactiveRecords(): Promise<number> {
    const INACTIVITY_MINUTES = 30;
    const inactive = await this.repository.findOpenRecordsInactiveFor(INACTIVITY_MINUTES);

    for (const record of inactive) {
      await this.repository.updateClockOut(
        record.id,
        new Date(),
        AttendanceSource.INACTIVITY,
      );
    }

    return inactive.length;
  }

  /**
   * Cierra todos los registros abiertos con el source indicado.
   * Llamado por el cron job al final del día.
   */
  async closeAllOpenRecords(source: AttendanceSource): Promise<number> {
    const open = await this.repository.findAllOpenRecords();

    for (const record of open) {
      await this.repository.updateClockOut(record.id, new Date(), source);
    }

    return open.length;
  }

  /**
   * Cierra el registro activo del usuario al hacer logout.
   * No lanza error si no hay registro activo.
   */
  async closeOpenRecordOnLogout(userId: string): Promise<void> {
    const active = await this.repository.findActiveRecord(userId);
    if (active) {
      await this.repository.updateClockOut(active.id, new Date(), AttendanceSource.LOGOUT);
    }
  }

  /**
   * Elimina heartbeats antiguos (> 7 días). Llamado por cron.
   */
  async cleanOldHeartbeats(): Promise<number> {
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const result = await this.repository.deleteOldHeartbeats(sevenDaysAgo);
    return result.count;
  }
}
