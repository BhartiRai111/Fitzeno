"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Lock, CheckCircle2 } from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/brand/logo";

export default function ResetPasswordPage() {
  const router = useRouter();
  const [password, setPassword] = React.useState("");
  const [confirm, setConfirm] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const [submitting, setSubmitting] = React.useState(false);
  const [done, setDone] = React.useState(false);

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (password !== confirm) {
      setError("Passwords don't match.");
      return;
    }
    setError(null);
    setSubmitting(true);
    setTimeout(() => {
      setSubmitting(false);
      setDone(true);
      setTimeout(() => router.push("/login"), 1600);
    }, 800);
  }

  return (
    <div className="w-full max-w-md">
      <Card className="shadow-elevation-lg">
        <CardHeader className="items-center text-center">
          <Logo iconOnly size="lg" href="" />
          <CardTitle className="mt-2">{done ? "Password reset" : "Set a new password"}</CardTitle>
          <CardDescription>
            {done
              ? "Redirecting you to login..."
              : "Choose a strong password you haven't used before."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {done ? (
            <div className="flex flex-col items-center gap-3 py-2 text-center">
              <div className="flex size-12 items-center justify-center rounded-full bg-success-tint text-success">
                <CheckCircle2 className="size-6" />
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4" noValidate>
              <div className="space-y-1.5">
                <Label htmlFor="password">New password</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  startIcon={<Lock />}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  invalid={!!error}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="confirm">Confirm new password</Label>
                <Input
                  id="confirm"
                  type="password"
                  placeholder="••••••••"
                  startIcon={<Lock />}
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  invalid={!!error}
                  required
                />
              </div>
              {error && (
                <p role="alert" className="text-sm text-destructive">
                  {error}
                </p>
              )}
              <Button type="submit" className="w-full" loading={submitting}>
                Reset Password
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
