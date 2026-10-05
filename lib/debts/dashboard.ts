import type { DebtDTO, DebtSummary } from "@/lib/debts/types";

export type DebtGroup = {
  key: string;
  counterpartName: string;
  debts: DebtDTO[];
  unsettledCount: number;
  owedToMe: string;
  iOwe: string;
};

export function normalizeCounterpartName(value: string): string {
  return value.trim().replaceAll(/\s+/g, " ").toLocaleLowerCase("id-ID");
}

export function groupDebtsByCounterpart(
  debts: readonly DebtDTO[],
): DebtGroup[] {
  const groups = new Map<
    string,
    {
      counterpartName: string;
      debts: DebtDTO[];
      unsettledCount: number;
      owedToMe: bigint;
      iOwe: bigint;
    }
  >();

  for (const debt of debts) {
    const key = normalizeCounterpartName(debt.counterpart_name);
    const existing = groups.get(key) ?? {
      counterpartName: debt.counterpart_name.trim().replaceAll(/\s+/g, " "),
      debts: [],
      unsettledCount: 0,
      owedToMe: BigInt(0),
      iOwe: BigInt(0),
    };

    existing.debts.push(debt);
    if (debt.settled_at === null) existing.unsettledCount += 1;
    if (debt.type === "owed_to_me") existing.owedToMe += BigInt(debt.amount);
    else existing.iOwe += BigInt(debt.amount);
    groups.set(key, existing);
  }

  return Array.from(groups, ([key, group]) => ({
    key,
    counterpartName: group.counterpartName,
    debts: group.debts,
    unsettledCount: group.unsettledCount,
    owedToMe: group.owedToMe.toString(),
    iOwe: group.iOwe.toString(),
  })).sort((left, right) =>
    left.counterpartName.localeCompare(right.counterpartName, "id-ID", {
      sensitivity: "base",
    }),
  );
}

export function getComparisonBarWidths(summary: DebtSummary): {
  owedToMe: number;
  iOwe: number;
} {
  const owedToMe = BigInt(summary.owed_to_me);
  const iOwe = BigInt(summary.i_owe);
  const maximum = owedToMe > iOwe ? owedToMe : iOwe;

  if (maximum === BigInt(0)) {
    return { owedToMe: 0, iOwe: 0 };
  }

  const toPercentage = (value: bigint) =>
    Number((value * BigInt(10_000)) / maximum) / 100;

  return {
    owedToMe: toPercentage(owedToMe),
    iOwe: toPercentage(iOwe),
  };
}
