const rupiahFormatter = new Intl.NumberFormat("id-ID", {
  style: "currency",
  currency: "IDR",
  maximumFractionDigits: 0,
});

export function formatRupiah(amount: string): string {
  return rupiahFormatter.format(BigInt(amount));
}

export function formatDebtDate(
  dueDate: string | null,
  createdAt: string,
): string {
  const target = getDebtDate(dueDate, createdAt);
  const today = new Date();
  const targetDay = Date.UTC(
    target.getFullYear(),
    target.getMonth(),
    target.getDate(),
  );
  const todayDay = Date.UTC(
    today.getFullYear(),
    today.getMonth(),
    today.getDate(),
  );
  const difference = Math.round((targetDay - todayDay) / 86_400_000);

  if (difference === 0) return "hari ini";
  if (difference === -1) return "kemarin";
  if (difference === 1) return "besok";
  if (difference < 0) return `${Math.abs(difference)} hari lalu`;
  return `${difference} hari lagi`;
}

export function formatDebtDateAbsolute(
  dueDate: string | null,
  createdAt: string,
): string {
  return new Intl.DateTimeFormat("id-ID", { dateStyle: "medium" }).format(
    getDebtDate(dueDate, createdAt),
  );
}

function getDebtDate(dueDate: string | null, createdAt: string): Date {
  if (!dueDate) {
    return new Date(createdAt);
  }

  const [year, month, day] = dueDate.split("-").map(Number);
  return new Date(year, month - 1, day);
}
