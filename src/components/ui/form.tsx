import { InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

export function Label({ className, ...props }: React.LabelHTMLAttributes<HTMLLabelElement>) {
  return <label className={cn("text-sm font-semibold text-slate-700", className)} {...props} />;
}

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        "min-h-11 w-full rounded-xl border border-white/90 bg-white/65 px-3 text-sm text-ink shadow-sm backdrop-blur-xl outline-none transition placeholder:text-slate-400 hover:border-blue-200 focus:border-blue-400 focus:bg-white/90 focus:shadow-[0_10px_28px_rgba(37,99,235,0.12)] focus:ring-4 focus:ring-blue-100",
        className
      )}
      {...props}
    />
  );
}

export function Textarea({ className, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={cn(
        "min-h-28 w-full rounded-xl border border-white/90 bg-white/65 px-3 py-3 text-sm text-ink shadow-sm backdrop-blur-xl outline-none transition placeholder:text-slate-400 hover:border-blue-200 focus:border-blue-400 focus:bg-white/90 focus:shadow-[0_10px_28px_rgba(37,99,235,0.12)] focus:ring-4 focus:ring-blue-100",
        className
      )}
      {...props}
    />
  );
}

export function Select({ className, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  if (props.multiple) {
    return (
      <select
        className={cn(
          "w-full rounded-xl border border-white/90 bg-white/70 px-3 py-3 text-sm text-ink shadow-sm backdrop-blur-xl outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-100",
          className
        )}
        {...props}
      />
    );
  }

  return (
    <span className="relative block">
      <select
        className={cn(
          "min-h-11 w-full appearance-none rounded-xl border border-white/90 bg-white/70 px-3 pr-10 text-sm font-medium text-ink shadow-sm backdrop-blur-xl outline-none transition hover:border-blue-200 focus:border-blue-400 focus:bg-white/90 focus:ring-4 focus:ring-blue-100",
          className
        )}
        {...props}
      />
      <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-blue-600" aria-hidden="true" />
    </span>
  );
}

export function FieldError({ message, id }: { message?: string; id?: string }) {
  if (!message) return null;
  return (
    <p id={id} className="mt-1 text-sm font-medium text-red-600">
      {message}
    </p>
  );
}

export function FieldHint({ children, className }: { children: ReactNode; className?: string }) {
  return <p className={cn("mt-1 text-xs leading-5 text-slate-500", className)}>{children}</p>;
}
