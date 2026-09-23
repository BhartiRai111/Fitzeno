import Link from "next/link";
import { Camera, MessageCircle, MapPin, Phone, Mail } from "lucide-react";
import { Logo } from "@/components/brand/logo";
import { gymProfile } from "@/lib/data/gym";

const columns = [
  {
    title: "Explore",
    links: [
      { label: "Facilities", href: "/#facilities" },
      { label: "Gallery", href: "/#gallery" },
      { label: "Membership Plans", href: "/plans" },
      { label: "Classes", href: "/classes" },
      { label: "Trainers", href: "/trainers" },
    ],
  },
  {
    title: "Company",
    links: [
      { label: "About Us", href: "/#about" },
      { label: "Reviews", href: "/#testimonials" },
      { label: "FAQ", href: "/#faq" },
      { label: "Contact", href: "/contact" },
    ],
  },
  {
    title: "Account",
    links: [
      { label: "Join Now", href: "/register" },
      { label: "Log In", href: "/login" },
      { label: "Member Portal", href: "/portal" },
      { label: "Owner Dashboard", href: "/owner" },
    ],
  },
];

export function SiteFooter() {
  return (
    <footer className="border-t border-border bg-card">
      <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-10 sm:grid-cols-2 lg:grid-cols-[1.4fr_1fr_1fr_1fr]">
          <div className="space-y-4">
            <Logo />
            <p className="max-w-xs text-sm text-muted-foreground">{gymProfile.description}</p>
            <div className="flex items-center gap-3">
              <a
                href={`https://${gymProfile.social.instagram}`}
                className="flex size-9 items-center justify-center rounded-md border border-border text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                aria-label="Instagram"
              >
                <Camera className="size-4" />
              </a>
              <a
                href={`https://${gymProfile.social.facebook}`}
                className="flex size-9 items-center justify-center rounded-md border border-border text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                aria-label="Facebook"
              >
                <MessageCircle className="size-4" />
              </a>
            </div>
          </div>

          {columns.map((column) => (
            <div key={column.title}>
              <h3 className="text-sm font-semibold text-foreground">{column.title}</h3>
              <ul className="mt-4 space-y-2.5">
                {column.links.map((link) => (
                  <li key={link.label}>
                    <Link
                      href={link.href}
                      className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-12 grid gap-3 border-t border-border pt-8 text-sm text-muted-foreground sm:grid-cols-3">
          <div className="flex items-center gap-2">
            <MapPin className="size-4 shrink-0" />
            {gymProfile.address}
          </div>
          <div className="flex items-center gap-2">
            <Phone className="size-4 shrink-0" />
            {gymProfile.phone}
          </div>
          <div className="flex items-center gap-2">
            <Mail className="size-4 shrink-0" />
            {gymProfile.email}
          </div>
        </div>

        <div className="mt-8 flex flex-col gap-2 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <p>&copy; {new Date().getFullYear()} {gymProfile.name}. All rights reserved.</p>
          <p>Built on the Fitzeno gym management platform.</p>
        </div>
      </div>
    </footer>
  );
}
