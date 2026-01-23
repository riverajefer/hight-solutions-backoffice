import { Injectable } from '@nestjs/common';
import { SessionLogsRepository } from './session-logs.repository';
import { SessionLogsFilterDto } from './dto';

@Injectable()
export class SessionLogsService {
  constructor(private readonly sessionLogsRepository: SessionLogsRepository) {}

  /**
   * Create a login log entry
   */
  async createLoginLog(userId: string, ipAddress?: string, userAgent?: string) {
    return this.sessionLogsRepository.createLoginLog(userId, ipAddress, userAgent);
  }

  /**
   * Create a logout log entry (update the most recent active session)
   */
  async createLogoutLog(userId: string) {
    return this.sessionLogsRepository.updateLogoutLog(userId);
  }

  /**
   * Get all session logs with filters and pagination
   * Calculates duration for each session
   */
  async findAll(filters: SessionLogsFilterDto) {
    const result = await this.sessionLogsRepository.findAll(filters);

    // Add duration calculations to each session
    const dataWithDuration = result.data.map((session: any) => ({
      ...session,
      durationMinutes: this.calculateDurationMinutes(session.loginAt, session.logoutAt),
      durationFormatted: this.formatDuration(session.loginAt, session.logoutAt),
    }));

    return {
      data: dataWithDuration,
      meta: result.meta,
    };
  }

  /**
   * Get session logs for a specific user
   */
  async findByUserId(userId: string, page = 1, limit = 10) {
    const result = await this.sessionLogsRepository.findByUserId(userId, page, limit);

    // Add duration calculations
    const dataWithDuration = result.data.map((session: any) => ({
      ...session,
      durationMinutes: this.calculateDurationMinutes(session.loginAt, session.logoutAt),
      durationFormatted: this.formatDuration(session.loginAt, session.logoutAt),
    }));

    return {
      data: dataWithDuration,
      meta: result.meta,
    };
  }

  /**
   * Get all currently active sessions
   */
  async getActiveSessions() {
    const sessions = await this.sessionLogsRepository.getActiveSessions();

    // Add duration calculations (from login to now for active sessions)
    return sessions.map((session: any) => ({
      ...session,
      durationMinutes: this.calculateDurationMinutes(session.loginAt, null),
      durationFormatted: this.formatDuration(session.loginAt, null),
    }));
  }

  /**
   * Calculate session duration in minutes
   * Returns null if logoutAt is null (active session)
   */
  private calculateDurationMinutes(loginAt: Date, logoutAt: Date | null): number | null {
    if (!logoutAt) {
      // For active sessions, calculate duration from login to now
      const now = new Date();
      return Math.floor((now.getTime() - new Date(loginAt).getTime()) / (1000 * 60));
    }

    const loginTime = new Date(loginAt).getTime();
    const logoutTime = new Date(logoutAt).getTime();
    return Math.floor((logoutTime - loginTime) / (1000 * 60));
  }

  /**
   * Format duration in a human-readable format (e.g., "9h 15m")
   * Returns "Sesión activa" if logoutAt is null
   */
  private formatDuration(loginAt: Date, logoutAt: Date | null): string {
    const minutes = this.calculateDurationMinutes(loginAt, logoutAt);

    if (minutes === null || logoutAt === null) {
      return 'Sesión activa';
    }

    if (minutes < 1) {
      return '< 1m';
    }

    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;

    if (hours === 0) {
      return `${mins}m`;
    }

    if (mins === 0) {
      return `${hours}h`;
    }

    return `${hours}h ${mins}m`;
  }
}
