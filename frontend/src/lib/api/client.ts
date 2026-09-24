import { ApiError, NetworkError, type ApiErrorEnvelope, type ApiSuccessEnvelope, type Paginated } from "./types";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001/api/v1";

/**
 * The access token lives in memory only (never localStorage — a token
 * reachable from `localStorage` is a token reachable from any XSS
 * payload). It's lost on a full page reload by design; `AuthProvider`
 * rehydrates it on mount by exchanging the httpOnly `refresh_token`
 * cookie (set by the backend itself — see auth.controller.ts) for a new
 * one via `refreshAccessToken()` below. A plain module-level singleton
 * (not React state) so `apiFetch` — called from React Query hooks,
 * outside any component — can always read the current token without
 * needing it threaded through every call site.
 */
let currentAccessToken: string | null = null;
let onSessionExpired: (() => void) | null = null;

export function setAccessToken(token: string | null): void {
  currentAccessToken = token;
}

export function getAccessToken(): string | null {
  return currentAccessToken;
}

/** Registered once by AuthProvider — called when a request 401s and the silent refresh that would normally recover it also fails, so the app can clear user state and redirect to /login exactly once, from one place. */
export function setSessionExpiredHandler(handler: (() => void) | null): void {
  onSessionExpired = handler;
}

interface RequestOptions extends Omit<RequestInit, "body"> {
  body?: unknown;
  /** Skip the automatic refresh-and-retry-once flow — used only by refreshAccessToken itself, to avoid recursion. */
  skipAuthRetry?: boolean;
}

async function rawRequest<T>(path: string, options: RequestOptions): Promise<ApiSuccessEnvelope<T>> {
  const { body, headers, skipAuthRetry: _skipAuthRetry, ...rest } = options;
  void _skipAuthRetry;

  const isFormData = typeof FormData !== "undefined" && body instanceof FormData;
  const finalHeaders = new Headers(headers);
  if (body !== undefined && !isFormData) {
    finalHeaders.set("Content-Type", "application/json");
  }
  if (currentAccessToken) {
    finalHeaders.set("Authorization", `Bearer ${currentAccessToken}`);
  }

  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      ...rest,
      headers: finalHeaders,
      credentials: "include",
      body: body === undefined ? undefined : isFormData ? (body as FormData) : JSON.stringify(body),
    });
  } catch (cause) {
    throw new NetworkError(cause);
  }

  if (response.status === 204) {
    return { success: true, data: undefined as T };
  }

  let json: unknown;
  try {
    json = await response.json();
  } catch (cause) {
    if (response.ok) {
      return { success: true, data: undefined as T };
    }
    throw new NetworkError(cause);
  }

  if (!response.ok) {
    const errorBody = json as ApiErrorEnvelope;
    throw new ApiError(
      response.status,
      errorBody.error?.code ?? "INTERNAL_ERROR",
      errorBody.error?.message ?? "Something went wrong. Please try again.",
      errorBody.error?.details,
    );
  }

  return json as ApiSuccessEnvelope<T>;
}

let refreshInFlight: Promise<boolean> | null = null;

/**
 * Exchanges the httpOnly refresh cookie for a new access token. Calls
 * `rawRequest` directly (not `apiFetch`) so a failed refresh can never
 * itself trigger another refresh attempt. Deduplicated — if several
 * requests 401 at once (e.g. a dashboard firing five queries in
 * parallel), they all await the same in-flight refresh instead of racing
 * five separate ones against the backend's refresh-token rotation (which
 * revokes the old token on each use — a second concurrent refresh call
 * with the now-rotated-away cookie would fail).
 */
export async function refreshAccessToken(): Promise<boolean> {
  if (!refreshInFlight) {
    refreshInFlight = (async () => {
      try {
        const envelope = await rawRequest<{ accessToken: string }>("/auth/refresh", { method: "POST" });
        setAccessToken(envelope.data.accessToken);
        return true;
      } catch {
        setAccessToken(null);
        return false;
      } finally {
        refreshInFlight = null;
      }
    })();
  }
  return refreshInFlight;
}

async function requestWithAuthRetry<T>(path: string, options: RequestOptions): Promise<ApiSuccessEnvelope<T>> {
  try {
    return await rawRequest<T>(path, options);
  } catch (error) {
    const isAuthRoute = path.startsWith("/auth/");
    if (error instanceof ApiError && error.isUnauthorized && !options.skipAuthRetry && !isAuthRoute) {
      const refreshed = await refreshAccessToken();
      if (refreshed) {
        return rawRequest<T>(path, options);
      }
      onSessionExpired?.();
    }
    throw error;
  }
}

/** The one call every non-paginated GET/POST/PATCH/DELETE in this app goes through. Returns the unwrapped `data`. */
export async function apiFetch<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const envelope = await requestWithAuthRetry<T>(path, options);
  return envelope.data;
}

/** Same as `apiFetch`, but for a list endpoint backed by the backend's `PaginatedResult` — keeps `items`/`meta` together instead of discarding the pagination metadata `apiFetch` would drop. */
export async function apiFetchPaginated<T>(path: string, options: RequestOptions = {}): Promise<Paginated<T>> {
  const envelope = await requestWithAuthRetry<T[]>(path, options);
  return { items: envelope.data, meta: envelope.meta! };
}

/** Serializes a params object into a query string, skipping undefined/null/empty-string values and joining array values as repeated keys. Generic so a typed filter/params interface (no index signature) can be passed directly. */
export function toQueryString<T extends object>(params: T | undefined): string {
  if (!params) return "";
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === "") continue;
    if (Array.isArray(value)) {
      for (const item of value) search.append(key, String(item));
    } else {
      search.set(key, String(value));
    }
  }
  const qs = search.toString();
  return qs ? `?${qs}` : "";
}
