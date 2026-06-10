import { LucideIcon } from "lucide-react";
import { Card } from "@/components/ui/card";

export function StatCard({
  icon: Icon,
  label,
  value,
  detail
}: {
  icon: LucideIcon;
  label: string;
  value: string | number;
  detail?: string;
}) {
  return (
    <Card className="min-h-32">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-slate-500">{label}</p>
          <p className="mt-2 text-3xl font-bold text-ink">{value}</p>
        </div>
        <span className="grid h-12 w-12 place-items-center rounded-lg bg-skywash text-blue-600">
          <Icon className="h-6 w-6" aria-hidden="true" />
        </span>
      </div>
      {detail ? <p className="mt-3 text-sm text-slate-600">{detail}</p> : null}
    </Card>
  );
}
