import { cn } from "@/lib/utils";

interface SectionHeadingProps {
  eyebrow?: string;
  title: string;
  description?: string;
  align?: "left" | "center";
  className?: string;
}

export function SectionHeading({
  eyebrow,
  title,
  description,
  align = "left",
  className,
}: SectionHeadingProps) {
  return (
    <div
      className={cn(
        "max-w-2xl",
        align === "center" && "mx-auto text-center",
        className
      )}
    >
      {eyebrow && (
        <span className="inline-flex items-center gap-1.5 rounded-sm bg-accent px-2.5 py-1 text-xs font-semibold uppercase tracking-wide text-accent-foreground">
          {eyebrow}
        </span>
      )}
      <h2 className="mt-3 font-display text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
        {title}
      </h2>
      {description && <p className="mt-3 text-base text-muted-foreground">{description}</p>}
    </div>
  );
}
