import { cn } from "@/lib/utils";

export function LogoMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn("size-8", className)}
      aria-hidden="true"
    >
      <rect width="64" height="64" rx="16" className="fill-primary" />
      <path
        d="M14 34H22L27 22L34 42L39 30H50"
        stroke="white"
        strokeWidth="4.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="50" cy="30" r="4" className="fill-brand-lime" />
    </svg>
  );
}
