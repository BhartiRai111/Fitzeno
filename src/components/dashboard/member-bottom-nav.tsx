"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, CalendarCheck, QrCode, Bell, UserCircle } from "lucide-react";
import { cn } from "@/lib/utils";

const items = [
  { label: "Home", href: "/portal", icon: LayoutDashboard },
  { label: "Bookings", href: "/portal/bookings", icon: CalendarCheck },
  { label: "Check-in", href: "/portal/check-in", icon: QrCode, emphasized: true },
  { label: "Alerts", href: "/portal/notifications", icon: Bell },
  { label: "Profile", href: "/portal/profile", icon: UserCircle },
];

export function MemberBottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-background/95 backdrop-blur-md lg:hidden">
      <div className="mx-auto grid max-w-md grid-cols-5 px-2 pb-[max(env(safe-area-inset-bottom),0.5rem)] pt-2">
        {items.map((item) => {
          const active = pathname === item.href;
          if (item.emphasized) {
            return (
              <Link
                key={item.href}
                href={item.href}
                className="flex flex-col items-center justify-center gap-1"
              >
                <span
                  className={cn(
                    "flex size-11 items-center justify-center rounded-full shadow-elevation-md transition-transform active:scale-95",
                    active ? "bg-primary text-primary-foreground" : "bg-primary text-primary-foreground"
                  )}
                >
                  <item.icon className="size-5" />
                </span>
                <span className="text-[11px] font-medium text-muted-foreground">{item.label}</span>
              </Link>
            );
          }
          return (
            <Link
              key={item.href}
              href={item.href}
              className="flex flex-col items-center justify-center gap-1 py-1.5"
            >
              <item.icon
                className={cn("size-5", active ? "text-primary" : "text-muted-foreground")}
              />
              <span
                className={cn(
                  "text-[11px] font-medium",
                  active ? "text-primary" : "text-muted-foreground"
                )}
              >
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
