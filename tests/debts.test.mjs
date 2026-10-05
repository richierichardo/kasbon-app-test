import assert from "node:assert/strict";
import test from "node:test";

import {
  escapeIlikePattern,
  parseDebtSort,
  parseSearchQuery,
  parseStatusFilter,
  parseTypeFilter,
} from "../lib/debts/filters.ts";
import {
  getComparisonBarWidths,
  groupDebtsByCounterpart,
} from "../lib/debts/dashboard.ts";
import {
  formatDateInput,
  formatDateInputTyping,
  formatDebtDate,
  formatDebtDateAbsolute,
  formatRupiah,
  formatRupiahInput,
  parseDateInput,
} from "../lib/debts/format.ts";
import { buildDebtSummary } from "../lib/debts/summary.ts";
import {
  validateCreateDebtInput,
  validateUpdateDebtInput,
} from "../lib/debts/validation.ts";

const validCreate = {
  type: "owed_to_me",
  counterpart_name: "  Budi  ",
  amount: "00150000",
  due_date: "2026-10-05",
  note: "  makan siang  ",
};

test("create validator trims and normalizes valid input", () => {
  const result = validateCreateDebtInput(validCreate);

  assert.equal(result.success, true);
  if (result.success) {
    assert.deepEqual(result.data, {
      type: "owed_to_me",
      counterpart_name: "Budi",
      amount: "150000",
      due_date: "2026-10-05",
      note: "makan siang",
    });
  }
});

for (const [label, patch] of [
  ["invalid type", { type: "borrowed" }],
  ["blank name", { counterpart_name: "   " }],
  ["zero amount", { amount: "0" }],
  ["negative amount", { amount: "-1" }],
  ["decimal amount", { amount: "1.5" }],
  ["non-digit amount", { amount: "Rp100" }],
  ["bigint overflow", { amount: "9223372036854775808" }],
  ["invalid calendar date", { due_date: "2026-02-30" }],
  ["long note", { note: "x".repeat(201) }],
]) {
  test(`create validator rejects ${label}`, () => {
    const result = validateCreateDebtInput({ ...validCreate, ...patch });
    assert.equal(result.success, false);
  });
}

for (const forbiddenField of ["user_id", "settled_at", "settled", "unknown"]) {
  test(`create validator rejects forbidden field ${forbiddenField}`, () => {
    const result = validateCreateDebtInput({
      ...validCreate,
      [forbiddenField]: "forbidden",
    });
    assert.equal(result.success, false);
  });
}

test("create validator accepts exactly 200 note characters and normalizes empty note", () => {
  const fullNote = validateCreateDebtInput({
    ...validCreate,
    note: "x".repeat(200),
  });
  const emptyNote = validateCreateDebtInput({ ...validCreate, note: "   " });

  assert.equal(fullNote.success, true);
  assert.equal(emptyNote.success, true);
  if (emptyNote.success) assert.equal(emptyNote.data.note, null);
});

test("update validator accepts a valid partial update", () => {
  const result = validateUpdateDebtInput({
    amount: "00042",
    note: "   ",
    settled: true,
  });

  assert.equal(result.success, true);
  if (result.success) {
    assert.deepEqual(result.data, { amount: "42", note: null, settled: true });
  }
});

for (const payload of [
  {},
  { user_id: "forbidden" },
  { settled_at: new Date().toISOString() },
  { settled: "true" },
  { amount: "0" },
  { counterpart_name: "" },
  { due_date: "not-a-date" },
  { note: "x".repeat(201) },
]) {
  test(`update validator rejects ${JSON.stringify(payload).slice(0, 80)}`, () => {
    assert.equal(validateUpdateDebtInput(payload).success, false);
  });
}

test("summary uses BigInt, excludes settled rows, and returns decimal strings", () => {
  const rows = [
    { type: "owed_to_me", amount_text: "9007199254740993", settled_at: null },
    { type: "i_owe", amount_text: "3", settled_at: null },
    {
      type: "owed_to_me",
      amount_text: "999999999999999999",
      settled_at: "2026-10-05T00:00:00.000Z",
    },
  ];

  assert.deepEqual(buildDebtSummary(rows), {
    owed_to_me: "9007199254740993",
    i_owe: "3",
    net: "9007199254740990",
  });
  assert.deepEqual(buildDebtSummary(rows.filter((row) => row.type === "i_owe")), {
    owed_to_me: "0",
    i_owe: "3",
    net: "-3",
  });
  assert.deepEqual(buildDebtSummary([]), {
    owed_to_me: "0",
    i_owe: "0",
    net: "0",
  });
});

test("filter parsers accept supported values and reject invalid values", () => {
  assert.equal(parseStatusFilter(null), "all");
  assert.equal(parseStatusFilter("settled"), "settled");
  assert.equal(parseTypeFilter(null), "all");
  assert.equal(parseTypeFilter("i_owe"), "i_owe");
  assert.throws(() => parseStatusFilter("paid"), /tidak valid/);
  assert.throws(() => parseTypeFilter("other"), /tidak valid/);
  assert.equal(parseDebtSort(null), "newest");
  assert.equal(parseDebtSort("amount_desc"), "amount_desc");
  assert.throws(() => parseDebtSort("name"), /tidak valid/);
  assert.equal(parseSearchQuery("  Budi  "), "Budi");
  assert.equal(parseSearchQuery(null), "");
  assert.throws(() => parseSearchQuery("x".repeat(101)), /100 karakter/);
  assert.equal(escapeIlikePattern("50%_A\\B"), "50\\%\\_A\\\\B");
});

test("grouping merges normalized names and keeps BigInt totals", () => {
  const baseDebt = {
    id: "00000000-0000-4000-8000-000000000001",
    user_id: "00000000-0000-4000-8000-000000000002",
    type: "owed_to_me",
    counterpart_name: " Budi  Santoso ",
    amount: "9007199254740993",
    note: null,
    due_date: "2026-10-05",
    settled_at: null,
    created_at: "2026-10-05T00:00:00.000Z",
    updated_at: "2026-10-05T00:00:00.000Z",
  };
  const groups = groupDebtsByCounterpart([
    baseDebt,
    {
      ...baseDebt,
      id: "00000000-0000-4000-8000-000000000003",
      counterpart_name: "budi santoso",
      type: "i_owe",
      amount: "7",
      settled_at: "2026-10-06T00:00:00.000Z",
    },
    {
      ...baseDebt,
      id: "00000000-0000-4000-8000-000000000004",
      counterpart_name: "Ani",
      amount: "10",
    },
  ]);

  assert.equal(groups.length, 2);
  assert.equal(groups[0].counterpartName, "Ani");
  assert.equal(groups[1].counterpartName, "Budi Santoso");
  assert.equal(groups[1].debts.length, 2);
  assert.equal(groups[1].unsettledCount, 1);
  assert.equal(groups[1].owedToMe, "9007199254740993");
  assert.equal(groups[1].iOwe, "7");
});

test("chart widths use bounded BigInt ratios", () => {
  assert.deepEqual(
    getComparisonBarWidths({ owed_to_me: "0", i_owe: "0", net: "0" }),
    { owedToMe: 0, iOwe: 0 },
  );
  assert.deepEqual(
    getComparisonBarWidths({
      owed_to_me: "9007199254740993",
      i_owe: "4503599627370496",
      net: "4503599627370497",
    }),
    { owedToMe: 100, iOwe: 49.99 },
  );
});

test("Rupiah formatting preserves integers above Number.MAX_SAFE_INTEGER", () => {
  const formatted = formatRupiah("9007199254740993").replaceAll(/\s/g, " ");
  assert.match(formatted, /^Rp\s?9\.007\.199\.254\.740\.993$/);
  assert.equal(formatRupiahInput("1000"), "1.000");
  assert.equal(formatRupiahInput("10000"), "10.000");
  assert.equal(formatRupiahInput("9007199254740993"), "9.007.199.254.740.993");
});

test("date input uses dd/mm/yyyy while API keeps ISO dates", () => {
  assert.equal(formatDateInput("2026-10-05"), "05/10/2026");
  assert.equal(formatDateInputTyping("05102026"), "05/10/2026");
  assert.equal(formatDateInputTyping("05-10-2026"), "05/10/2026");
  assert.equal(parseDateInput("05/10/2026"), "2026-10-05");
  assert.equal(parseDateInput("5/10/2026"), null);
  assert.equal(
    formatDebtDateAbsolute("2026-10-05", "2026-01-01T00:00:00.000Z"),
    "05/10/2026",
  );
});

test("relative date formatting follows the local calendar", () => {
  const reference = new Date(2026, 9, 5, 12, 0, 0);
  const createdAt = "2026-10-05T00:00:00.000Z";

  assert.equal(formatDebtDate("2026-10-05", createdAt, reference), "hari ini");
  assert.equal(formatDebtDate("2026-10-04", createdAt, reference), "kemarin");
  assert.equal(formatDebtDate("2026-10-02", createdAt, reference), "3 hari lalu");
  assert.equal(formatDebtDate("2026-10-06", createdAt, reference), "besok");
  assert.equal(formatDebtDate("2026-10-08", createdAt, reference), "3 hari lagi");
});
