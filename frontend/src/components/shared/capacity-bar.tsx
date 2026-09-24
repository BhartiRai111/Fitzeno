import { cn } from "@/lib/utils";

interface CapacityBarProps {
  booked: number;
  capacity: number;
  className?: string;
}

export function CapacityBar({ booked, capacity, className }: CapacityBarProps) {
  const ratio = capacity > 0 ? booked / capacity : 0;
  const isFull = booked >= capacity;
  const isNearlyFull = !isFull && ratio >= 0.75;

  return (
    <div className={cn("space-y-1.5", className)}>
      <div className="flex items-center justify-between text-xs">
        <span className="font-medium tabular text-foreground">
          {booked}/{capacity} spots
        </span>
        <span
          className={cn(
            "font-medium",
            isFull ? "text-danger" : isNearlyFull ? "text-warning" : "text-muted-foreground"
          )}
        >
          {isFull ? "Full" : isNearlyFull ? "Almost full" : "Open"}
        </span>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
        <div
          className={cn(
            "h-full rounded-full transition-all duration-500 ease-out",
            isFull ? "bg-danger" : isNearlyFull ? "bg-warning" : "bg-primary"
          )}
          style={{ width: `${Math.min(ratio * 100, 100)}%` }}
        />
      </div>
    </div>
  );
}
