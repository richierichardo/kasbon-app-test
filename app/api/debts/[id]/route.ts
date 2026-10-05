import { NextResponse } from "next/server";

import type { DebtDTO } from "@/lib/debts/types";
import { validateUpdateDebtInput } from "@/lib/debts/validation";
import type { Database } from "@/lib/supabase/database.types";
import { createClient } from "@/lib/supabase/server";

type DebtRow = Database["public"]["Tables"]["debts"]["Row"];
type DebtUpdate = Database["public"]["Tables"]["debts"]["Update"];

const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

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

function notFoundResponse() {
  return NextResponse.json(
    { error: "Catatan kasbon tidak ditemukan." },
    { status: 404 },
  );
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;

  if (!uuidPattern.test(id)) {
    return NextResponse.json(
      { error: "ID catatan kasbon belum valid." },
      { status: 400 },
    );
  }

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

  const { data: existing, error: findError } = await supabase
    .from("debts")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (findError) {
    return NextResponse.json(
      { error: "Catatan kasbon belum bisa diperbarui. Coba lagi sebentar." },
      { status: 500 },
    );
  }

  if (!existing) {
    return notFoundResponse();
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

  const validation = validateUpdateDebtInput(payload);
  if (!validation.success) {
    return NextResponse.json(
      { error: validation.message, fields: validation.errors },
      { status: 400 },
    );
  }

  const input = validation.data;
  const update: DebtUpdate = {};

  if (input.type !== undefined) update.type = input.type;
  if (input.counterpart_name !== undefined) {
    update.counterpart_name = input.counterpart_name;
  }
  if (input.amount !== undefined) update.amount = input.amount;
  if (input.due_date !== undefined) update.due_date = input.due_date;
  if (input.note !== undefined) update.note = input.note;

  if (input.settled !== undefined) {
    update.settled_at = input.settled
      ? existing.settled_at ?? new Date().toISOString()
      : null;
  }

  const { data, error } = await supabase
    .from("debts")
    .update(update)
    .eq("id", id)
    .select("*")
    .maybeSingle();

  if (error) {
    return NextResponse.json(
      { error: "Catatan kasbon belum bisa diperbarui. Coba lagi sebentar." },
      { status: 500 },
    );
  }

  if (!data) {
    return notFoundResponse();
  }

  return NextResponse.json({ data: toDebtDTO(data) });
}
