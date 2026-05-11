import { Injectable } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';
import { ExecutionContext } from '@nestjs/common';

@Injectable()
export class CustomThrottlerGuard extends ThrottlerGuard {
  protected async getTracker(req: Record<string, any>): Promise<string> {
    const forwarded = req.headers?.['x-forwarded-for'] as string;
    return forwarded?.split(',')[0]?.trim() ?? req.ip ?? 'unknown';
  }

  protected async shouldSkip(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest();
    // Skip throttling for WebSocket upgrades
    if (req?.headers?.upgrade?.toLowerCase() === 'websocket') {
      return true;
    }
    return super.shouldSkip(context);
  }
}
