import { apiFetchPaginated, toQueryString } from "./client";
import type { PaginationParams, Paginated } from "./types";
import type { BackendUserRole } from "./enum-maps";

export interface BackendStaffUser {
  id: string;
  tenantId: string;
  email: string;
  firstName: string;
  lastName: string;
  phone: string | null;
  role: BackendUserRole;
  status: "ACTIVE" | "INVITED" | "INACTIVE";
  lastLoginAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ListUsersParams extends PaginationParams {
  role?: BackendUserRole;
  status?: BackendStaffUser["status"];
}

export async function fetchUsers(params?: ListUsersParams): Promise<Paginated<BackendStaffUser>> {
  return apiFetchPaginated<BackendStaffUser>(`/users${toQueryString(params)}`);
}
