import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable, map } from 'rxjs';
import { PaginatedResult } from '../dto/pagination-query.dto.js';

interface SuccessBody<T> {
  success: true;
  data: T;
  meta?: unknown;
}

/**
 * Wraps every successful controller response in a consistent envelope so
 * the frontend has one shape to unwrap regardless of endpoint — pairs with
 * AllExceptionsFilter's `{ success: false, error }` shape on the failure
 * side. A handler returning a PaginatedResult has its `items` lifted to
 * `data` and its `meta` promoted alongside it.
 */
@Injectable()
export class ResponseInterceptor<T> implements NestInterceptor<T, SuccessBody<T>> {
  intercept(_context: ExecutionContext, next: CallHandler<T>): Observable<SuccessBody<T>> {
    return next.handle().pipe(
      map((payload) => {
        if (payload instanceof PaginatedResult) {
          return { success: true, data: payload.items, meta: payload.meta } as SuccessBody<T>;
        }
        return { success: true, data: payload };
      }),
    );
  }
}
