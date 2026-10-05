import {
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  Pencil,
  Trash2,
  Undo2,
} from "lucide-react";

import type { DebtGroup } from "@/lib/debts/dashboard";
import {
  formatDebtDate,
  formatDebtDateAbsolute,
  formatRupiah,
} from "@/lib/debts/format";
import type { DebtDTO } from "@/lib/debts/types";

type DebtActions = {
  mutatingId: string | null;
  onEdit: (debt: DebtDTO) => void;
  onToggleSettled: (debt: DebtDTO) => void;
  onDelete: (debt: DebtDTO) => void;
};

export function DebtEntryList({
  debts,
  ...actions
}: DebtActions & { debts: DebtDTO[] }) {
  return (
    <div className="flex flex-col gap-4">
      {debts.map((debt) => (
        <DebtCard
          key={debt.id}
          debt={debt}
          mutating={actions.mutatingId === debt.id}
          onEdit={() => actions.onEdit(debt)}
          onToggleSettled={() => actions.onToggleSettled(debt)}
          onDelete={() => actions.onDelete(debt)}
        />
      ))}
    </div>
  );
}

export function DebtGroupedList({
  groups,
  expandedGroup,
  onToggleGroup,
  ...actions
}: DebtActions & {
  groups: DebtGroup[];
  expandedGroup: string | null;
  onToggleGroup: (key: string) => void;
}) {
  return (
    <div className="flex flex-col gap-4">
      {groups.map((group) => (
        <DebtGroupCard
          key={group.key}
          group={group}
          expanded={expandedGroup === group.key}
          onToggle={() => onToggleGroup(group.key)}
          {...actions}
        />
      ))}
    </div>
  );
}

function DebtCard({
  debt,
  mutating,
  onEdit,
  onToggleSettled,
  onDelete,
  nested = false,
}: {
  debt: DebtDTO;
  mutating: boolean;
  onEdit: () => void;
  onToggleSettled: () => void;
  onDelete: () => void;
  nested?: boolean;
}) {
  return (
    <article
      className={`rounded-2xl border-2 border-cashmere bg-linen ${nested ? "p-4" : "p-5"}`}
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex flex-col gap-1">
          {!nested && (
            <h2 className="text-xl font-bold">{debt.counterpart_name}</h2>
          )}
          <p>{debt.type === "owed_to_me" ? "Dihutang ke saya" : "Saya hutang"}</p>
        </div>
        <p className="text-xl font-bold">{formatRupiah(debt.amount)}</p>
      </div>
      <div className="mt-4 flex flex-wrap gap-x-4 gap-y-2 text-sm">
        <span
          className="flex items-center gap-2"
          title={formatDebtDateAbsolute(debt.due_date, debt.created_at)}
        >
          <CalendarDays aria-hidden="true" size={17} />
          {formatDebtDate(debt.due_date, debt.created_at)} ·{" "}
          {formatDebtDateAbsolute(debt.due_date, debt.created_at)}
        </span>
        <span className="flex items-center gap-2 font-semibold">
          <CheckCircle2 aria-hidden="true" size={17} />
          {debt.settled_at === null ? "Belum lunas" : "Lunas"}
        </span>
      </div>
      {debt.note && <p className="mt-3">{debt.note}</p>}
      <div className="mt-5 flex flex-wrap gap-3">
        <button
          type="button"
          onClick={onEdit}
          disabled={mutating}
          className="flex min-h-11 items-center gap-2 rounded-xl border-2 border-cashmere px-4 font-bold focus:outline-2 focus:outline-woody disabled:cursor-not-allowed disabled:bg-cashmere"
        >
          <Pencil aria-hidden="true" size={18} />
          Edit
        </button>
        <button
          type="button"
          onClick={onToggleSettled}
          disabled={mutating}
          aria-busy={mutating}
          className="flex min-h-11 items-center gap-2 rounded-xl bg-toast px-4 font-bold focus:outline-2 focus:outline-woody disabled:cursor-wait disabled:bg-cashmere"
        >
          {debt.settled_at === null ? (
            <CheckCircle2 aria-hidden="true" size={18} />
          ) : (
            <Undo2 aria-hidden="true" size={18} />
          )}
          {mutating
            ? "Menyimpan..."
            : debt.settled_at === null
              ? "Tandai lunas"
              : "Batalkan lunas"}
        </button>
        <button
          type="button"
          onClick={onDelete}
          disabled={mutating}
          className="flex min-h-11 items-center gap-2 rounded-xl bg-ferra px-4 font-bold text-linen focus:outline-2 focus:outline-toast disabled:cursor-not-allowed disabled:bg-cashmere disabled:text-woody"
        >
          <Trash2 aria-hidden="true" size={18} />
          Hapus
        </button>
      </div>
    </article>
  );
}

function DebtGroupCard({
  group,
  expanded,
  onToggle,
  mutatingId,
  onEdit,
  onToggleSettled,
  onDelete,
}: DebtActions & {
  group: DebtGroup;
  expanded: boolean;
  onToggle: () => void;
}) {
  const contentId = `debt-group-${encodeURIComponent(group.key).replaceAll("%", "-")}`;

  return (
    <section className="rounded-2xl border-2 border-cashmere bg-linen p-4 sm:p-5">
      <button
        type="button"
        aria-expanded={expanded}
        aria-controls={contentId}
        onClick={onToggle}
        className="flex min-h-11 w-full items-center justify-between gap-4 text-left focus:outline-2 focus:outline-woody"
      >
        <span>
          <span className="block text-xl font-bold">{group.counterpartName}</span>
          <span className="mt-1 block text-sm">
            {group.debts.length} catatan · {group.unsettledCount} belum lunas
          </span>
        </span>
        <ChevronDown
          aria-hidden="true"
          size={22}
          className={`shrink-0 ${expanded ? "rotate-180" : ""}`}
        />
      </button>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <div className="rounded-xl bg-cashmere p-3">
          <p className="text-sm font-semibold">Dihutang ke saya</p>
          <p className="mt-1 font-bold">{formatRupiah(group.owedToMe)}</p>
        </div>
        <div className="rounded-xl bg-cashmere p-3">
          <p className="text-sm font-semibold">Saya hutang</p>
          <p className="mt-1 font-bold">{formatRupiah(group.iOwe)}</p>
        </div>
      </div>

      {expanded && (
        <div
          id={contentId}
          className="mt-4 flex flex-col gap-3 border-t-2 border-cashmere pt-4"
        >
          {group.debts.map((debt) => (
            <DebtCard
              key={debt.id}
              debt={debt}
              nested
              mutating={mutatingId === debt.id}
              onEdit={() => onEdit(debt)}
              onToggleSettled={() => onToggleSettled(debt)}
              onDelete={() => onDelete(debt)}
            />
          ))}
        </div>
      )}
    </section>
  );
}
