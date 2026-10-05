import type { DebtSummary } from "@/lib/debts/types";
type SummaryDebt = {
  amount_text: string;
  settled_at: string | null;
  type: "owed_to_me" | "i_owe";
};

export function buildDebtSummary(rows: readonly SummaryDebt[]): DebtSummary {
  let owedToMe = BigInt(0);
  let iOwe = BigInt(0);

  for (const row of rows) {
    if (row.settled_at !== null) {
      continue;
    }

    if (row.type === "owed_to_me") {
      owedToMe += BigInt(row.amount_text);
    } else {
      iOwe += BigInt(row.amount_text);
    }
  }

  return {
    owed_to_me: owedToMe.toString(),
    i_owe: iOwe.toString(),
    net: (owedToMe - iOwe).toString(),
  };
}
