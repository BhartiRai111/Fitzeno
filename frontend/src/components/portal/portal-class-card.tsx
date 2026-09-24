"use client";

import { Clock, MapPin, Check, ListOrdered } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CapacityBar } from "@/components/shared/capacity-bar";
import { useBookings } from "@/components/portal/bookings-provider";
import { trainers } from "@/lib/data/trainers";
import { formatOccurrence } from "@/lib/booking-helpers";
import type { GymClass } from "@/lib/data/types";

const typeColor: Record<GymClass["type"], "primary" | "success" | "warning" | "info" | "default" | "danger"> = {
  HIIT: "warning",
  Yoga: "info",
  Strength: "primary",
  Spin: "success",
  Boxing: "danger",
  Mobility: "default",
  Pilates: "info",
};

interface PortalClassCardProps {
  gymClass: GymClass;
  onOpen: (gymClass: GymClass) => void;
}

export function PortalClassCard({ gymClass, onOpen }: PortalClassCardProps) {
  const { classes, getStatusForClass, getWaitlistPosition } = useBookings();
  const live = classes.find((c) => c.id === gymClass.id) ?? gymClass;
  const trainer = trainers.find((t) => t.id === live.trainerId);
  const status = getStatusForClass(live.id);
  const isFull = live.booked >= live.capacity;

  return (
    <Card className="flex flex-col p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <Badge variant={typeColor[live.type]}>{live.type}</Badge>
          <h3 className="mt-2 font-display text-base font-semibold text-foreground">{live.name}</h3>
          <p className="text-sm text-muted-foreground">with {trainer?.name}</p>
        </div>
      </div>
      <div className="mt-3 space-y-1.5 text-sm text-muted-foreground">
        <div className="flex items-center gap-2">
          <Clock className="size-4" />
          {formatOccurrence(live.day)} · {live.startTime} · {live.duration} min
        </div>
        <div className="flex items-center gap-2">
          <MapPin className="size-4" />
          {live.location}
        </div>
      </div>
      <div className="mt-4">
        <CapacityBar booked={live.booked} capacity={live.capacity} />
      </div>

      {status === "booked" && (
        <div className="mt-3 flex items-center gap-1.5 text-xs font-medium text-success">
          <Check className="size-3.5" /> You&apos;re booked
        </div>
      )}
      {status === "waitlisted" && (
        <div className="mt-3 flex items-center gap-1.5 text-xs font-medium text-warning">
          <ListOrdered className="size-3.5" /> Waitlisted · #{getWaitlistPosition(live.id)}
        </div>
      )}

      <Button
        className="mt-4"
        variant={status ? "outline" : isFull ? "outline" : "primary"}
        size="sm"
        onClick={() => onOpen(live)}
      >
        {status ? "View Booking" : isFull ? "Join Waitlist" : "Book Class"}
      </Button>
    </Card>
  );
}
