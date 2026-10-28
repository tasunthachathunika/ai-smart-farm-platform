export interface HealthCheckResponse {
  status: 'ok' | 'error';
  uptime: number;
  timestamp: string;
}

export class HealthService {
  public getHealth(): HealthCheckResponse {
    return {
      status: 'ok',
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
    };
  }
}

export const healthService = new HealthService();
