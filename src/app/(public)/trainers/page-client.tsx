"use client";

import * as React from "react";
import { TrainerCard } from "@/components/public/trainer-card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { trainers } from "@/lib/data/trainers";
import { EmptyState } from "@/components/shared/empty-state";
import { Users } from "lucide-react";

const specialties = ["All", ...Array.from(new Set(trainers.flatMap((t) => t.specialties)))];

export function TrainersPageClient() {
  const [filter, setFilter] = React.useState("All");

  const filtered =
    filter === "All" ? trainers : trainers.filter((t) => t.specialties.includes(filter));

  return (
    <div>
      <div className="flex flex-wrap justify-center gap-2">
        {specialties.map((s) => (
          <Button
            key={s}
            size="sm"
            variant={filter === s ? "primary" : "outline"}
            onClick={() => setFilter(s)}
            className={cn("rounded-full")}
          >
            {s}
          </Button>
        ))}
      </div>

      {filtered.length > 0 ? (
        <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((trainer) => (
            <TrainerCard key={trainer.id} trainer={trainer} />
          ))}
        </div>
      ) : (
        <EmptyState
          className="mt-10"
          icon={Users}
          title="No coaches match this specialty"
          description="Try a different specialty filter to see more coaches."
        />
      )}
    </div>
  );
}
