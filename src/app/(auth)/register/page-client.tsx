"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Mail, Lock, User, Phone, UserPlus, Tag } from "lucide-react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { Logo } from "@/components/brand/logo";
import { cn } from "@/lib/utils";
import { membershipPlans } from "@/lib/data/plans";

function passwordStrength(password: string) {
  let score = 0;
  if (password.length >= 8) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;
  return score;
}

const strengthLabels = ["Too short", "Weak", "Fair", "Good", "Strong"];
const strengthColors = ["bg-muted", "bg-danger", "bg-warning", "bg-info", "bg-success"];

export function RegisterPageClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const planId = searchParams.get("plan");
  const offerCode = searchParams.get("offer");
  const preselectedPlan = membershipPlans.find((p) => p.id === planId);

  const [password, setPassword] = React.useState("");
  const [agreed, setAgreed] = React.useState(false);
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const strength = passwordStrength(password);

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!agreed) {
      setError("You need to accept the Terms of Service to continue.");
      return;
    }
    setError(null);
    setSubmitting(true);
    setTimeout(() => {
      setSubmitting(false);
      if (preselectedPlan) {
        const params = new URLSearchParams({ plan: preselectedPlan.id });
        if (offerCode) params.set("offer", offerCode);
        router.push(`/checkout?${params.toString()}`);
      } else {
        router.push("/portal");
      }
    }, 900);
  }

  return (
    <div className="w-full max-w-md space-y-4">
      {preselectedPlan && (
        <div className="flex items-center gap-2 rounded-md border border-primary/30 bg-accent px-3 py-2 text-sm text-accent-foreground">
          <Tag className="size-4 shrink-0" />
          Signing up for the <strong>{preselectedPlan.name}</strong> plan — £{preselectedPlan.price}/mo
        </div>
      )}
      {offerCode && (
        <div className="flex items-center gap-2 rounded-md border border-brand-lime-500/40 bg-brand-lime-400/10 px-3 py-2 text-sm text-foreground">
          <Tag className="size-4 shrink-0" />
          Offer code <strong>{offerCode}</strong> will be applied at checkout
        </div>
      )}

      <Card className="shadow-elevation-lg">
        <CardHeader className="items-center text-center">
          <Logo iconOnly size="lg" href="" />
          <CardTitle className="mt-2">Create your account</CardTitle>
          <CardDescription>Join Fitzeno and start training with a plan.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="name">Full name</Label>
                <Input id="name" name="name" placeholder="Jordan Smith" startIcon={<User />} required />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="phone">Phone</Label>
                <Input id="phone" name="phone" type="tel" placeholder="+44 7700 900123" startIcon={<Phone />} required />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="email">Email address</Label>
              <Input id="email" name="email" type="email" placeholder="you@example.com" startIcon={<Mail />} required />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                name="password"
                type="password"
                placeholder="Create a password"
                startIcon={<Lock />}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              {password.length > 0 && (
                <div className="space-y-1.5 pt-1">
                  <div className="flex gap-1">
                    {Array.from({ length: 4 }).map((_, i) => (
                      <span
                        key={i}
                        className={cn(
                          "h-1 flex-1 rounded-full transition-colors",
                          i < strength ? strengthColors[strength] : "bg-muted"
                        )}
                      />
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground">{strengthLabels[strength]}</p>
                </div>
              )}
            </div>
            <div className="flex items-start gap-2.5">
              <Checkbox
                id="terms"
                checked={agreed}
                onCheckedChange={(v) => setAgreed(v === true)}
                className="mt-0.5"
              />
              <Label htmlFor="terms" className="text-sm font-normal text-muted-foreground">
                I agree to the{" "}
                <Link href="#" className="font-medium text-primary hover:underline">
                  Terms of Service
                </Link>{" "}
                and{" "}
                <Link href="#" className="font-medium text-primary hover:underline">
                  Privacy Policy
                </Link>
              </Label>
            </div>
            {error && (
              <p role="alert" className="text-sm text-destructive">
                {error}
              </p>
            )}
            <Button type="submit" className="w-full" loading={submitting}>
              <UserPlus className="size-4" />
              Create Account
            </Button>
          </form>
        </CardContent>
        <CardFooter className="flex-col gap-4">
          <Separator />
          <p className="text-center text-sm text-muted-foreground">
            Already have an account?{" "}
            <Link href="/login" className="font-medium text-primary hover:underline">
              Log in
            </Link>
          </p>
        </CardFooter>
      </Card>
    </div>
  );
}
