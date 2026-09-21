"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Mail, Lock, LogIn, ShieldCheck } from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Logo } from "@/components/brand/logo";

export default function LoginPage() {
  const router = useRouter();
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    const form = new FormData(event.currentTarget);
    const email = String(form.get("email") ?? "");
    const password = String(form.get("password") ?? "");

    if (!email || !password) {
      setError("Enter both your email and password to continue.");
      return;
    }

    setSubmitting(true);
    setTimeout(() => {
      setSubmitting(false);
      router.push("/portal");
    }, 900);
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
        </CardFooter>
      </Card>

      <Card className="border-dashed bg-muted/30 p-4">
        <div className="flex items-start gap-2.5">
          <ShieldCheck className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
          <div className="text-xs text-muted-foreground">
            <p className="font-medium text-foreground">Preview this build</p>
            <p className="mt-0.5">
              The backend isn&apos;t connected yet — jump straight into a dashboard to preview the UI.
            </p>
            <div className="mt-2.5 flex flex-wrap gap-2">
              <Button asChild size="sm" variant="outline">
                <Link href="/portal">Member Portal</Link>
              </Button>
              <Button asChild size="sm" variant="outline">
                <Link href="/owner">Owner Dashboard</Link>
              </Button>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}
