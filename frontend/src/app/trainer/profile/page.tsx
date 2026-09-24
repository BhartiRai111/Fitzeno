"use client";

import * as React from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Star, Bell, ArrowRight } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { formatDate } from "@/lib/utils-data";
import { trainers } from "@/lib/data/trainers";

const TRAINER_ID = "tr-1";

const colorMap: Record<string, string> = {
  indigo: "bg-brand-indigo-100 text-brand-indigo-700 dark:bg-brand-indigo-900 dark:text-brand-indigo-200",
  lime: "bg-brand-lime-400/30 text-neutral-800 dark:text-brand-lime-400",
  amber: "bg-warning-tint text-warning",
  sky: "bg-info-tint text-info",
};

export default function TrainerProfilePage() {
  const trainer = trainers.find((t) => t.id === TRAINER_ID)!;
  const [saving, setSaving] = React.useState(false);
  const [bio, setBio] = React.useState(trainer.bio);

  function handleSave(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setTimeout(() => {
      setSaving(false);
      toast.success("Profile updated");
    }, 700);
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Profile" description="This is what members see when they view your trainer bio." />

      <Card>
        <CardHeader>
          <CardTitle>Personal information</CardTitle>
          <CardDescription>
            Joined {trainer.joinedOn ? formatDate(trainer.joinedOn) : "—"} · {trainer.yearsExperience} years coaching
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleSave}>
          <CardContent className="space-y-5">
            <div className="flex items-center gap-4">
              <Avatar className={`size-16 ${colorMap[trainer.color]}`}>
                <AvatarFallback className={`text-lg font-semibold ${colorMap[trainer.color]}`}>
                  {trainer.initials}
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="font-display text-base font-semibold text-foreground">{trainer.name}</p>
                <p className="text-sm text-muted-foreground">{trainer.role}</p>
                <div className="mt-1 flex items-center gap-1.5 text-sm">
                  <Star className="size-4 fill-brand-lime text-brand-lime" />
                  <span className="font-medium text-foreground">{trainer.rating}</span>
                  <span className="text-muted-foreground">({trainer.reviewCount} reviews)</span>
                </div>
              </div>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="fullName">Full name</Label>
                <Input id="fullName" defaultValue={trainer.name} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="role">Title</Label>
                <Input id="role" defaultValue={trainer.role} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" defaultValue={trainer.email} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="phone">Phone</Label>
                <Input id="phone" defaultValue={trainer.phone} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="bio">Bio</Label>
              <Textarea id="bio" rows={3} value={bio} onChange={(e) => setBio(e.target.value)} />
              <p className="text-xs text-muted-foreground">Shown on the public trainers page.</p>
            </div>
            <div className="space-y-1.5">
              <Label>Specialties</Label>
              <div className="flex flex-wrap gap-1.5">
                {trainer.specialties.map((s) => (
                  <Badge key={s} variant="outline">
                    {s}
                  </Badge>
                ))}
              </div>
            </div>
          </CardContent>
          <CardFooter className="justify-end border-t border-border pt-4">
            <Button type="submit" loading={saving}>
              Save changes
            </Button>
          </CardFooter>
        </form>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Notification preferences</CardTitle>
          <CardDescription>Manage how you&apos;re notified about schedule changes and member activity.</CardDescription>
        </CardHeader>
        <CardContent>
          <Button variant="outline" asChild>
            <Link href="/trainer/notifications">
              <Bell />
              Go to notification settings
              <ArrowRight className="size-4" />
            </Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
