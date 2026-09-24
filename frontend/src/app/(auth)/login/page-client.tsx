"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Mail, Lock, LogIn } from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Logo } from "@/components/brand/logo";
import { useAuth } from "@/lib/auth/auth-context";
import { portalForUser } from "@/lib/auth/require-auth";
import { toStaffAccessRole } from "@/lib/api/enum-maps";
import { ApiError, NetworkError } from "@/lib/api/types";

export function LoginPageClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { login } = useAuth();
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    const form = new FormData(event.currentTarget);
    const email = String(form.get("email") ?? "").trim();
    const password = String(form.get("password") ?? "");

    if (!email || !password) {
      setError("Enter both your email and password to continue.");
      return;
    }

    setSubmitting(true);
    try {
      const user = await login({ email, password });
      const next = searchParams.get("next");
      router.push(next && next.startsWith("/") ? next : `/${portalForUser(user.role, toStaffAccessRole(user.role))}`);
    } catch (err) {
      if (err instanceof ApiError || err instanceof NetworkError) {
        setError(err.message);
      } else {
        setError("Something went wrong. Please try again.");
      }
      setSubmitting(false);
    }
  }

  return (
    <div className="w-full max-w-md space-y-6">
      <Card className="shadow-elevation-lg">
        <CardHeader className="items-center text-center">
          <Logo iconOnly size="lg" href="" />
          <CardTitle className="mt-2">Welcome back</CardTitle>
          <CardDescription>Log in to your Fitzeno account to continue.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            <div className="space-y-1.5">
              <Label htmlFor="email">Email address</Label>
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="you@example.com"
                startIcon={<Mail />}
                invalid={!!error}
                autoComplete="email"
              />
            </div>
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Password</Label>
                <Link href="/forgot-password" className="text-xs font-medium text-primary hover:underline">
                  Forgot password?
                </Link>
              </div>
              <Input
                id="password"
                name="password"
                type="password"
                placeholder="••••••••"
                startIcon={<Lock />}
                invalid={!!error}
                autoComplete="current-password"
              />
            </div>
            {error && (
              <p role="alert" className="text-sm text-destructive">
                {error}
              </p>
            )}
            <Button type="submit" className="w-full" loading={submitting}>
              <LogIn className="size-4" />
              Log In
            </Button>
          </form>
        </CardContent>
        <CardFooter className="flex-col gap-4">
          <Separator />
          <p className="text-center text-sm text-muted-foreground">
            Don&apos;t have an account?{" "}
            <Link href="/register" className="font-medium text-primary hover:underline">
              Sign up
            </Link>
          </p>
          <p className="text-center text-sm text-muted-foreground">
            Opening a new gym?{" "}
            <Link href="/register-business" className="font-medium text-primary hover:underline">
              Set up your gym
            </Link>
          </p>
        </CardFooter>
      </Card>
    </div>
  );
}
