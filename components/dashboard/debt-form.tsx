"use client";

import { ArrowDownLeft, ArrowUpRight, Save, X } from "lucide-react";
import { useState, type FormEvent } from "react";

import { Modal } from "@/components/ui/modal";
import {
  formatDateInput,
  formatDateInputTyping,
  formatRupiahInput,
  parseDateInput,
} from "@/lib/debts/format";
import { validateCreateDebtInput, validateUpdateDebtInput } from "@/lib/debts/validation";
import type {
  ApiErrorResponse,
  CreateDebtFieldErrors,
  CreateDebtInput,
  DebtDTO,
  UpdateDebtFieldErrors,
} from "@/lib/debts/types";

type DebtFormProps = {
  mode: "create" | "edit";
  debt?: DebtDTO;
  onClose: () => void;
  onSuccess: () => void;
};

type FormValues = CreateDebtInput;
type FormErrors = CreateDebtFieldErrors & UpdateDebtFieldErrors;

function getLocalDate(): string {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function readApiError(value: unknown): {
  message: string;
  fields?: FormErrors;
} {
  if (
    typeof value === "object" &&
    value !== null &&
    "error" in value &&
    typeof (value as ApiErrorResponse).error === "string"
  ) {
    const fields =
      "fields" in value && typeof value.fields === "object" && value.fields !== null
        ? (value.fields as FormErrors)
        : undefined;
    return { message: (value as ApiErrorResponse).error, fields };
  }

  return { message: "Catatan kasbon belum bisa disimpan. Coba lagi sebentar." };
}

export function DebtForm({ mode, debt, onClose, onSuccess }: DebtFormProps) {
  const [values, setValues] = useState<FormValues>(() => ({
    type: debt?.type ?? "owed_to_me",
    counterpart_name: debt?.counterpart_name ?? "",
    amount: debt?.amount ?? "",
    due_date: debt?.due_date ?? getLocalDate(),
    note: debt?.note ?? "",
  }));
  const [dateInput, setDateInput] = useState(() =>
    formatDateInput(debt?.due_date ?? getLocalDate()),
  );
  const [fieldErrors, setFieldErrors] = useState<FormErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const isEdit = mode === "edit";

  function updateValue<Key extends keyof FormValues>(
    key: Key,
    value: FormValues[Key],
  ) {
    setValues((current) => ({ ...current, [key]: value }));
    setFieldErrors((current) => ({ ...current, [key]: undefined }));
    setFormError(null);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);

    const normalizedDate = parseDateInput(dateInput);
    const submittedValues: FormValues = {
      ...values,
      due_date: normalizedDate ?? dateInput,
    };

    const validation = isEdit
      ? validateUpdateDebtInput(submittedValues)
      : validateCreateDebtInput(submittedValues);

    if (!validation.success) {
      setFieldErrors(validation.errors);
      return;
    }

    setFieldErrors({});
    setSubmitting(true);

    try {
      const response = await fetch(
        isEdit ? `/api/debts/${debt?.id ?? ""}` : "/api/debts",
        {
          method: isEdit ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(validation.data),
        },
      );
      const payload: unknown = await response.json();

      if (!response.ok) {
        const apiError = readApiError(payload);
        setFieldErrors(apiError.fields ?? {});
        throw new Error(apiError.message);
      }

      onSuccess();
    } catch (error) {
      setFormError(
        error instanceof Error
          ? error.message
          : "Catatan kasbon belum bisa disimpan. Coba lagi sebentar.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal
      labelledBy="debt-form-title"
      describedBy="debt-form-description"
      onClose={onClose}
      closeDisabled={submitting}
    >
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.2em]">
              {isEdit ? "Edit catatan" : "Catatan baru"}
            </p>
            <h2 id="debt-form-title" className="mt-2 text-2xl font-bold">
              {isEdit ? "Perbarui kasbon" : "Tambah kasbon"}
            </h2>
            <p id="debt-form-description" className="mt-2">
              {isEdit
                ? "Ubah informasi kasbon yang sudah tercatat."
                : "Isi detail kasbon baru dengan nominal Rupiah bulat."}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            aria-label="Tutup form"
            className="flex min-h-11 items-center gap-2 rounded-xl border-2 border-cashmere px-3 font-bold focus:outline-2 focus:outline-woody disabled:cursor-not-allowed disabled:bg-cashmere"
          >
            <X aria-hidden="true" size={18} />
            Tutup
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          <fieldset className="flex flex-col gap-2">
            <legend className="mb-1 font-semibold">Tipe hutang</legend>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className={`flex min-h-14 cursor-pointer items-center gap-3 rounded-xl border-2 p-3 focus-within:outline-2 focus-within:outline-woody ${values.type === "owed_to_me" ? "border-woody bg-cashmere" : "border-cashmere"}`}>
                <input
                  type="radio"
                  name="type"
                  value="owed_to_me"
                  checked={values.type === "owed_to_me"}
                  onChange={() => updateValue("type", "owed_to_me")}
                />
                <ArrowDownLeft aria-hidden="true" size={20} />
                <span>Saya dihutang</span>
              </label>
              <label className={`flex min-h-14 cursor-pointer items-center gap-3 rounded-xl border-2 p-3 focus-within:outline-2 focus-within:outline-woody ${values.type === "i_owe" ? "border-woody bg-cashmere" : "border-cashmere"}`}>
                <input
                  type="radio"
                  name="type"
                  value="i_owe"
                  checked={values.type === "i_owe"}
                  onChange={() => updateValue("type", "i_owe")}
                />
                <ArrowUpRight aria-hidden="true" size={20} />
                <span>Saya hutang</span>
              </label>
            </div>
            {fieldErrors.type && <FieldError message={fieldErrors.type} />}
          </fieldset>

          <FormField id="counterpart_name" label="Nama orang" error={fieldErrors.counterpart_name}>
            <input
              id="counterpart_name"
              value={values.counterpart_name}
              onChange={(event) => updateValue("counterpart_name", event.target.value)}
              autoComplete="name"
              className={inputClassName}
            />
          </FormField>

          <FormField id="amount" label="Nominal" error={fieldErrors.amount}>
            <div className="flex min-h-12 items-center rounded-xl border-2 border-cashmere bg-linen focus-within:border-woody focus-within:outline-2 focus-within:outline-woody">
              <span aria-hidden="true" className="pl-4 font-bold">
                Rp
              </span>
              <input
                id="amount"
                type="text"
                inputMode="numeric"
                autoComplete="off"
                value={formatRupiahInput(values.amount)}
                onChange={(event) =>
                  updateValue("amount", event.target.value.replace(/\D/g, ""))
                }
                className="min-h-11 min-w-0 flex-1 bg-linen px-3 text-woody outline-none"
              />
            </div>
          </FormField>

          <FormField id="due_date" label="Tanggal" error={fieldErrors.due_date}>
            <input
              id="due_date"
              type="text"
              inputMode="numeric"
              autoComplete="off"
              placeholder="dd/mm/yyyy"
              value={dateInput}
              onChange={(event) => {
                setDateInput(formatDateInputTyping(event.target.value));
                setFieldErrors((current) => ({ ...current, due_date: undefined }));
                setFormError(null);
              }}
              className={inputClassName}
            />
          </FormField>

          <FormField id="note" label="Catatan (opsional)" error={fieldErrors.note}>
            <textarea
              id="note"
              value={values.note ?? ""}
              maxLength={200}
              onChange={(event) => updateValue("note", event.target.value)}
              className={`${inputClassName} min-h-24 py-3`}
            />
            <span className="text-right text-sm">{(values.note ?? "").length}/200</span>
          </FormField>

          {formError && (
            <p role="alert" className="rounded-xl bg-cashmere p-3 font-semibold">
              {formError}
            </p>
          )}

          <button
            type="submit"
            disabled={submitting}
            aria-busy={submitting}
            className="flex min-h-12 items-center justify-center gap-2 rounded-xl bg-toast px-5 font-bold focus:outline-2 focus:outline-woody disabled:cursor-wait disabled:bg-cashmere"
          >
            <Save aria-hidden="true" size={19} />
            {submitting ? "Menyimpan..." : isEdit ? "Simpan perubahan" : "Simpan catatan"}
          </button>
        </form>
    </Modal>
  );
}

const inputClassName =
  "min-h-12 rounded-xl border-2 border-cashmere bg-linen px-4 text-woody outline-none focus:border-woody focus:outline-2 focus:outline-woody";

function FieldError({ message }: { message: string }) {
  return (
    <p role="alert" className="text-sm font-semibold">
      {message}
    </p>
  );
}

function FormField({
  id,
  label,
  error,
  children,
}: {
  id: string;
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <label htmlFor={id} className="flex flex-col gap-2 font-semibold">
      {label}
      {children}
      {error && <FieldError message={error} />}
    </label>
  );
}
