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
  const value = dueDate ? `${dueDate}T00:00:00` : createdAt;
  return new Intl.DateTimeFormat("id-ID", { dateStyle: "medium" }).format(
    new Date(value),
  );
}
