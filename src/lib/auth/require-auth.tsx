"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { useAuth } from "./auth-context";

export type PortalKind = "owner" | "trainer" | "member";

/** Where a signed-in user's role actually belongs — the single source of truth `RequireAuth` and the login redirect both use, so "which portal is mine" is never decided in two places. */
export function portalForUser(role: "MEMBER" | string, staffRole: string | null): PortalKind {
  if (role === "MEMBER") return "member";
  if (staffRole === "trainer") return "trainer";
  return "owner";
}

function portalHome(kind: PortalKind): string {
  if (kind === "owner") return "/owner";
  if (kind === "trainer") return "/trainer";
  return "/portal";
}

function FullScreenLoader() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <Loader2 className="size-6 animate-spin text-muted-foreground" />
    </div>
  );
}

/**
 * Gates an entire portal layout on real session state. Unauthenticated →
 * bounced to /login (with a `next` redirect back). Authenticated but the
 * wrong role for this portal (e.g. a member hitting /owner directly) →
 * bounced to their own portal, never shown the other one's UI — the
 * backend would reject every request anyway (tenant/role checks are
 * enforced server-side), this just avoids a flash of a UI the API is
 * about to refuse.
 */
export function RequireAuth({ portal, children }: { portal: PortalKind; children: React.ReactNode }) {
  const { status, user, staffRole } = useAuth();
  const router = useRouter();

  const actualPortal = user ? portalForUser(user.role, staffRole) : null;
  const mismatched = status === "authenticated" && actualPortal !== null && actualPortal !== portal;

  React.useEffect(() => {
    if (status === "unauthenticated") {
      router.replace(`/login?next=${encodeURIComponent(portalHome(portal))}`);
    } else if (mismatched && actualPortal) {
      router.replace(portalHome(actualPortal));
    }
  }, [status, mismatched, actualPortal, portal, router]);

  if (status === "loading" || status === "unauthenticated" || mismatched) {
    return <FullScreenLoader />;
  }

  return <>{children}</>;
}
