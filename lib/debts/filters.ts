import type { DebtStatusFilter, DebtTypeFilter } from "@/lib/debts/types";

const statusValues: readonly DebtStatusFilter[] = [
  "all",
  "unsettled",
  "settled",
];
const typeValues: readonly DebtTypeFilter[] = ["all", "owed_to_me", "i_owe"];

export function parseStatusFilter(value: string | null): DebtStatusFilter {
  if (value === null) {
    return "all";
  }

  if (statusValues.includes(value as DebtStatusFilter)) {
    return value as DebtStatusFilter;
  }

  throw new Error("Filter status tidak valid.");
}

export function parseTypeFilter(value: string | null): DebtTypeFilter {
  if (value === null) {
    return "all";
  }

  if (typeValues.includes(value as DebtTypeFilter)) {
    return value as DebtTypeFilter;
  }

  throw new Error("Filter tipe hutang tidak valid.");
}
