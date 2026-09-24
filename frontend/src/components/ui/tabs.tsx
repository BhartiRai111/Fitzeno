"use client";

import * as React from "react";
import * as TabsPrimitive from "@radix-ui/react-tabs";
import { cn } from "@/lib/utils";

const Tabs = TabsPrimitive.Root;

function TabsList({ className, ...props }: React.ComponentProps<typeof TabsPrimitive.List>) {
  return (
    <TabsPrimitive.List
      className={cn(
        "flex h-10 w-full items-center gap-1 overflow-x-auto border-b border-border text-muted-foreground [scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
        className
      )}
      {...props}
    />
  );
}

function TabsTrigger({ className, ...props }: React.ComponentProps<typeof TabsPrimitive.Trigger>) {
  return (
    <TabsPrimitive.Trigger
      className={cn(
        "relative inline-flex shrink-0 items-center justify-center whitespace-nowrap px-3 py-2 text-sm font-medium text-muted-foreground transition-colors outline-none",
        "hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/40 rounded-sm",
        "data-[state=active]:text-foreground",
        "after:absolute after:inset-x-0 after:-bottom-px after:h-0.5 after:scale-x-0 after:bg-primary after:transition-transform after:duration-200",
        "data-[state=active]:after:scale-x-100",
        className
      )}
      {...props}
    />
  );
}

function TabsContent({ className, ...props }: React.ComponentProps<typeof TabsPrimitive.Content>) {
  return (
    <TabsPrimitive.Content
      className={cn("mt-4 outline-none focus-visible:ring-0", className)}
      {...props}
    />
  );
}

export { Tabs, TabsList, TabsTrigger, TabsContent };
