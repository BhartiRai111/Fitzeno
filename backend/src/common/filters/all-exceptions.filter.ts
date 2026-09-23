import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { Prisma } from '../../generated/prisma/client.js';
import { ErrorCode } from '../errors/error-code.enum.js';

interface ErrorBody {
  success: false;
  error: {
    code: ErrorCode;
    message: string;
    /** Field-level validation errors, when this came from the ValidationPipe. */
    details?: string[];
  };
  path: string;
  timestamp: string;
}

const STATUS_TO_CODE: Partial<Record<number, ErrorCode>> = {
  [HttpStatus.BAD_REQUEST]: ErrorCode.VALIDATION_ERROR,
  [HttpStatus.UNAUTHORIZED]: ErrorCode.UNAUTHORIZED,
  [HttpStatus.FORBIDDEN]: ErrorCode.FORBIDDEN,
  [HttpStatus.NOT_FOUND]: ErrorCode.NOT_FOUND,
  [HttpStatus.CONFLICT]: ErrorCode.CONFLICT,
  [HttpStatus.TOO_MANY_REQUESTS]: ErrorCode.TOO_MANY_REQUESTS,
};

/**
 * Catches every exception thrown anywhere in the request lifecycle —
 * Nest HttpExceptions (including ones the ValidationPipe throws), known
 * Prisma errors, and anything unexpected — and normalizes them into one
 * response shape so the frontend never has to special-case where an error
 * came from. Unexpected errors are logged with their full stack server-side
 * but never leak internals (stack traces, SQL, file paths) to the client.
 */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger('ExceptionFilter');

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const { status, code, message, details } = this.resolve(exception);

    if (status >= HttpStatus.INTERNAL_SERVER_ERROR) {
      this.logger.error(
        `${request.method} ${request.url} -> ${status}: ${message}`,
        exception instanceof Error ? exception.stack : undefined,
      );
    }

    const body: ErrorBody = {
      success: false,
      error: { code, message, ...(details ? { details } : {}) },
      path: request.originalUrl ?? request.url,
      timestamp: new Date().toISOString(),
    };

    response.status(status).json(body);
  }

  private resolve(exception: unknown): {
    status: number;
    code: ErrorCode;
    message: string;
    details?: string[];
  } {
    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const body = exception.getResponse();
      const code = STATUS_TO_CODE[status] ?? ErrorCode.INTERNAL_ERROR;

      if (typeof body === 'string') {
        return { status, code, message: body };
      }

      const bodyObj = body as { message?: string | string[]; error?: string };
      if (Array.isArray(bodyObj.message)) {
        // class-validator's ValidationPipe throws with `message` as a
        // string array — one entry per failed constraint.
        return {
          status,
          code,
          message: 'Validation failed.',
          details: bodyObj.message,
        };
      }

      return {
        status,
        code,
        message: bodyObj.message ?? bodyObj.error ?? exception.message,
      };
    }

    if (exception instanceof Prisma.PrismaClientKnownRequestError) {
      switch (exception.code) {
        case 'P2002':
          return {
            status: HttpStatus.CONFLICT,
            code: ErrorCode.CONFLICT,
            message: 'A record with these details already exists.',
          };
        case 'P2025':
          return {
            status: HttpStatus.NOT_FOUND,
            code: ErrorCode.NOT_FOUND,
            message: 'The requested record was not found.',
          };
        case 'P2003':
          return {
            status: HttpStatus.CONFLICT,
            code: ErrorCode.CONFLICT,
            message: 'This action conflicts with related data.',
          };
        default:
          break;
      }
    }

    return {
      status: HttpStatus.INTERNAL_SERVER_ERROR,
      code: ErrorCode.INTERNAL_ERROR,
      message: 'Something went wrong. Please try again.',
    };
  }
}
