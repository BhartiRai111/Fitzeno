import Link from "next/link";
import { cn } from "@/lib/utils";
import { LogoMark } from "@/components/brand/logo-mark";

interface LogoProps {
  className?: string;
  iconOnly?: boolean;
  href?: string;
  size?: "sm" | "md" | "lg";
}

const sizeMap = {
  sm: { mark: "size-7", text: "text-base" },
  md: { mark: "size-8", text: "text-lg" },
  lg: { mark: "size-10", text: "text-2xl" },
};

export function Logo({ className, iconOnly = false, href = "/", size = "md" }: LogoProps) {
  const content = (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <LogoMark className={sizeMap[size].mark} />
      {!iconOnly && (
        <span
          className={cn(
            "font-display font-bold tracking-tight text-foreground",
            sizeMap[size].text
          )}
        >
          Fitzeno
        </span>
      )}
    </span>
  );

  if (!href) return content;

  return (
    <Link href={href} className="inline-flex items-center rounded-md focus-visible:outline-none">
      {content}
    </Link>
  );
}
