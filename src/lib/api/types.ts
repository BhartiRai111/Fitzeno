/**
 * Shapes mirroring the backend's own response envelope exactly — see
 * backend/src/common/interceptors/response.interceptor.ts (success) and
 * backend/src/common/filters/all-exceptions.filter.ts (error). Every
 * endpoint's JSON body is one of these two shapes; nothing in this app
 * should need to guess.
 */
export interface ApiSuccessEnvelope<T> {
  success: true;
  data: T;
  meta?: PaginationMeta;
}

export interface ApiErrorEnvelope {
  success: false;
  error: {
    code: ApiErrorCode;
    message: string;
    details?: string[];
  };
  path: string;
  timestamp: string;
}

/** Mirrors backend/src/common/errors/error-code.enum.ts 1:1. */
export type ApiErrorCode =
  | "VALIDATION_ERROR"
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "CONFLICT"
  | "TOO_MANY_REQUESTS"
  | "INTERNAL_ERROR";

export interface PaginationMeta {
  page: number;
  limit: number;
  totalItems: number;
  totalPages: number;
}

/** What `PaginatedResult` on the backend lifts into `{ data, meta }` — see ResponseInterceptor. */
export interface Paginated<T> {
  items: T[];
  meta: PaginationMeta;
}

export interface PaginationParams {
  page?: number;
  limit?: number;
  search?: string;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}

/**
 * Thrown by every failed `apiFetch` call — callers switch on `code` instead
 * of parsing `message` (the message is for display, the code is for logic).
 * `status` is the HTTP status actually returned, kept alongside `code`
 * since a few statuses (e.g. 429) don't carry field-level `details`.
 */
export class ApiError extends Error {
  readonly status: number;
  readonly code: ApiErrorCode;
  readonly details?: string[];

  constructor(status: number, code: ApiErrorCode, message: string, details?: string[]) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.details = details;
  }

  get isUnauthorized() {
    return this.status === 401;
  }

  get isForbidden() {
    return this.status === 403;
  }

  get isNotFound() {
    return this.status === 404;
  }

  get isValidation() {
    return this.code === "VALIDATION_ERROR";
  }
}

/** A network-level failure (offline, DNS, CORS, backend unreachable) — never reached the server, so there's no envelope to unwrap. */
export class NetworkError extends Error {
  constructor(cause?: unknown) {
    super("Couldn't reach the server. Check your connection and try again.");
    this.name = "NetworkError";
    this.cause = cause;
  }
}
