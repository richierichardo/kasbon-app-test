"use client";

import {
  CheckCircle2,
  CircleDollarSign,
  List,
  Plus,
  RefreshCcw,
  RotateCcw,
  Search,
  Users,
  X,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { DebtForm } from "@/components/dashboard/debt-form";
import { DeleteDebtDialog } from "@/components/dashboard/delete-debt-dialog";
import { DebtComparisonChart } from "@/components/dashboard/debt-comparison-chart";
import {
  DebtEntryList,
  DebtGroupedList,
} from "@/components/dashboard/debt-list";
import {
  getComparisonBarWidths,
  groupDebtsByCounterpart,
} from "@/lib/debts/dashboard";
import { formatRupiah } from "@/lib/debts/format";
import type {
  ApiErrorResponse,
  DebtDTO,
  DebtListResponse,
  DebtSort,
  DebtStatusFilter,
  DebtSummary,
  DebtTypeFilter,
} from "@/lib/debts/types";

type ViewMode = "entries" | "people";

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

function formatNet(amount: string): { value: string; detail: string } {
  const value = BigInt(amount);
  if (value === BigInt(0)) {
    return { value: formatRupiah("0"), detail: "Seimbang" };
  }

  const sign = value < BigInt(0) ? "−" : "+";
  const absolute = value < BigInt(0) ? -value : value;
  return {
    value: `${sign} ${formatRupiah(absolute.toString())}`,
    detail: value < BigInt(0) ? "Lebih banyak hutang" : "Lebih banyak piutang",
  };
}

export function DashboardClient({ userEmail }: DashboardClientProps) {
  const [status, setStatus] = useState<DebtStatusFilter>("all");
  const [type, setType] = useState<DebtTypeFilter>("all");
  const [sort, setSort] = useState<DebtSort>("newest");
  const [searchInput, setSearchInput] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState<ViewMode>("entries");
  const [expandedGroup, setExpandedGroup] = useState<string | null>(null);
  const [result, setResult] = useState<DebtListResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [retry, setRetry] = useState(0);
  const [refresh, setRefresh] = useState(0);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingDebt, setEditingDebt] = useState<DebtDTO | null>(null);
  const [deletingDebt, setDeletingDebt] = useState<DebtDTO | null>(null);
  const [mutatingId, setMutatingId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{
    kind: "success" | "error";
    message: string;
  } | null>(null);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      setSearchQuery(searchInput.trim());
    }, 300);

    return () => window.clearTimeout(timeout);
  }, [searchInput]);

  async function toggleSettled(debt: DebtDTO) {
    setMutatingId(debt.id);
    setFeedback(null);

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

      setFeedback({
        kind: "success",
        message:
          debt.settled_at === null
            ? "Kasbon berhasil ditandai lunas."
            : "Status lunas berhasil dibatalkan.",
      });
      setRefresh((current) => current + 1);
    } catch (error) {
      setFeedback({
        kind: "error",
        message:
          error instanceof Error
            ? error.message
            : "Status kasbon belum bisa diperbarui. Coba lagi sebentar.",
      });
    } finally {
      setMutatingId(null);
    }
  }

  useEffect(() => {
    const controller = new AbortController();

    async function loadDebts() {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams({ status, type, sort });
      if (searchQuery) params.set("q", searchQuery);

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
  }, [refresh, retry, searchQuery, sort, status, type]);

  const summary = result?.summary ?? {
    owed_to_me: "0",
    i_owe: "0",
    net: "0",
  };
  const net = formatNet(summary.net);
  const chartWidths = getComparisonBarWidths(summary);
  const groups = useMemo(
    () => groupDebtsByCounterpart(result?.data ?? []),
    [result?.data],
  );
  const hasActiveFilters =
    status !== "all" || type !== "all" || searchQuery !== "";

  function resetListControls() {
    setStatus("all");
    setType("all");
    setSort("newest");
    setSearchInput("");
    setSearchQuery("");
    setFeedback(null);
  }

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
            onClick={() => {
              setFeedback(null);
              setIsCreateOpen(true);
            }}
            className="flex min-h-11 items-center justify-center gap-2 rounded-xl bg-toast px-4 font-bold focus:outline-2 focus:outline-woody"
          >
            <Plus aria-hidden="true" size={19} />
            Catat baru
          </button>
        </div>
      </div>

      {isCreateOpen && (
        <DebtForm
          mode="create"
          onClose={() => setIsCreateOpen(false)}
          onSuccess={() => {
            setIsCreateOpen(false);
            setFeedback({
              kind: "success",
              message: "Catatan kasbon berhasil ditambahkan.",
            });
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
            setFeedback({
              kind: "success",
              message: "Catatan kasbon berhasil diperbarui.",
            });
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
            setFeedback({
              kind: "success",
              message: "Catatan kasbon berhasil dihapus.",
            });
            setRefresh((current) => current + 1);
          }}
        />
      )}

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        <SummaryCard label="Dihutang ke saya" amount={summary.owed_to_me} />
        <SummaryCard label="Saya hutang" amount={summary.i_owe} />
        <SummaryCard
          label="Net"
          amount={net.value}
          detail={net.detail}
          isFormatted
          className="col-span-2 sm:col-span-1"
        />
      </div>

      <DebtComparisonChart summary={summary} widths={chartWidths} />

      <div className="grid gap-4 rounded-2xl border-2 border-cashmere bg-linen p-4 md:grid-cols-4">
        <label className="flex flex-col gap-2 font-semibold md:col-span-2">
          Cari nama orang
          <span className="flex min-h-11 items-center rounded-xl border-2 border-cashmere bg-linen focus-within:border-toast focus-within:outline-2 focus-within:outline-woody">
            <Search aria-hidden="true" className="ml-3 shrink-0" size={19} />
            <input
              type="search"
              maxLength={100}
              value={searchInput}
              onChange={(event) => {
                setSearchInput(event.target.value);
                setFeedback(null);
              }}
              placeholder="Contoh: Budi"
              className="min-h-10 min-w-0 flex-1 bg-linen px-3 font-normal text-woody outline-none"
            />
            {searchInput && (
              <button
                type="button"
                onClick={() => {
                  setSearchInput("");
                  setSearchQuery("");
                  setFeedback(null);
                }}
                aria-label="Hapus pencarian"
                className="flex min-h-11 min-w-11 items-center justify-center rounded-lg focus:outline-2 focus:outline-woody"
              >
                <X aria-hidden="true" size={18} />
              </button>
            )}
          </span>
        </label>
        <label className="flex flex-col gap-2 font-semibold">
          Status
          <select
            value={status}
            onChange={(event) => {
              setStatus(event.target.value as DebtStatusFilter);
              setFeedback(null);
            }}
            className="min-h-11 rounded-xl border-2 border-cashmere bg-linen px-3 font-normal text-woody outline-none focus:border-toast"
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
              setFeedback(null);
            }}
            className="min-h-11 rounded-xl border-2 border-cashmere bg-linen px-3 font-normal text-woody outline-none focus:border-toast"
          >
            <option value="all">Semua tipe</option>
            <option value="owed_to_me">Dihutang ke saya</option>
            <option value="i_owe">Saya hutang</option>
          </select>
        </label>
        <label className="flex flex-col gap-2 font-semibold md:col-span-2">
          Urutkan
          <select
            value={sort}
            onChange={(event) => {
              setSort(event.target.value as DebtSort);
              setFeedback(null);
            }}
            className="min-h-11 rounded-xl border-2 border-cashmere bg-linen px-3 font-normal text-woody outline-none focus:border-toast"
          >
            <option value="newest">Terbaru dicatat</option>
            <option value="amount_desc">Nominal terbesar</option>
            <option value="amount_asc">Nominal terkecil</option>
            <option value="due_asc">Tanggal terdekat</option>
            <option value="due_desc">Tanggal terjauh</option>
          </select>
        </label>
        <fieldset className="flex flex-col gap-2 md:col-span-2">
          <legend className="font-semibold">Tampilan</legend>
          <div className="grid grid-cols-2 gap-2">
            <ViewModeButton
              active={viewMode === "entries"}
              onClick={() => setViewMode("entries")}
              icon={<List aria-hidden="true" size={18} />}
            >
              Per catatan
            </ViewModeButton>
            <ViewModeButton
              active={viewMode === "people"}
              onClick={() => setViewMode("people")}
              icon={<Users aria-hidden="true" size={18} />}
            >
              Per orang
            </ViewModeButton>
          </div>
        </fieldset>
      </div>

      {error && (
        <div className="flex flex-col gap-3 rounded-2xl border-2 border-woody bg-cashmere p-4">
          <p role="alert" className="font-semibold">
            {error}
          </p>
          <button
            type="button"
            onClick={() => setRetry((current) => current + 1)}
            className="flex min-h-11 w-fit items-center gap-2 rounded-xl bg-toast px-4 font-bold focus:outline-2 focus:outline-woody"
          >
            <RefreshCcw aria-hidden="true" size={18} />
            Coba lagi
          </button>
        </div>
      )}

      {feedback && (
        <div
          role={feedback.kind === "error" ? "alert" : "status"}
          aria-live={feedback.kind === "error" ? "assertive" : "polite"}
          className="flex items-start justify-between gap-4 rounded-2xl border-2 border-woody bg-cashmere p-4 font-semibold"
        >
          <div className="flex items-center gap-3">
            {feedback.kind === "success" ? (
              <CheckCircle2 aria-hidden="true" className="shrink-0" size={20} />
            ) : (
              <CircleDollarSign aria-hidden="true" className="shrink-0" size={20} />
            )}
            <p>{feedback.message}</p>
          </div>
          <button
            type="button"
            onClick={() => setFeedback(null)}
            aria-label="Tutup pemberitahuan"
            className="flex min-h-11 min-w-11 items-center justify-center rounded-xl border-2 border-woody focus:outline-2 focus:outline-woody"
          >
            <X aria-hidden="true" size={18} />
          </button>
        </div>
      )}

      {loading && (
        <div role="status" className="flex items-center gap-3 rounded-2xl border-2 border-cashmere p-6">
          <RefreshCcw aria-hidden="true" size={20} />
          <p>Lagi memuat catatan kasbon...</p>
        </div>
      )}

      {!loading && !error && result?.data.length === 0 && (
        <div className="rounded-2xl border-2 border-cashmere p-6">
          <h2 className="text-xl font-bold">
            {searchQuery
              ? `Nama “${searchQuery}” belum ditemukan.`
              : hasActiveFilters
                ? "Tidak ada catatan yang cocok."
                : "Belum ada catatan kasbon."}
          </h2>
          <p className="mt-2">
            {hasActiveFilters
              ? "Coba ubah pencarian, filter, atau urutan untuk melihat catatan lainnya."
              : "Belum ada catatan. Tambahkan kasbon pertamamu sekarang."}
          </p>
          {!hasActiveFilters && (
            <button
              type="button"
              onClick={() => {
                setFeedback(null);
                setIsCreateOpen(true);
              }}
              className="mt-4 flex min-h-11 items-center gap-2 rounded-xl bg-toast px-4 font-bold focus:outline-2 focus:outline-woody"
            >
              <Plus aria-hidden="true" size={19} />
              Catat baru
            </button>
          )}
          {hasActiveFilters && (
            <button
              type="button"
              onClick={resetListControls}
              className="mt-4 flex min-h-11 items-center gap-2 rounded-xl border-2 border-cashmere px-4 font-bold focus:outline-2 focus:outline-woody"
            >
              <RotateCcw aria-hidden="true" size={18} />
              Reset filter
            </button>
          )}
        </div>
      )}

      {!loading &&
        !error &&
        result &&
        result.data.length > 0 &&
        viewMode === "entries" && (
          <DebtEntryList
            debts={result.data}
            mutatingId={mutatingId}
            onEdit={(debt) => {
              setFeedback(null);
              setEditingDebt(debt);
            }}
            onToggleSettled={(debt) => void toggleSettled(debt)}
            onDelete={(debt) => {
              setFeedback(null);
              setDeletingDebt(debt);
            }}
          />
        )}

      {!loading &&
        !error &&
        result &&
        result.data.length > 0 &&
        viewMode === "people" && (
          <DebtGroupedList
            groups={groups}
            expandedGroup={expandedGroup}
            onToggleGroup={(key) =>
              setExpandedGroup((current) =>
                current === key ? null : key,
              )
            }
            mutatingId={mutatingId}
            onEdit={(debt) => {
              setFeedback(null);
              setEditingDebt(debt);
            }}
            onToggleSettled={(debt) => void toggleSettled(debt)}
            onDelete={(debt) => {
              setFeedback(null);
              setDeletingDebt(debt);
            }}
          />
        )}
    </section>
  );
}

function ViewModeButton({
  active,
  onClick,
  icon,
  children,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={`flex min-h-11 items-center justify-center gap-2 rounded-xl border-2 px-3 font-bold focus:outline-2 focus:outline-woody ${active ? "border-woody bg-cashmere" : "border-cashmere bg-linen"}`}
    >
      {icon}
      {children}
    </button>
  );
}

function SummaryCard({
  label,
  amount,
  isFormatted = false,
  detail,
  className = "",
}: {
  label: string;
  amount: string;
  isFormatted?: boolean;
  detail?: string;
  className?: string;
}) {
  return (
    <article
      className={`min-w-0 rounded-2xl border-2 border-cashmere bg-cashmere p-4 sm:p-5 ${className}`}
    >
      <p className="font-semibold">{label}</p>
      <p className="mt-3 break-words text-xl font-bold tabular-nums sm:text-2xl">
        {isFormatted ? amount : formatRupiah(amount)}
      </p>
      {detail && <p className="mt-2 text-sm font-semibold">{detail}</p>}
    </article>
  );
}
