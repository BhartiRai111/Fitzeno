import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick?: () => void;
    href?: string;
  };
  secondaryAction?: {
    label: string;
    onClick?: () => void;
    href?: string;
  };
  className?: string;
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  secondaryAction,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-border bg-muted/30 px-6 py-14 text-center",
        className
      )}
    >
      <div className="flex size-12 items-center justify-center rounded-full bg-accent text-accent-foreground">
        <Icon className="size-6" />
      </div>
      <div className="space-y-1">
        <h3 className="font-display text-base font-semibold text-foreground">{title}</h3>
        {description && (
          <p className="max-w-sm text-sm text-muted-foreground">{description}</p>
        )}
      </div>
      {(action || secondaryAction) && (
        <div className="mt-2 flex flex-wrap items-center justify-center gap-2">
          {action &&
            (action.href ? (
              <Button asChild size="sm">
                <a href={action.href}>{action.label}</a>
              </Button>
            ) : (
              <Button size="sm" onClick={action.onClick}>
                {action.label}
              </Button>
            ))}
          {secondaryAction &&
            (secondaryAction.href ? (
              <Button asChild size="sm" variant="outline">
                <a href={secondaryAction.href}>{secondaryAction.label}</a>
              </Button>
            ) : (
              <Button size="sm" variant="outline" onClick={secondaryAction.onClick}>
                {secondaryAction.label}
              </Button>
            ))}
        </div>
      )}
    </div>
  );
}
