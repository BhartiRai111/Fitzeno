"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bell, Menu, Search, LogOut, Settings, UserCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ThemeToggle } from "@/components/shared/theme-toggle";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Logo } from "@/components/brand/logo";
import { cn } from "@/lib/utils";
import { ownerNavSections, memberNavItems } from "@/components/dashboard/nav-config";
import type { NotificationItem } from "@/lib/data/types";

interface DashboardTopbarProps {
  role: "owner" | "member";
  roleLabel: string;
  userName: string;
  userInitials: string;
  notifications: NotificationItem[];
  searchPlaceholder?: string;
}

function isActive(pathname: string, href: string) {
  if (href === "/owner" || href === "/portal") return pathname === href;
  return pathname === href || pathname.startsWith(href + "/");
}

export function DashboardTopbar({
  role,
  roleLabel,
  userName,
  userInitials,
  notifications,
  searchPlaceholder = "Search...",
}: DashboardTopbarProps) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = React.useState(false);
  const unreadCount = notifications.filter((n) => !n.read).length;
  const sections = role === "owner" ? ownerNavSections : [{ items: memberNavItems }];

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-border bg-background/80 px-4 backdrop-blur-md sm:px-6">
      <Button
        variant="ghost"
        size="icon"
        className="lg:hidden"
        onClick={() => setMobileOpen(true)}
        aria-label="Open navigation menu"
      >
        <Menu className="size-5" />
      </Button>

      <div className="hidden max-w-sm flex-1 items-center sm:flex">
        <Input startIcon={<Search />} placeholder={searchPlaceholder} className="bg-muted/40" />
      </div>

      <div className="ml-auto flex items-center gap-1.5">
        <ThemeToggle />

        <Popover>
          <PopoverTrigger asChild>
            <Button variant="ghost" size="icon" className="relative" aria-label="Notifications">
              <Bell className="size-[18px]" />
              {unreadCount > 0 && (
                <span className="absolute right-1.5 top-1.5 size-2 rounded-full bg-danger" />
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent align="end" className="w-80 p-0">
            <div className="flex items-center justify-between px-4 py-3">
              <p className="text-sm font-semibold text-foreground">Notifications</p>
              {unreadCount > 0 && <Badge variant="primary">{unreadCount} new</Badge>}
            </div>
            <div className="h-px bg-border" />
            <ScrollArea className="max-h-80">
              <div className="divide-y divide-border">
                {notifications.map((n) => (
                  <div
                    key={n.id}
                    className={cn("px-4 py-3 transition-colors hover:bg-muted/50", !n.read && "bg-accent/40")}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm font-medium text-foreground">{n.title}</p>
                      {!n.read && <span className="mt-1 size-1.5 shrink-0 rounded-full bg-primary" />}
                    </div>
                    <p className="mt-0.5 text-xs text-muted-foreground">{n.description}</p>
                    <p className="mt-1 text-xs text-muted-foreground/70">{n.timestamp}</p>
                  </div>
                ))}
              </div>
            </ScrollArea>
            <div className="border-t border-border p-2">
              <Button variant="ghost" size="sm" className="w-full" asChild>
                <Link href={role === "owner" ? "/owner/notifications" : "/portal/notifications"}>
                  View all notifications
                </Link>
              </Button>
            </div>
          </PopoverContent>
        </Popover>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex items-center gap-2 rounded-full p-0.5 pr-2 transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
              <Avatar className="size-8">
                <AvatarFallback className="text-xs">{userInitials}</AvatarFallback>
              </Avatar>
              <span className="hidden text-sm font-medium text-foreground sm:inline">{userName}</span>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>
              <p className="text-sm font-medium text-foreground">{userName}</p>
              <p className="text-xs font-normal text-muted-foreground">{roleLabel}</p>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link href="#">
                <UserCircle />
                Profile
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href="#">
                <Settings />
                Settings
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem variant="destructive" asChild>
              <Link href="/login">
                <LogOut />
                Log out
              </Link>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side="left" className="w-72 p-0">
          <SheetHeader className="border-b border-border px-4 py-4">
            <SheetTitle asChild>
              <Logo />
            </SheetTitle>
          </SheetHeader>
          <nav className="space-y-5 overflow-y-auto px-3 py-4">
            {sections.map((section, sectionIndex) => (
              <div key={section.title ?? sectionIndex}>
                {section.title && (
                  <p className="mb-1.5 px-2.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground/70">
                    {section.title}
                  </p>
                )}
                <div className="space-y-0.5">
                  {section.items.map((item) => {
                    const active = isActive(pathname, item.href);
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={() => setMobileOpen(false)}
                        className={cn(
                          "flex items-center gap-3 rounded-md px-2.5 py-2.5 text-sm font-medium transition-colors",
                          active
                            ? "bg-accent text-accent-foreground"
                            : "text-foreground/80 hover:bg-muted"
                        )}
                      >
                        <item.icon className="size-[18px] shrink-0" />
                        {item.label}
                      </Link>
                    );
                  })}
                </div>
              </div>
            ))}
          </nav>
        </SheetContent>
      </Sheet>
    </header>
  );
}
