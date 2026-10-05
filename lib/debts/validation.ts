import type {
  CreateDebtFieldErrors,
  CreateDebtInput,
} from "@/lib/debts/types";

const MAX_BIGINT = BigInt("9223372036854775807");

export type CreateDebtValidation =
  | { success: true; data: CreateDebtInput }
  | {
      success: false;
      errors: CreateDebtFieldErrors;
      message: "Data kasbon belum valid.";
    };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isValidDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }

  const [yearText, monthText, dayText] = value.split("-");
  const year = Number(yearText);
  const month = Number(monthText);
  const day = Number(dayText);
  const date = new Date(Date.UTC(year, month - 1, day));

  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}

export function validateCreateDebtInput(
  value: unknown,
): CreateDebtValidation {
  const errors: CreateDebtFieldErrors = {};

  if (!isRecord(value)) {
    return {
      success: false,
      errors,
      message: "Data kasbon belum valid.",
    };
  }

  if (Object.prototype.hasOwnProperty.call(value, "user_id")) {
    return {
      success: false,
      errors: {},
      message: "Data kasbon belum valid.",
    };
  }

  const type = value.type;
  const counterpartName = value.counterpart_name;
  const amount = value.amount;
  const dueDate = value.due_date;
  const note = value.note;
  const validType =
    type === "owed_to_me" || type === "i_owe" ? type : undefined;
  const validCounterpartName =
    typeof counterpartName === "string" && counterpartName.trim()
      ? counterpartName.trim()
      : undefined;
  const validDueDate =
    typeof dueDate === "string" && isValidDate(dueDate) ? dueDate : undefined;

  if (validType === undefined) {
    errors.type = "Pilih tipe hutang.";
  }

  if (validCounterpartName === undefined) {
    errors.counterpart_name = "Nama orang wajib diisi.";
  }

  let normalizedAmount = "";
  if (typeof amount !== "string" || !/^\d+$/.test(amount)) {
    errors.amount = "Nominal harus berupa angka Rupiah bulat.";
  } else {
    try {
      const amountValue = BigInt(amount);
      if (amountValue <= BigInt(0)) {
        errors.amount = "Nominal harus lebih besar dari nol.";
      } else if (amountValue > MAX_BIGINT) {
        errors.amount = "Nominal melebihi batas yang bisa disimpan.";
      } else {
        normalizedAmount = amountValue.toString();
      }
    } catch {
      errors.amount = "Nominal harus berupa angka Rupiah bulat.";
    }
  }

  if (validDueDate === undefined) {
    errors.due_date = "Tanggal belum valid.";
  }

  if (note !== undefined && note !== null && typeof note !== "string") {
    errors.note = "Catatan belum valid.";
  } else if (typeof note === "string" && note.length > 200) {
    errors.note = "Catatan maksimal 200 karakter.";
  }

  if (Object.keys(errors).length > 0) {
    return {
      success: false,
      errors,
      message: "Data kasbon belum valid.",
    };
  }

  if (
    validType === undefined ||
    validCounterpartName === undefined ||
    validDueDate === undefined ||
    normalizedAmount === ""
  ) {
    return {
      success: false,
      errors: {},
      message: "Data kasbon belum valid.",
    };
  }

  return {
    success: true,
    data: {
      type: validType,
      counterpart_name: validCounterpartName,
      amount: normalizedAmount,
      due_date: validDueDate,
      note: typeof note === "string" && note.trim() ? note.trim() : null,
    },
  };
}
