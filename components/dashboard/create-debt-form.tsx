"use client";

import { useState, type FormEvent } from "react";

import { validateCreateDebtInput } from "@/lib/debts/validation";
import type {
  ApiErrorResponse,
  CreateDebtFieldErrors,
  CreateDebtInput,
} from "@/lib/debts/types";

type CreateDebtFormProps = {
  onClose: () => void;
  onSuccess: () => void;
};

type FormValues = CreateDebtInput;

function getLocalDate(): string {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function readApiError(value: unknown): string {
  if (
    typeof value === "object" &&
    value !== null &&
    "error" in value &&
    typeof (value as ApiErrorResponse).error === "string"
  ) {
    return (value as ApiErrorResponse).error;
  }

  return "Catatan kasbon belum bisa disimpan. Coba lagi sebentar.";
}

export function CreateDebtForm({
  onClose,
  onSuccess,
}: CreateDebtFormProps) {
  const [values, setValues] = useState<FormValues>(() => ({
    type: "owed_to_me",
    counterpart_name: "",
    amount: "",
    due_date: getLocalDate(),
    note: "",
  }));
  const [fieldErrors, setFieldErrors] = useState<CreateDebtFieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

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

    const validation = validateCreateDebtInput(values);
    if (!validation.success) {
      setFieldErrors(validation.errors);
      return;
    }

    setFieldErrors({});
    setSubmitting(true);

    try {
      const response = await fetch("/api/debts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(validation.data),
      });
      const payload: unknown = await response.json();

      if (!response.ok) {
        throw new Error(readApiError(payload));
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
    <div className="fixed inset-0 z-10 flex items-start justify-center overflow-y-auto bg-forest p-4 sm:items-center">
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="create-debt-title"
        className="my-4 w-full max-w-xl rounded-3xl border-2 border-leaf bg-mist p-6 text-forest sm:p-8"
      >
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.2em]">
              Catatan baru
            </p>
            <h2 id="create-debt-title" className="mt-2 text-2xl font-bold">
              Tambah kasbon
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            aria-label="Tutup form"
            className="min-h-11 rounded-xl border-2 border-leaf px-3 font-bold focus:outline-2 focus:outline-forest disabled:cursor-not-allowed"
          >
            Tutup
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          <fieldset className="flex flex-col gap-2">
            <legend className="mb-1 font-semibold">Tipe hutang</legend>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="flex min-h-14 cursor-pointer items-center gap-3 rounded-xl border-2 border-leaf p-3">
                <input
                  type="radio"
                  name="type"
                  value="owed_to_me"
                  checked={values.type === "owed_to_me"}
                  onChange={() => updateValue("type", "owed_to_me")}
                />
                <span>Saya dihutang</span>
              </label>
              <label className="flex min-h-14 cursor-pointer items-center gap-3 rounded-xl border-2 border-leaf p-3">
                <input
                  type="radio"
                  name="type"
                  value="i_owe"
                  checked={values.type === "i_owe"}
                  onChange={() => updateValue("type", "i_owe")}
                />
                <span>Saya hutang</span>
              </label>
            </div>
            {fieldErrors.type && <FieldError message={fieldErrors.type} />}
          </fieldset>

          <FormField
            id="counterpart_name"
            label="Nama orang"
            error={fieldErrors.counterpart_name}
          >
            <input
              id="counterpart_name"
              name="counterpart_name"
              value={values.counterpart_name}
              onChange={(event) =>
                updateValue("counterpart_name", event.target.value)
              }
              autoComplete="name"
              className={inputClassName}
            />
          </FormField>

          <FormField
            id="amount"
            label="Nominal (Rupiah)"
            error={fieldErrors.amount}
          >
            <input
              id="amount"
              name="amount"
              type="text"
              inputMode="numeric"
              value={values.amount}
              onChange={(event) =>
                updateValue(
                  "amount",
                  event.target.value.replace(/\D/g, ""),
                )
              }
              className={inputClassName}
            />
          </FormField>

          <FormField id="due_date" label="Tanggal" error={fieldErrors.due_date}>
            <input
              id="due_date"
              name="due_date"
              type="date"
              value={values.due_date}
              onChange={(event) => updateValue("due_date", event.target.value)}
              className={inputClassName}
            />
          </FormField>

          <FormField id="note" label="Catatan (opsional)" error={fieldErrors.note}>
            <textarea
              id="note"
              name="note"
              value={values.note ?? ""}
              maxLength={200}
              onChange={(event) => updateValue("note", event.target.value)}
              className={`${inputClassName} min-h-24 py-3`}
            />
            <span className="text-right text-sm">
              {(values.note ?? "").length}/200
            </span>
          </FormField>

          {formError && (
            <p role="alert" className="rounded-xl bg-leaf p-3 font-semibold">
              {formError}
            </p>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="min-h-12 rounded-xl bg-sage px-5 font-bold focus:outline-2 focus:outline-forest disabled:cursor-wait"
          >
            {submitting ? "Menyimpan..." : "Simpan catatan"}
          </button>
        </form>
      </section>
    </div>
  );
}

const inputClassName =
  "min-h-12 rounded-xl border-2 border-leaf bg-mist px-4 text-forest outline-none focus:border-sage";

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
