import type {
  DebtSort,
  DebtStatusFilter,
  DebtTypeFilter,
} from "@/lib/debts/types";

const statusValues: readonly DebtStatusFilter[] = [
  "all",
  "unsettled",
  "settled",
];
const typeValues: readonly DebtTypeFilter[] = ["all", "owed_to_me", "i_owe"];
const sortValues: readonly DebtSort[] = [
  "newest",
  "amount_desc",
  "amount_asc",
  "due_asc",
  "due_desc",
];

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

export function parseDebtSort(value: string | null): DebtSort {
  if (value === null) {
    return "newest";
  }

  if (sortValues.includes(value as DebtSort)) {
    return value as DebtSort;
  }

  throw new Error("Urutan kasbon tidak valid.");
}

export function parseSearchQuery(value: string | null): string {
  const query = value?.trim() ?? "";

  if (query.length > 100) {
    throw new Error("Pencarian nama maksimal 100 karakter.");
  }

  return query;
}

export function escapeIlikePattern(value: string): string {
  return value.replaceAll(/([\\%_])/g, "\\$1");
}
