import type { ButtonHTMLAttributes } from "react";

import { cn } from "@/lib/utils";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "muted" | "icon";
};

export function Button({ variant = "muted", className, ...props }: ButtonProps) {
  return (
    <button
      className={cn(
        variant === "primary" && "primary-button",
        variant === "muted" && "muted-button",
        variant === "icon" && "icon-button",
        className,
      )}
      {...props}
    />
  );
}
