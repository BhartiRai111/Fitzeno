"use client";

import * as React from "react";
import Link from "next/link";
import { Menu } from "lucide-react";
import { Logo } from "@/components/brand/logo";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/shared/theme-toggle";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { FreeTrialDialog } from "@/components/public/free-trial-dialog";
import { cn } from "@/lib/utils";

const navLinks = [
  { label: "Facilities", href: "/#facilities" },
  { label: "Plans", href: "/plans" },
  { label: "Classes", href: "/classes" },
  { label: "Trainers", href: "/trainers" },
  { label: "Reviews", href: "/#testimonials" },
  { label: "FAQ", href: "/#faq" },
  { label: "Contact", href: "/contact" },
];

export function SiteHeader() {
  const [mobileOpen, setMobileOpen] = React.useState(false);
  const [trialOpen, setTrialOpen] = React.useState(false);
  const [scrolled, setScrolled] = React.useState(false);

  React.useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={cn(
        "sticky top-0 z-40 w-full border-b transition-colors",
        scrolled
          ? "border-border bg-background/85 backdrop-blur-md shadow-elevation-xs"
          : "border-transparent bg-transparent"
      )}
    >
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Logo />

        <nav className="hidden items-center gap-1 lg:flex">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="hidden items-center gap-2 lg:flex">
          <ThemeToggle />
          <Button variant="outline" size="sm" onClick={() => setTrialOpen(true)}>
            Book Free Trial
          </Button>
          <Button asChild size="sm">
            <Link href="/register">Join Now</Link>
          </Button>
        </div>

        <div className="flex items-center gap-1 lg:hidden">
          <ThemeToggle />
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setMobileOpen(true)}
            aria-label="Open menu"
          >
            <Menu className="size-5" />
          </Button>
        </div>
      </div>

      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side="right" className="w-full sm:max-w-sm">
          <SheetHeader>
            <SheetTitle asChild>
              <Logo />
            </SheetTitle>
          </SheetHeader>
          <nav className="flex flex-col gap-1">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMobileOpen(false)}
                className="rounded-md px-3 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-muted"
              >
                {link.label}
              </Link>
            ))}
          </nav>
          <div className="mt-auto flex flex-col gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setMobileOpen(false);
                setTrialOpen(true);
              }}
            >
              Book Free Trial
            </Button>
            <Button asChild>
              <Link href="/register" onClick={() => setMobileOpen(false)}>
                Join Now
              </Link>
            </Button>
            <Button asChild variant="ghost" size="sm">
              <Link href="/login" onClick={() => setMobileOpen(false)}>
                Log in to your account
              </Link>
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      <FreeTrialDialog open={trialOpen} onOpenChange={setTrialOpen} />
    </header>
  );
}
