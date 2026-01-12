import { type ButtonHTMLAttributes } from "react";
import { cn } from "../../lib/utils";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement>;

export default function Button({ className, ...props }: ButtonProps) {
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center rounded-lg bg-primary text-secondary p-2 text-sm font-medium shadow-sm transition disabled:cursor-not-allowed disabled:opacity-60",
        className
      )}
      {...props}
    />
  );
}
