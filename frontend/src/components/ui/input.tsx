import * as React from "react";
import { cn } from "@/lib/utils";

export interface InputProps extends React.ComponentProps<"input"> {
  startIcon?: React.ReactNode;
  endIcon?: React.ReactNode;
  invalid?: boolean;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, startIcon, endIcon, invalid, ...props }, ref) => {
    if (startIcon || endIcon) {
      return (
        <div className="relative flex items-center">
          {startIcon && (
            <span className="pointer-events-none absolute left-3 flex items-center text-muted-foreground [&_svg]:size-4">
              {startIcon}
            </span>
          )}
          <input
            type={type}
            ref={ref}
            data-slot="input"
            aria-invalid={invalid || undefined}
            className={cn(
              "flex h-10 w-full min-w-0 rounded-md border border-input bg-card px-3 text-sm text-foreground shadow-elevation-xs transition-[border-color,box-shadow] outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50",
              "focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/20",
              "aria-invalid:border-destructive aria-invalid:ring-destructive/20",
              startIcon && "pl-9",
              endIcon && "pr-9",
              className
            )}
            {...props}
          />
          {endIcon && (
            <span className="pointer-events-none absolute right-3 flex items-center text-muted-foreground [&_svg]:size-4">
              {endIcon}
            </span>
          )}
        </div>
      );
    }

    return (
      <input
        type={type}
        ref={ref}
        data-slot="input"
        aria-invalid={invalid || undefined}
        className={cn(
          "flex h-10 w-full min-w-0 rounded-md border border-input bg-card px-3 text-sm text-foreground shadow-elevation-xs transition-[border-color,box-shadow] outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50",
          "focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/20",
          "aria-invalid:border-destructive aria-invalid:ring-destructive/20",
          className
        )}
        {...props}
      />
    );
  }
);
Input.displayName = "Input";

export { Input };
