import * as React from "react";

import { cn } from "@/lib/utils";

type CheckboxProps = React.ComponentProps<"input">;

const Checkbox = React.forwardRef<HTMLInputElement, CheckboxProps>(
  ({ className, ...props }, ref) => (
    <input
      ref={ref}
      type="checkbox"
      className={cn(
        "h-4 w-4 rounded border border-border text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        className
      )}
      {...props}
    />
  )
);
Checkbox.displayName = "Checkbox";

export default Checkbox;
