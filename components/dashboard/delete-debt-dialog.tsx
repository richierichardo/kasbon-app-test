"use client";

import { Trash2, X } from "lucide-react";
import { useRef, useState } from "react";

import { Modal } from "@/components/ui/modal";
import { formatRupiah } from "@/lib/debts/format";
import type {
  ApiErrorResponse,
  DebtDTO,
  DeleteDebtResponse,
} from "@/lib/debts/types";

type DeleteDebtDialogProps = {
  debt: DebtDTO;
  onClose: () => void;
  onDeleted: () => void;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function readApiError(value: unknown): string {
  if (
    isRecord(value) &&
    "error" in value &&
    typeof (value as ApiErrorResponse).error === "string"
  ) {
    return (value as ApiErrorResponse).error;
  }

  return "Catatan kasbon belum bisa dihapus. Coba lagi sebentar.";
}

function isDeleteResponse(
  value: unknown,
  expectedId: string,
): value is DeleteDebtResponse {
  if (!isRecord(value) || !isRecord(value.data)) {
    return false;
  }

  return value.data.id === expectedId && value.data.deleted === true;
}

export function DeleteDebtDialog({
  debt,
  onClose,
  onDeleted,
}: DeleteDebtDialogProps) {
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const deletingRef = useRef(false);

  async function deleteDebt() {
    if (deletingRef.current) {
      return;
    }

    deletingRef.current = true;
    setDeleting(true);
    setError(null);

    try {
      const response = await fetch(`/api/debts/${debt.id}`, {
        method: "DELETE",
      });
      const payload: unknown = await response.json();

      if (!response.ok) {
        throw new Error(readApiError(payload));
      }

      if (!isDeleteResponse(payload, debt.id)) {
        throw new Error("Format data dari server tidak sesuai.");
      }

      onDeleted();
    } catch (deleteError) {
      setError(
        deleteError instanceof Error
          ? deleteError.message
          : "Catatan kasbon belum bisa dihapus. Coba lagi sebentar.",
      );
    } finally {
      deletingRef.current = false;
      setDeleting(false);
    }
  }

  return (
    <Modal
      labelledBy="delete-debt-title"
      describedBy="delete-debt-description"
      onClose={onClose}
      closeDisabled={deleting}
      className="max-w-md"
      layer="high"
    >
        <p className="text-sm font-semibold uppercase tracking-[0.2em]">
          Konfirmasi
        </p>
        <h2 id="delete-debt-title" className="mt-2 text-2xl font-bold">
          Hapus catatan kasbon?
        </h2>
        <p id="delete-debt-description" className="mt-4">
          Catatan <span className="font-bold">{debt.counterpart_name}</span>{" "}
          sebesar <span className="font-bold">{formatRupiah(debt.amount)}</span>{" "}
          akan dihapus permanen.
        </p>

        {error && (
          <p
            role="alert"
            aria-live="assertive"
            className="mt-4 rounded-xl bg-cashmere p-3 font-semibold"
          >
            {error}
          </p>
        )}

        <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onClose}
            disabled={deleting}
            className="flex min-h-11 items-center justify-center gap-2 rounded-xl border-2 border-cashmere px-4 font-bold focus:outline-2 focus:outline-woody disabled:cursor-not-allowed disabled:bg-cashmere"
          >
            <X aria-hidden="true" size={18} />
            Batal
          </button>
          <button
            type="button"
            onClick={() => void deleteDebt()}
            disabled={deleting}
            aria-busy={deleting}
            className="flex min-h-11 items-center justify-center gap-2 rounded-xl bg-ferra px-4 font-bold text-linen focus:outline-2 focus:outline-toast disabled:cursor-wait disabled:bg-cashmere disabled:text-woody"
          >
            <Trash2 aria-hidden="true" size={18} />
            {deleting ? "Menghapus..." : "Ya, hapus"}
          </button>
        </div>
    </Modal>
  );
}
