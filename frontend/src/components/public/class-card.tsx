import { Clock, MapPin } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CapacityBar } from "@/components/shared/capacity-bar";
import { trainers } from "@/lib/data/trainers";
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

export function ClassCard({ gymClass }: { gymClass: GymClass }) {
  const trainer = trainers.find((t) => t.id === gymClass.trainerId);
  const isFull = gymClass.booked >= gymClass.capacity;

  return (
    <Card className="flex flex-col p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <Badge variant={typeColor[gymClass.type]}>{gymClass.type}</Badge>
          <h3 className="mt-2 font-display text-base font-semibold text-foreground">
            {gymClass.name}
          </h3>
          <p className="text-sm text-muted-foreground">with {trainer?.name}</p>
        </div>
      </div>
      <div className="mt-3 space-y-1.5 text-sm text-muted-foreground">
        <div className="flex items-center gap-2">
          <Clock className="size-4" />
          {gymClass.day} · {gymClass.startTime} · {gymClass.duration} min
        </div>
        <div className="flex items-center gap-2">
          <MapPin className="size-4" />
          {gymClass.location}
        </div>
      </div>
      <div className="mt-4">
        <CapacityBar booked={gymClass.booked} capacity={gymClass.capacity} />
      </div>
      <Button className="mt-4" variant={isFull ? "outline" : "primary"} size="sm" asChild>
        <a href="/register">{isFull ? "Join Waitlist" : "Book via Member Portal"}</a>
      </Button>
    </Card>
  );
}
