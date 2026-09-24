"use client";

import * as React from "react";
import Link from "next/link";
import { Mail, MailCheck, ArrowLeft } from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/brand/logo";

export default function ForgotPasswordPage() {
  const [submitting, setSubmitting] = React.useState(false);
  const [sent, setSent] = React.useState(false);
  const [email, setEmail] = React.useState("");

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setTimeout(() => {
      setSubmitting(false);
      setSent(true);
    }, 800);
  }

  return (
    <div className="w-full max-w-md">
      <Card className="shadow-elevation-lg">
        <CardHeader className="items-center text-center">
          <Logo iconOnly size="lg" href="" />
          <CardTitle className="mt-2">{sent ? "Check your email" : "Forgot your password?"}</CardTitle>
          <CardDescription>
            {sent
              ? `We've sent password reset instructions to ${email}.`
              : "Enter your email and we'll send you a link to reset it."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {sent ? (
            <div className="flex flex-col items-center gap-4 py-2 text-center">
              <div className="flex size-12 items-center justify-center rounded-full bg-success-tint text-success">
                <MailCheck className="size-6" />
              </div>
              <p className="text-sm text-muted-foreground">
                Didn&apos;t get an email? Check your spam folder, or try again in a few minutes.
              </p>
              <Button variant="outline" size="sm" onClick={() => setSent(false)}>
                Use a different email
              </Button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4" noValidate>
              <div className="space-y-1.5">
                <Label htmlFor="email">Email address</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  startIcon={<Mail />}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              <Button type="submit" className="w-full" loading={submitting}>
                Send Reset Link
              </Button>
            </form>
          )}
          <Link
            href="/login"
            className="mt-6 flex items-center justify-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="size-4" />
            Back to login
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
