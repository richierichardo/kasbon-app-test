import { NextResponse } from "next/server";

import { parseStatusFilter, parseTypeFilter } from "@/lib/debts/filters";
import { buildDebtSummary } from "@/lib/debts/summary";
import type {
  CreateDebtInput,
  DebtDTO,
  DebtListResponse,
  DebtStatusFilter,
  DebtTypeFilter,
} from "@/lib/debts/types";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/database.types";
import { validateCreateDebtInput } from "@/lib/debts/validation";

type DebtRow = Database["public"]["Tables"]["debts"]["Row"];

function toDebtDTO(row: DebtRow): DebtDTO {
  return {
    id: row.id,
    user_id: row.user_id,
    type: row.type,
    counterpart_name: row.counterpart_name,
    amount: String(row.amount),
    note: row.note,
    due_date: row.due_date,
    settled_at: row.settled_at,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

export async function GET(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json(
      { error: "Kamu harus masuk terlebih dahulu." },
      { status: 401 },
    );
  }

  const url = new URL(request.url);
  let status: DebtStatusFilter;
  let type: DebtTypeFilter;

  try {
    status = parseStatusFilter(url.searchParams.get("status"));
    type = parseTypeFilter(url.searchParams.get("type"));
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Filter tidak valid." },
      { status: 400 },
    );
  }

  const summaryQuery = supabase.from("debts").select("*");
  const listQuery = supabase
    .from("debts")
    .select("*")
    .order("created_at", { ascending: false });

  if (status === "unsettled") {
    listQuery.is("settled_at", null);
  } else if (status === "settled") {
    listQuery.not("settled_at", "is", null);
  }

  if (type !== "all") {
    listQuery.eq("type", type);
  }

  const [summaryResult, listResult] = await Promise.all([
    summaryQuery,
    listQuery,
  ]);

  if (summaryResult.error || listResult.error) {
    return NextResponse.json(
      { error: "Data kasbon belum bisa dimuat. Coba lagi sebentar." },
      { status: 500 },
    );
  }

  const response: DebtListResponse = {
    data: listResult.data.map(toDebtDTO),
    summary: buildDebtSummary(summaryResult.data),
  };

  return NextResponse.json(response);
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json(
      { error: "Kamu harus masuk terlebih dahulu." },
      { status: 401 },
    );
  }

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Data kasbon belum valid." },
      { status: 400 },
    );
  }

  const validation = validateCreateDebtInput(payload);
  if (!validation.success) {
    return NextResponse.json(
      { error: validation.message, fields: validation.errors },
      { status: 400 },
    );
  }

  const input: CreateDebtInput = validation.data;
  const { data, error } = await supabase
    .from("debts")
    .insert({
      user_id: user.id,
      type: input.type,
      counterpart_name: input.counterpart_name,
      amount: input.amount,
      due_date: input.due_date,
      note: input.note ?? null,
      settled_at: null,
    })
    .select("*")
    .single();

  if (error || !data) {
    return NextResponse.json(
      { error: "Catatan kasbon belum bisa disimpan. Coba lagi sebentar." },
      { status: 500 },
    );
  }

  return NextResponse.json({ data: toDebtDTO(data) }, { status: 201 });
}
