import { QrCode } from "lucide-react";
import { LogoMark } from "@/components/brand/logo-mark";
import { cn } from "@/lib/utils";

interface MembershipCardProps {
  memberName: string;
  planName: string;
  expiresOn: string;
  daysLeft: number;
  className?: string;
}

export function MembershipCard({
  memberName,
  planName,
  expiresOn,
  daysLeft,
  className,
}: MembershipCardProps) {
  const isExpiringSoon = daysLeft <= 14;

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-xl bg-gradient-to-br from-primary via-primary to-brand-indigo-800 p-6 text-primary-foreground shadow-elevation-lg",
        className
      )}
    >
      <div className="absolute -right-10 -top-10 size-40 rounded-full bg-white/10" />
      <div className="absolute -bottom-14 -left-6 size-40 rounded-full bg-white/5" />

      <div className="relative flex items-start justify-between">
        <div className="flex items-center gap-2">
          <LogoMark className="size-7" />
          <span className="font-display text-sm font-semibold tracking-wide">FITZENO</span>
        </div>
        <QrCode className="size-6 opacity-80" />
      </div>

      <div className="relative mt-8">
        <p className="text-xs uppercase tracking-wide text-white/60">Member</p>
        <p className="font-display text-xl font-semibold">{memberName}</p>
      </div>

      <div className="relative mt-6 flex items-end justify-between">
        <div>
          <p className="text-xs uppercase tracking-wide text-white/60">Plan</p>
          <p className="text-sm font-medium">{planName}</p>
        </div>
        <div className="text-right">
          <p className="text-xs uppercase tracking-wide text-white/60">
            {isExpiringSoon ? "Renews in" : "Valid until"}
          </p>
          <p className={cn("text-sm font-medium", isExpiringSoon && "text-brand-lime-400")}>
            {isExpiringSoon ? `${daysLeft} days` : expiresOn}
          </p>
        </div>
      </div>
    </div>
  );
}
