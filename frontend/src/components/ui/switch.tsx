"use client";

import * as React from "react";
import * as SwitchPrimitive from "@radix-ui/react-switch";
import { cn } from "@/lib/utils";

function Switch({ className, ...props }: React.ComponentProps<typeof SwitchPrimitive.Root>) {
  return (
    <SwitchPrimitive.Root
      className={cn(
        "peer inline-flex h-[22px] w-10 shrink-0 items-center rounded-full border border-transparent shadow-inner transition-colors outline-none",
        "focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        "data-[state=checked]:bg-primary data-[state=unchecked]:bg-muted",
        "disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
      {...props}
    >
      <SwitchPrimitive.Thumb
        className={cn(
          "pointer-events-none block size-[18px] translate-x-0.5 rounded-full bg-white shadow transition-transform",
          "data-[state=checked]:translate-x-[19px]"
        )}
      />
    </SwitchPrimitive.Root>
  );
}

export { Switch };
