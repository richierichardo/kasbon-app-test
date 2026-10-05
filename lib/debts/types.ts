import type { DebtType } from "@/lib/supabase/database.types";

export type DebtStatusFilter = "all" | "unsettled" | "settled";
export type DebtTypeFilter = "all" | DebtType;

export type CreateDebtInput = {
  type: DebtType;
  counterpart_name: string;
  amount: string;
  due_date: string;
  note?: string | null;
};

export type CreateDebtField =
  | "type"
  | "counterpart_name"
  | "amount"
  | "due_date"
  | "note";

export type CreateDebtFieldErrors = Partial<
  Record<CreateDebtField, string>
>;

export type DebtDTO = {
  id: string;
  user_id: string;
  type: DebtType;
  counterpart_name: string;
  amount: string;
  note: string | null;
  due_date: string | null;
  settled_at: string | null;
  created_at: string;
  updated_at: string;
};

export type DebtSummary = {
  owed_to_me: string;
  i_owe: string;
  net: string;
};

export type DebtListResponse = {
  data: DebtDTO[];
  summary: DebtSummary;
};

export type ApiErrorResponse = {
  error: string;
};
