import {
  CallHandler,
  ExecutionContext,
  Injectable,
  Logger,
  NestInterceptor,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { Observable, tap } from 'rxjs';

/** Logs one line per request: method, path, status, and duration. */
@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger('HTTP');

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const http = context.switchToHttp();
    const request = http.getRequest<Request>();
    const response = http.getResponse<Response>();
    const start = Date.now();

    return next.handle().pipe(
      tap({
        next: () => {
          const duration = Date.now() - start;
          this.logger.log(
            `${request.method} ${request.originalUrl} ${response.statusCode} +${duration}ms`,
          );
        },
        error: (error: unknown) => {
          const duration = Date.now() - start;
          const status = response.statusCode >= 400 ? response.statusCode : 500;
          const message = error instanceof Error ? error.message : 'unknown error';
          this.logger.warn(
            `${request.method} ${request.originalUrl} ${status} +${duration}ms — ${message}`,
          );
        },
      }),
    );
  }
}
