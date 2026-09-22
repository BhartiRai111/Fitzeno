"use client";

import * as React from "react";
import Link from "next/link";
import { BellOff, Circle } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { EmptyState } from "@/components/shared/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { CATEGORY_META } from "@/lib/notification-meta";
import type { NotificationCategory, NotificationItem } from "@/lib/data/types";

type FilterValue = "all" | "unread" | NotificationCategory;

interface NotificationCenterProps {
  items: NotificationItem[];
  onItemsChange: (items: NotificationItem[]) => void;
  loading?: boolean;
  emptyTitle?: string;
  emptyDescription?: string;
}

function NotificationRow({
  item,
  onToggleRead,
  onOpen,
}: {
  item: NotificationItem;
  onToggleRead: (id: string) => void;
  onOpen: (id: string) => void;
}) {
  const meta = CATEGORY_META[item.type];
  const Icon = meta.icon;

  const content = (
    <>
      <span className={cn("flex size-9 shrink-0 items-center justify-center rounded-md", meta.className)}>
        <Icon className="size-4" />
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <p className="text-sm font-medium text-foreground">{item.title}</p>
          {item.priority === "high" && (
            <Badge variant="danger" className="shrink-0">High priority</Badge>
          )}
        </div>
        <p className="mt-0.5 text-sm text-muted-foreground">{item.description}</p>
        <div className="mt-1.5 flex items-center gap-2">
          <p className="text-xs text-muted-foreground/70">{item.timestamp}</p>
          <span className="text-xs text-muted-foreground/40">·</span>
          <p className="text-xs text-muted-foreground/70">{meta.label}</p>
        </div>
      </div>
      <button
        type="button"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onToggleRead(item.id);
        }}
        aria-label={item.read ? "Mark as unread" : "Mark as read"}
        className="mt-1 flex size-6 shrink-0 items-center justify-center rounded-full transition-colors hover:bg-muted"
      >
        <Circle className={cn("size-2.5", item.read ? "fill-transparent text-transparent" : "fill-primary text-primary")} />
      </button>
    </>
  );

  const rowClassName = cn(
    "flex items-start gap-3 px-4 py-4 transition-colors hover:bg-muted/40 sm:px-5",
    !item.read && "bg-accent/30"
  );

  if (item.href) {
    return (
      <Link href={item.href} onClick={() => onOpen(item.id)} className={rowClassName}>
        {content}
      </Link>
    );
  }

  return (
    <div role="button" tabIndex={0} onClick={() => onOpen(item.id)} className={rowClassName}>
      {content}
    </div>
  );
}

export function NotificationCenter({
  items,
  onItemsChange,
  loading = false,
  emptyTitle = "You're all caught up",
  emptyDescription = "New notifications will show up here.",
}: NotificationCenterProps) {
  const [filter, setFilter] = React.useState<FilterValue>("all");
  const unreadCount = items.filter((n) => !n.read).length;

  const categoriesPresent = React.useMemo(() => {
    const seen = new Set<NotificationCategory>();
    const ordered: NotificationCategory[] = [];
    for (const item of items) {
      if (!seen.has(item.type)) {
        seen.add(item.type);
        ordered.push(item.type);
      }
    }
    return ordered;
  }, [items]);

  function toggleRead(id: string) {
    onItemsChange(items.map((n) => (n.id === id ? { ...n, read: !n.read } : n)));
  }

  function openItem(id: string) {
    onItemsChange(items.map((n) => (n.id === id ? { ...n, read: true } : n)));
  }

  function filterItems(value: FilterValue): NotificationItem[] {
    if (value === "all") return items;
    if (value === "unread") return items.filter((n) => !n.read);
    return items.filter((n) => n.type === value);
  }

  function renderList(value: FilterValue) {
    const filtered = filterItems(value);
    if (filtered.length === 0) {
      return (
        <EmptyState
          icon={BellOff}
          title={value === "unread" ? "No unread notifications" : emptyTitle}
          description={value === "unread" ? "You've read everything — nice work." : emptyDescription}
        />
      );
    }
    return (
      <Card className="divide-y divide-border p-0">
        {filtered.map((item) => (
          <NotificationRow key={item.id} item={item} onToggleRead={toggleRead} onOpen={openItem} />
        ))}
      </Card>
    );
  }

  if (loading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-10 w-full max-w-md" />
        <Skeleton className="h-64" />
      </div>
    );
  }

  return (
    <Tabs value={filter} onValueChange={(v) => setFilter(v as FilterValue)}>
      <TabsList className="h-auto flex-wrap">
        <TabsTrigger value="all">All ({items.length})</TabsTrigger>
        <TabsTrigger value="unread">Unread ({unreadCount})</TabsTrigger>
        {categoriesPresent.map((cat) => (
          <TabsTrigger key={cat} value={cat}>
            {CATEGORY_META[cat].label}
          </TabsTrigger>
        ))}
      </TabsList>
      <TabsContent value={filter} className="space-y-4">
        {renderList(filter)}
      </TabsContent>
    </Tabs>
  );
}
