import Link from "next/link";
import { Logo } from "@/components/brand/logo";
import { ThemeToggle } from "@/components/shared/theme-toggle";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative flex min-h-screen flex-col bg-hero-gradient">
      <div className="absolute inset-0 bg-grid-fade opacity-30" />
      <header className="relative z-10 flex items-center justify-between px-4 py-5 sm:px-6 lg:px-8">
        <Logo />
        <ThemeToggle />
      </header>
      <main className="relative z-10 flex flex-1 items-center justify-center px-4 py-8 sm:px-6">
        {children}
      </main>
      <footer className="relative z-10 px-4 py-6 text-center text-xs text-muted-foreground">
        <Link href="/" className="hover:text-foreground">
          &larr; Back to fitzeno.app
        </Link>
      </footer>
    </div>
  );
}
