"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Search, User, UserPlus, Users, Dumbbell } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Popover, PopoverAnchor, PopoverContent } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { members } from "@/lib/data/members";
import { leads } from "@/lib/data/leads";
import { staffMembers } from "@/lib/data/staff";
import { trainers } from "@/lib/data/trainers";
import { gymClasses } from "@/lib/data/classes";

interface SearchResult {
  id: string;
  group: string;
  icon: LucideIcon;
  label: string;
  sublabel: string;
  href: string;
}

function buildIndex(role: "owner" | "member" | "trainer"): SearchResult[] {
  if (role === "owner") {
    return [
      ...members.map((m) => ({
        id: `member-${m.id}`,
        group: "Members",
        icon: User,
        label: m.name,
        sublabel: `${m.plan} · ${m.email}`,
        href: `/owner/members/${m.id}`,
      })),
      ...leads.map((l) => ({
        id: `lead-${l.id}`,
        group: "Leads",
        icon: UserPlus,
        label: l.name,
        sublabel: `${l.source} · ${l.interest}`,
        href: `/owner/leads?leadId=${l.id}`,
      })),
      ...staffMembers.map((s) => ({
        id: `staff-${s.id}`,
        group: "Staff",
        icon: Users,
        label: s.name,
        sublabel: s.title,
        href: "/owner/staff",
      })),
      ...gymClasses.map((c) => ({
        id: `class-${c.id}`,
        group: "Classes",
        icon: Dumbbell,
        label: c.name,
        sublabel: `${c.day} · ${c.startTime}`,
        href: "/owner/classes",
      })),
    ];
  }

  if (role === "trainer") {
    return gymClasses.map((c) => ({
      id: `class-${c.id}`,
      group: "Classes",
      icon: Dumbbell,
      label: c.name,
      sublabel: `${c.day} · ${c.startTime}`,
      href: "/trainer/schedule",
    }));
  }

  return [
    ...gymClasses.map((c) => ({
      id: `class-${c.id}`,
      group: "Classes",
      icon: Dumbbell,
      label: c.name,
      sublabel: `${c.day} · ${c.startTime}`,
      href: "/portal/classes",
    })),
    ...trainers.map((t) => ({
      id: `trainer-${t.id}`,
      group: "Trainers",
      icon: Users,
      label: t.name,
      sublabel: t.role,
      href: "/portal/classes",
    })),
  ];
}

interface GlobalSearchProps {
  role: "owner" | "member" | "trainer";
  placeholder?: string;
}

export function GlobalSearch({ role, placeholder = "Search..." }: GlobalSearchProps) {
  const router = useRouter();
  const index = React.useMemo(() => buildIndex(role), [role]);
  const [query, setQuery] = React.useState("");
  const [activeIndex, setActiveIndex] = React.useState(0);
  const inputRef = React.useRef<HTMLInputElement>(null);

  const results = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    if (q.length < 2) return [];
    return index.filter((r) => r.label.toLowerCase().includes(q) || r.sublabel.toLowerCase().includes(q)).slice(0, 8);
  }, [index, query]);

  const open = query.trim().length >= 2;

  function navigate(result: SearchResult) {
    router.push(result.href);
    setQuery("");
    inputRef.current?.blur();
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!open || results.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => (i + 1) % results.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => (i - 1 + results.length) % results.length);
    } else if (e.key === "Enter") {
      e.preventDefault();
      navigate(results[activeIndex]);
    } else if (e.key === "Escape") {
      setQuery("");
    }
  }

  return (
    <Popover open={open}>
      <PopoverAnchor asChild>
        <div className="relative w-full">
          <Input
            ref={inputRef}
            role="combobox"
            aria-expanded={open}
            aria-controls="global-search-results"
            aria-label="Search"
            startIcon={<Search />}
            placeholder={placeholder}
            className="bg-muted/40"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setActiveIndex(0);
            }}
            onKeyDown={handleKeyDown}
          />
        </div>
      </PopoverAnchor>
      <PopoverContent
        id="global-search-results"
        role="listbox"
        align="start"
        sideOffset={6}
        className="w-[--radix-popover-trigger-width] max-w-sm p-1.5"
        onOpenAutoFocus={(e) => e.preventDefault()}
        onInteractOutside={() => setQuery("")}
      >
        {results.length === 0 ? (
          <p className="px-2.5 py-3 text-center text-sm text-muted-foreground">No results for &ldquo;{query}&rdquo;</p>
        ) : (
          <div className="max-h-80 overflow-y-auto">
            {results.map((r, i) => (
              <button
                key={r.id}
                type="button"
                role="option"
                aria-selected={i === activeIndex}
                onMouseEnter={() => setActiveIndex(i)}
                onClick={() => navigate(r)}
                className={cn(
                  "flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-left transition-colors",
                  i === activeIndex ? "bg-accent text-accent-foreground" : "hover:bg-muted"
                )}
              >
                <r.icon className="size-4 shrink-0 text-muted-foreground" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-foreground">{r.label}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {r.group} · {r.sublabel}
                  </p>
                </div>
              </button>
            ))}
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
