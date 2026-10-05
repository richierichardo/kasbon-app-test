import { BarChart3 } from "lucide-react";

import { formatRupiah } from "@/lib/debts/format";
import type { DebtSummary } from "@/lib/debts/types";

export function DebtComparisonChart({
  summary,
  widths,
}: {
  summary: DebtSummary;
  widths: { owedToMe: number; iOwe: number };
}) {
  const isEmpty = summary.owed_to_me === "0" && summary.i_owe === "0";

  return (
    <figure className="rounded-2xl border-2 border-cashmere bg-linen p-4 sm:p-5">
      <figcaption className="flex items-center gap-2 text-lg font-bold">
        <BarChart3 aria-hidden="true" size={21} />
        Perbandingan kasbon aktif
      </figcaption>
      {isEmpty ? (
        <p className="mt-4">Belum ada kasbon aktif.</p>
      ) : (
        <div className="mt-5 flex flex-col gap-5">
          <ComparisonBar
            label="Dihutang ke saya"
            amount={summary.owed_to_me}
            width={widths.owedToMe}
            colorClassName="bg-toast"
          />
          <ComparisonBar
            label="Saya hutang"
            amount={summary.i_owe}
            width={widths.iOwe}
            colorClassName="bg-ferra"
          />
        </div>
      )}
    </figure>
  );
}

function ComparisonBar({
  label,
  amount,
  width,
  colorClassName,
}: {
  label: string;
  amount: string;
  width: number;
  colorClassName: string;
}) {
  return (
    <div>
      <div className="mb-2 flex flex-wrap items-baseline justify-between gap-2">
        <span className="font-semibold">{label}</span>
        <span className="font-bold tabular-nums">{formatRupiah(amount)}</span>
      </div>
      <div className="h-4 overflow-hidden rounded-full bg-cashmere">
        <div
          className={`h-full rounded-full ${colorClassName}`}
          style={{ width: `${width}%` }}
        />
      </div>
    </div>
  );
}
