"use client";

import { useEffect, useState } from "react";

import { DebtForm } from "@/components/dashboard/debt-form";
import { DeleteDebtDialog } from "@/components/dashboard/delete-debt-dialog";
import { formatDebtDate, formatRupiah } from "@/lib/debts/format";
import type {
  ApiErrorResponse,
  DebtDTO,
  DebtListResponse,
  DebtStatusFilter,
  DebtSummary,
  DebtTypeFilter,
} from "@/lib/debts/types";

type DashboardClientProps = {
  userEmail: string;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isString(value: unknown): value is string {
  return typeof value === "string";
}

function isDebt(value: unknown): value is DebtDTO {
  if (!isRecord(value)) {
    return false;
  }

  return (
    isString(value.id) &&
    isString(value.user_id) &&
    (value.type === "owed_to_me" || value.type === "i_owe") &&
    isString(value.counterpart_name) &&
    isString(value.amount) &&
    (value.note === null || isString(value.note)) &&
    (value.due_date === null || isString(value.due_date)) &&
    (value.settled_at === null || isString(value.settled_at)) &&
    isString(value.created_at) &&
    isString(value.updated_at)
  );
}

function isSummary(value: unknown): value is DebtSummary {
  return (
    isRecord(value) &&
    isString(value.owed_to_me) &&
    isString(value.i_owe) &&
    isString(value.net)
  );
}

function decodeResponse(value: unknown): DebtListResponse {
  if (
    !isRecord(value) ||
    !Array.isArray(value.data) ||
    !value.data.every(isDebt) ||
    !isSummary(value.summary)
  ) {
    throw new Error("Format data dari server tidak sesuai.");
  }

  return {
    data: value.data,
    summary: value.summary,
  };
}

function readApiError(value: unknown): string {
  if (isRecord(value) && isString((value as ApiErrorResponse).error)) {
    return (value as ApiErrorResponse).error;
  }

  return "Data kasbon belum bisa dimuat. Coba lagi sebentar.";
}

function formatSignedRupiah(amount: string): string {
  const value = BigInt(amount);
  const sign = value < BigInt(0) ? "−" : "+";
  const absolute = value < BigInt(0) ? -value : value;
  return `${sign} ${formatRupiah(absolute.toString())}`;
}

function typeLabel(type: DebtDTO["type"]): string {
  return type === "owed_to_me" ? "Dihutang ke saya" : "Saya hutang";
}

function statusLabel(debt: DebtDTO): string {
  return debt.settled_at === null ? "Belum lunas" : "Lunas";
}

export function DashboardClient({ userEmail }: DashboardClientProps) {
  const [status, setStatus] = useState<DebtStatusFilter>("all");
  const [type, setType] = useState<DebtTypeFilter>("all");
  const [result, setResult] = useState<DebtListResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [retry, setRetry] = useState(0);
  const [refresh, setRefresh] = useState(0);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingDebt, setEditingDebt] = useState<DebtDTO | null>(null);
  const [deletingDebt, setDeletingDebt] = useState<DebtDTO | null>(null);
  const [mutatingId, setMutatingId] = useState<string | null>(null);
  const [mutationError, setMutationError] = useState<string | null>(null);

  async function toggleSettled(debt: DebtDTO) {
    setMutatingId(debt.id);
    setMutationError(null);

    try {
      const response = await fetch(`/api/debts/${debt.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ settled: debt.settled_at === null }),
      });
      const payload: unknown = await response.json();

      if (!response.ok) {
        throw new Error(readApiError(payload));
      }

      setRefresh((current) => current + 1);
    } catch (error) {
      setMutationError(
        error instanceof Error
          ? error.message
          : "Status kasbon belum bisa diperbarui. Coba lagi sebentar.",
      );
    } finally {
      setMutatingId(null);
    }
  }

  useEffect(() => {
    const controller = new AbortController();

    async function loadDebts() {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams({ status, type });

      try {
        const response = await fetch(`/api/debts?${params.toString()}`, {
          signal: controller.signal,
        });
        const payload: unknown = await response.json();

        if (!response.ok) {
          throw new Error(readApiError(payload));
        }

        const decoded = decodeResponse(payload);
        if (!controller.signal.aborted) {
          setResult(decoded);
        }
      } catch (loadError) {
        if (!controller.signal.aborted) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : "Data kasbon belum bisa dimuat. Coba lagi sebentar.",
          );
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }

    void loadDebts();

    return () => controller.abort();
  }, [refresh, retry, status, type]);

  const summary = result?.summary ?? {
    owed_to_me: "0",
    i_owe: "0",
    net: "0",
  };

  return (
    <section className="mx-auto flex max-w-5xl flex-col gap-8 px-6 py-8 sm:py-12">
      <div className="flex flex-col gap-2">
        <p className="text-sm font-semibold uppercase tracking-[0.2em]">
          Dashboard
        </p>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="flex flex-col gap-2">
            <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
              Catatan kasbon
            </h1>
            <p>
              Kamu masuk sebagai <span className="font-bold">{userEmail}</span>.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setIsCreateOpen(true)}
            className="min-h-11 rounded-xl bg-sage px-4 font-bold focus:outline-2 focus:outline-forest"
          >
            + Catat baru
          </button>
        </div>
      </div>

      {isCreateOpen && (
        <DebtForm
          mode="create"
          onClose={() => setIsCreateOpen(false)}
          onSuccess={() => {
            setIsCreateOpen(false);
            setRefresh((current) => current + 1);
          }}
        />
      )}

      {editingDebt && (
        <DebtForm
          mode="edit"
          debt={editingDebt}
          onClose={() => setEditingDebt(null)}
          onSuccess={() => {
            setEditingDebt(null);
            setRefresh((current) => current + 1);
          }}
        />
      )}

      {deletingDebt && (
        <DeleteDebtDialog
          debt={deletingDebt}
          onClose={() => setDeletingDebt(null)}
          onDeleted={() => {
            setDeletingDebt(null);
            setRefresh((current) => current + 1);
          }}
        />
      )}

      <div className="grid gap-4 sm:grid-cols-3">
        <SummaryCard label="Dihutang ke saya" amount={summary.owed_to_me} />
        <SummaryCard label="Saya hutang" amount={summary.i_owe} />
        <SummaryCard
          label="Net"
          amount={formatSignedRupiah(summary.net)}
          isFormatted
        />
      </div>

      <div className="grid gap-4 rounded-2xl border-2 border-leaf bg-mist p-4 sm:grid-cols-2">
        <label className="flex flex-col gap-2 font-semibold">
          Status
          <select
            value={status}
            onChange={(event) => {
              setStatus(event.target.value as DebtStatusFilter);
              setMutationError(null);
            }}
            className="min-h-11 rounded-xl border-2 border-leaf bg-mist px-3 font-normal text-forest outline-none focus:border-sage"
          >
            <option value="all">Semua status</option>
            <option value="unsettled">Belum lunas</option>
            <option value="settled">Lunas</option>
          </select>
        </label>
        <label className="flex flex-col gap-2 font-semibold">
          Tipe hutang
          <select
            value={type}
            onChange={(event) => {
              setType(event.target.value as DebtTypeFilter);
              setMutationError(null);
            }}
            className="min-h-11 rounded-xl border-2 border-leaf bg-mist px-3 font-normal text-forest outline-none focus:border-sage"
          >
            <option value="all">Semua tipe</option>
            <option value="owed_to_me">Dihutang ke saya</option>
            <option value="i_owe">Saya hutang</option>
          </select>
        </label>
      </div>

      {error && (
        <div className="flex flex-col gap-3 rounded-2xl border-2 border-forest bg-leaf p-4">
          <p role="alert" className="font-semibold">
            {error}
          </p>
          <button
            type="button"
            onClick={() => setRetry((current) => current + 1)}
            className="min-h-11 w-fit rounded-xl bg-sage px-4 font-bold focus:outline-2 focus:outline-forest"
          >
            Coba lagi
          </button>
        </div>
      )}

      {mutationError && (
        <p
          role="alert"
          aria-live="assertive"
          className="rounded-2xl border-2 border-forest bg-leaf p-4 font-semibold"
        >
          {mutationError}
        </p>
      )}

      {loading && (
        <p role="status" className="rounded-2xl border-2 border-leaf p-6">
          Lagi memuat catatan kasbon...
        </p>
      )}

      {!loading && !error && result?.data.length === 0 && (
        <div className="rounded-2xl border-2 border-leaf p-6">
          <h2 className="text-xl font-bold">
            {status === "all" && type === "all"
              ? "Belum ada catatan kasbon."
              : "Tidak ada catatan yang cocok."}
          </h2>
          <p className="mt-2">
            {status === "all" && type === "all"
              ? "Belum ada catatan. Tambahkan kasbon pertamamu sekarang."
              : "Coba ganti filter untuk melihat catatan lainnya."}
          </p>
          {status === "all" && type === "all" && (
            <button
              type="button"
              onClick={() => setIsCreateOpen(true)}
              className="mt-4 min-h-11 rounded-xl bg-sage px-4 font-bold focus:outline-2 focus:outline-forest"
            >
              + Catat baru
            </button>
          )}
          {(status !== "all" || type !== "all") && (
            <button
              type="button"
              onClick={() => {
                setStatus("all");
                setType("all");
                setMutationError(null);
              }}
              className="mt-4 min-h-11 rounded-xl border-2 border-leaf px-4 font-bold focus:outline-2 focus:outline-forest"
            >
              Reset filter
            </button>
          )}
        </div>
      )}

      {!loading && !error && result && result.data.length > 0 && (
        <div className="flex flex-col gap-4">
          {result.data.map((debt) => (
            <article
              key={debt.id}
              className="rounded-2xl border-2 border-leaf bg-mist p-5"
            >
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="flex flex-col gap-1">
                  <h2 className="text-xl font-bold">{debt.counterpart_name}</h2>
                  <p>{typeLabel(debt.type)}</p>
                </div>
                <p className="text-xl font-bold">{formatRupiah(debt.amount)}</p>
              </div>
              <div className="mt-4 flex flex-wrap gap-x-4 gap-y-2 text-sm">
                <span>{formatDebtDate(debt.due_date, debt.created_at)}</span>
                <span className="font-semibold">{statusLabel(debt)}</span>
              </div>
              {debt.note && <p className="mt-3">{debt.note}</p>}
              <div className="mt-5 flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={() => setEditingDebt(debt)}
                  disabled={mutatingId === debt.id}
                  className="min-h-11 rounded-xl border-2 border-leaf px-4 font-bold focus:outline-2 focus:outline-forest disabled:cursor-not-allowed"
                >
                  Edit
                </button>
                <button
                  type="button"
                  onClick={() => void toggleSettled(debt)}
                  disabled={mutatingId === debt.id}
                  className="min-h-11 rounded-xl bg-sage px-4 font-bold focus:outline-2 focus:outline-forest disabled:cursor-wait"
                >
                  {mutatingId === debt.id
                    ? "Menyimpan..."
                    : debt.settled_at === null
                      ? "Tandai lunas"
                      : "Batalkan lunas"}
                </button>
                <button
                  type="button"
                  onClick={() => setDeletingDebt(debt)}
                  disabled={mutatingId === debt.id}
                  className="min-h-11 rounded-xl bg-forest px-4 font-bold text-mist focus:outline-2 focus:outline-sage disabled:cursor-not-allowed"
                >
                  Hapus
                </button>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

function SummaryCard({
  label,
  amount,
  isFormatted = false,
}: {
  label: string;
  amount: string;
  isFormatted?: boolean;
}) {
  return (
    <article className="rounded-2xl border-2 border-leaf bg-leaf p-5">
      <p className="font-semibold">{label}</p>
      <p className="mt-3 text-2xl font-bold tabular-nums">
        {isFormatted ? amount : formatRupiah(amount)}
      </p>
    </article>
  );
}
