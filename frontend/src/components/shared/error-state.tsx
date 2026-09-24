import { AlertTriangle, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

interface ErrorStateProps {
  icon?: LucideIcon;
  title?: string;
  description?: string;
  onRetry?: () => void;
  className?: string;
}

export function ErrorState({
  icon: Icon = AlertTriangle,
  title = "Something went wrong",
  description = "We couldn't load this data. Please try again.",
  onRetry,
  className,
}: ErrorStateProps) {
  return (
    <div
      role="alert"
      className={cn(
        "flex flex-col items-center justify-center gap-3 rounded-lg border border-border bg-card px-6 py-14 text-center",
        className
      )}
    >
      <div className="flex size-12 items-center justify-center rounded-full bg-danger-tint text-danger">
        <Icon className="size-6" />
      </div>
      <div className="space-y-1">
        <h3 className="font-display text-base font-semibold text-foreground">{title}</h3>
        <p className="max-w-sm text-sm text-muted-foreground">{description}</p>
      </div>
      {onRetry && (
        <Button size="sm" variant="outline" onClick={onRetry} className="mt-2">
          Try again
        </Button>
      )}
    </div>
  );
}
