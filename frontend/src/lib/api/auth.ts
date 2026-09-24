import { apiFetch, setAccessToken } from "./client";
import type { BackendUserRole } from "./enum-maps";

export interface BackendUser {
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

export interface AuthResult {
  user: BackendUser;
  accessToken: string;
  expiresIn: number;
}

export interface LoginInput {
  email: string;
  password: string;
}

export interface RegisterMemberInput {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phone?: string;
  /** Only required once more than one gym exists on this deployment — see RegisterDto's own comment. */
  tenantSlug?: string;
}

export interface RegisterBusinessInput {
  businessName: string;
  ownerEmail: string;
  ownerPassword: string;
  ownerFirstName: string;
  ownerLastName: string;
  ownerPhone?: string;
}

async function applySession(result: AuthResult): Promise<AuthResult> {
  setAccessToken(result.accessToken);
  return result;
}

export async function login(input: LoginInput): Promise<AuthResult> {
  const result = await apiFetch<AuthResult>("/auth/login", { method: "POST", body: input });
  return applySession(result);
}

export async function registerMember(input: RegisterMemberInput): Promise<AuthResult> {
  const result = await apiFetch<AuthResult>("/auth/register", { method: "POST", body: input });
  return applySession(result);
}

export async function registerBusiness(input: RegisterBusinessInput): Promise<AuthResult> {
  const result = await apiFetch<AuthResult>("/auth/register-business", { method: "POST", body: input });
  return applySession(result);
}

export async function logout(): Promise<void> {
  try {
    await apiFetch<void>("/auth/logout", { method: "POST" });
  } finally {
    setAccessToken(null);
  }
}

export async function fetchCurrentUser(): Promise<BackendUser> {
  return apiFetch<BackendUser>("/auth/me");
}

export async function forgotPassword(email: string): Promise<void> {
  await apiFetch<void>("/auth/forgot-password", { method: "POST", body: { email } });
}

export async function resetPassword(token: string, newPassword: string): Promise<void> {
  await apiFetch<void>("/auth/reset-password", { method: "POST", body: { token, newPassword } });
}

export async function changePassword(currentPassword: string, newPassword: string): Promise<void> {
  await apiFetch<void>("/auth/change-password", { method: "POST", body: { currentPassword, newPassword } });
}
