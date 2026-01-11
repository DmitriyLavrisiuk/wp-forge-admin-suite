import * as React from "react";

import { cn } from "@/lib/utils";

type TooltipContextValue = {
  open: boolean;
  setOpen: (open: boolean) => void;
};

const TooltipContext = React.createContext<TooltipContextValue | null>(null);

function useTooltipContext() {
  const context = React.useContext(TooltipContext);
  if (!context) {
    throw new Error("Tooltip components must be used within <Tooltip>.");
  }
  return context;
}

export function TooltipProvider({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

export function Tooltip({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = React.useState(false);

  return (
    <TooltipContext.Provider value={{ open, setOpen }}>
      <span className="relative inline-flex">{children}</span>
    </TooltipContext.Provider>
  );
}

export function TooltipTrigger({ children }: { children: React.ReactElement }) {
  const { setOpen } = useTooltipContext();

  return React.cloneElement(children, {
    onMouseEnter: (event: React.MouseEvent) => {
      children.props.onMouseEnter?.(event);
      setOpen(true);
    },
    onMouseLeave: (event: React.MouseEvent) => {
      children.props.onMouseLeave?.(event);
      setOpen(false);
    },
    onFocus: (event: React.FocusEvent) => {
      children.props.onFocus?.(event);
      setOpen(true);
    },
    onBlur: (event: React.FocusEvent) => {
      children.props.onBlur?.(event);
      setOpen(false);
    },
  });
}

export function TooltipContent({
  className,
  ...props
}: React.HTMLAttributes<HTMLSpanElement>) {
  const { open } = useTooltipContext();

  if (!open) {
    return null;
  }

  return (
    <span
      className={cn(
        "absolute left-1/2 top-full z-20 mt-2 -translate-x-1/2 rounded-md bg-slate-900 px-2 py-1 text-xs text-white shadow",
        className
      )}
      {...props}
    />
  );
}
