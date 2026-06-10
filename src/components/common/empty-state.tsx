import { LucideIcon } from "lucide-react";
import { Card } from "@/components/ui/card";

export function EmptyState({
  icon: Icon,
  title,
  description
}: {
  icon: LucideIcon;
  title: string;
  description: string;
}) {
  return (
    <Card className="flex flex-col items-center justify-center py-10 text-center">
      <Icon className="mb-3 h-10 w-10 text-blue-500" aria-hidden="true" />
      <h3 className="text-lg font-semibold">{title}</h3>
      <p className="mt-2 max-w-md text-sm leading-6 text-slate-600">{description}</p>
    </Card>
  );
}
