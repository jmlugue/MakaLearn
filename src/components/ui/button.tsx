"use client";

import { forwardRef } from "react";
import { motion, type HTMLMotionProps, useReducedMotion } from "framer-motion";
import { cn } from "@/lib/utils";

type ButtonVariant = "primary" | "secondary" | "outline" | "ghost" | "danger";

type ButtonProps = HTMLMotionProps<"button"> & {
  variant?: ButtonVariant;
  size?: "sm" | "md" | "lg" | "icon";
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", size = "md", ...props }, ref) => {
    const reduceMotion = useReducedMotion();
    const variants: Record<ButtonVariant, string> = {
      primary: "border border-blue-400/30 bg-gradient-to-br from-blue-600 to-indigo-600 text-white shadow-[0_10px_24px_rgba(37,99,235,0.22)] hover:shadow-[0_14px_30px_rgba(37,99,235,0.3)]",
      secondary: "border border-white/80 bg-white/65 text-ink shadow-sm backdrop-blur-xl hover:border-blue-200 hover:bg-white/85",
      outline: "border border-blue-200/80 bg-white/45 text-ink backdrop-blur-lg hover:border-blue-300 hover:bg-white/75",
      ghost: "text-ink hover:bg-white/55",
      danger: "bg-red-600 text-white shadow-sm shadow-red-900/10 hover:bg-red-700"
    };
    const sizes = {
      sm: "min-h-9 px-3 text-sm",
      md: "min-h-11 px-4 text-sm",
      lg: "min-h-12 px-5 text-base",
      icon: "h-11 w-11 p-0"
    };

    return (
      <motion.button
        ref={ref}
        whileHover={reduceMotion || props.disabled ? undefined : { y: -2, scale: 1.015 }}
        whileTap={reduceMotion || props.disabled ? undefined : { scale: 0.975 }}
        transition={{ type: "spring", stiffness: 430, damping: 28 }}
        className={cn(
          "inline-flex items-center justify-center gap-2 rounded-xl font-semibold transition-[color,background-color,border-color,box-shadow] disabled:cursor-not-allowed disabled:opacity-55",
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
