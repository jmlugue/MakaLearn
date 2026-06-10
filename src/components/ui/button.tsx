import { ButtonHTMLAttributes, forwardRef } from "react";
import { cn } from "@/lib/utils";

type ButtonVariant = "primary" | "secondary" | "outline" | "ghost" | "danger";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: "sm" | "md" | "lg" | "icon";
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", size = "md", ...props }, ref) => {
    const variants: Record<ButtonVariant, string> = {
      primary: "bg-primary text-white hover:bg-blue-700",
      secondary: "bg-white text-ink shadow-sm hover:bg-skywash",
      outline: "border border-blue-200 bg-white text-ink hover:bg-skywash",
      ghost: "text-ink hover:bg-skywash",
      danger: "bg-red-600 text-white hover:bg-red-700"
    };
    const sizes = {
      sm: "min-h-9 px-3 text-sm",
      md: "min-h-11 px-4 text-sm",
      lg: "min-h-12 px-5 text-base",
      icon: "h-11 w-11 p-0"
    };

    return (
      <button
        ref={ref}
        className={cn(
          "inline-flex items-center justify-center gap-2 rounded-lg font-semibold transition disabled:cursor-not-allowed disabled:opacity-55",
          variants[variant],
          sizes[size],
          className
        )}
        {...props}
      />
    );
  }
);

Button.displayName = "Button";
