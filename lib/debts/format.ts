const rupiahFormatter = new Intl.NumberFormat("id-ID", {
  style: "currency",
  currency: "IDR",
  maximumFractionDigits: 0,
});

export function formatRupiah(amount: string): string {
  return rupiahFormatter.format(BigInt(amount));
}

export function formatRupiahInput(amount: string): string {
  if (!amount) return "";
  return BigInt(amount).toLocaleString("id-ID");
}

export function formatDateInput(isoDate: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(isoDate);
  return match ? `${match[3]}/${match[2]}/${match[1]}` : "";
}

export function formatDateInputTyping(value: string): string {
  const digits = value.replace(/\D/g, "").slice(0, 8);
  const day = digits.slice(0, 2);
  const month = digits.slice(2, 4);
  const year = digits.slice(4, 8);
  return [day, month, year].filter(Boolean).join("/");
}

export function parseDateInput(value: string): string | null {
  const match = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(value);
  if (!match) return null;
  return `${match[3]}-${match[2]}-${match[1]}`;
}

export function formatDebtDate(
  dueDate: string | null,
  createdAt: string,
  referenceDate = new Date(),
): string {
  const target = getDebtDate(dueDate, createdAt);
  const today = referenceDate;
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
  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(getDebtDate(dueDate, createdAt));
}

function getDebtDate(dueDate: string | null, createdAt: string): Date {
  if (!dueDate) {
    return new Date(createdAt);
  }

  const [year, month, day] = dueDate.split("-").map(Number);
  return new Date(year, month - 1, day);
}
