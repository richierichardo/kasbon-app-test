import type { DebtSummary } from "@/lib/debts/types";
import type { Database } from "@/lib/supabase/database.types";

type SummaryDebt = Pick<
  Database["public"]["Tables"]["debts"]["Row"],
  "amount" | "settled_at" | "type"
>;

export function buildDebtSummary(rows: readonly SummaryDebt[]): DebtSummary {
  let owedToMe = BigInt(0);
  let iOwe = BigInt(0);

  for (const row of rows) {
    if (row.settled_at !== null) {
      continue;
    }

    if (row.type === "owed_to_me") {
      owedToMe += BigInt(String(row.amount));
    } else {
      iOwe += BigInt(String(row.amount));
    }
  }

  return {
    owed_to_me: owedToMe.toString(),
    i_owe: iOwe.toString(),
    net: (owedToMe - iOwe).toString(),
  };
}
