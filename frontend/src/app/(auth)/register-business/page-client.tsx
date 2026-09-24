"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Mail, Lock, User, Phone, Building2, UserPlus } from "lucide-react";
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
import { Separator } from "@/components/ui/separator";
import { Logo } from "@/components/brand/logo";
import { useAuth } from "@/lib/auth/auth-context";
import { ApiError, NetworkError } from "@/lib/api/types";

export function RegisterBusinessPageClient() {
  const router = useRouter();
  const { registerBusiness } = useAuth();
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    const form = new FormData(event.currentTarget);
    const businessName = String(form.get("businessName") ?? "").trim();
    const ownerName = String(form.get("ownerName") ?? "").trim();
    const ownerEmail = String(form.get("ownerEmail") ?? "").trim();
    const ownerPhone = String(form.get("ownerPhone") ?? "").trim();
    const ownerPassword = String(form.get("ownerPassword") ?? "");
    const [ownerFirstName, ...rest] = ownerName.split(/\s+/);
    const ownerLastName = rest.join(" ") || ownerFirstName;

    if (!businessName || !ownerFirstName || !ownerEmail || !ownerPassword) {
      setError("Fill in your gym name, your name, email, and password to continue.");
      return;
    }

    setSubmitting(true);
    try {
      await registerBusiness({
        businessName,
        ownerFirstName,
        ownerLastName,
        ownerEmail,
        ownerPassword,
        ownerPhone: ownerPhone || undefined,
      });
      router.push("/owner");
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
    <div className="w-full max-w-md space-y-4">
      <Card className="shadow-elevation-lg">
        <CardHeader className="items-center text-center">
          <Logo iconOnly size="lg" href="" />
          <CardTitle className="mt-2">Set up your gym</CardTitle>
          <CardDescription>Create your business account and start managing your gym on Fitzeno.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            <div className="space-y-1.5">
              <Label htmlFor="businessName">Gym / business name</Label>
              <Input id="businessName" name="businessName" placeholder="Ironclad Fitness" startIcon={<Building2 />} required />
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="ownerName">Your full name</Label>
                <Input id="ownerName" name="ownerName" placeholder="Jordan Smith" startIcon={<User />} required />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="ownerPhone">Phone</Label>
                <Input id="ownerPhone" name="ownerPhone" type="tel" placeholder="+44 7700 900123" startIcon={<Phone />} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ownerEmail">Email address</Label>
              <Input id="ownerEmail" name="ownerEmail" type="email" placeholder="you@example.com" startIcon={<Mail />} required />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ownerPassword">Password</Label>
              <Input id="ownerPassword" name="ownerPassword" type="password" placeholder="Create a password" startIcon={<Lock />} required />
            </div>
            {error && (
              <p role="alert" className="text-sm text-destructive">
                {error}
              </p>
            )}
            <Button type="submit" className="w-full" loading={submitting}>
              <UserPlus className="size-4" />
              Create Gym Account
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
          <p className="text-center text-sm text-muted-foreground">
            Joining as a member instead?{" "}
            <Link href="/register" className="font-medium text-primary hover:underline">
              Sign up here
            </Link>
          </p>
        </CardFooter>
      </Card>
    </div>
  );
}
