import { NextResponse } from "next/server";

import { parseStatusFilter, parseTypeFilter } from "@/lib/debts/filters";
import type {
  DebtDTO,
  DebtListResponse,
  DebtStatusFilter,
  DebtTypeFilter,
} from "@/lib/debts/types";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/database.types";

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

function buildSummary(rows: DebtRow[]) {
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
    summary: buildSummary(summaryResult.data),
  };

  return NextResponse.json(response);
}
