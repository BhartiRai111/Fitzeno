import { Controller, Get, ServiceUnavailableException } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Public } from '../common/decorators/public.decorator.js';
import { PrismaService } from '../prisma/prisma.service.js';

interface HealthReport {
  status: 'ok';
  uptimeSeconds: number;
  database: 'connected';
  timestamp: string;
}

@ApiTags('health')
@Controller('health')
export class HealthController {
  constructor(private readonly prisma: PrismaService) {}

  @Public()
  @Get()
  @ApiOperation({
    summary: 'Liveness + database connectivity check.',
    description:
      'Returns 200 with a report when the API process and its database connection are both healthy, or 503 otherwise. Unauthenticated — safe for load balancers and uptime monitors.',
  })
  async check(): Promise<HealthReport> {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
    } catch {
      throw new ServiceUnavailableException('Database is unreachable.');
    }

    return {
      status: 'ok',
      uptimeSeconds: Math.round(process.uptime()),
      database: 'connected',
      timestamp: new Date().toISOString(),
    };
  }
}
