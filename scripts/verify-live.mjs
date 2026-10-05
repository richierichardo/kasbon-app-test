import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";

const requiredEnvironment = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
  "SUPABASE_TEST_USER_A_EMAIL",
  "SUPABASE_TEST_USER_A_PASSWORD",
  "SUPABASE_TEST_USER_B_EMAIL",
  "SUPABASE_TEST_USER_B_PASSWORD",
];

const missingEnvironment = requiredEnvironment.filter(
  (name) => !process.env[name]?.trim(),
);

if (missingEnvironment.length > 0) {
  console.error(
    `✗ Live verification belum dijalankan: environment berikut belum diisi: ${missingEnvironment.join(", ")}.`,
  );
  process.exit(1);
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL.replace(/\/$/, "");
const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const appBaseUrl = (process.env.APP_BASE_URL || "http://localhost:3000").replace(
  /\/$/,
  "",
);
const restUrl = `${supabaseUrl}/rest/v1/debts`;
const fixtureMarker = `plan9-${Date.now()}`;
const fixtureIds = { a: new Set(), b: new Set() };

function ensure(condition, message) {
  if (!condition) throw new Error(message);
}

function pass(message) {
  console.log(`✓ ${message}`);
}

async function parseResponse(response) {
  const text = await response.text();
  if (!text) return null;

  try {
    return JSON.parse(text);
  } catch {
    throw new Error(`Response ${response.status} bukan JSON yang valid.`);
  }
}

async function signIn(email, password, label) {
  const client = createClient(supabaseUrl, publishableKey, {
    auth: {
      autoRefreshToken: false,
      detectSessionInUrl: false,
      persistSession: false,
    },
  });
  const { data, error } = await client.auth.signInWithPassword({ email, password });

  if (error || !data.session || !data.user) {
    throw new Error(
      `Akun ${label} gagal login. Pastikan credential benar dan email sudah dikonfirmasi.`,
    );
  }

  return { session: data.session, user: data.user };
}

async function createCookieHeader(session) {
  const cookieJar = new Map();
  const client = createServerClient(supabaseUrl, publishableKey, {
    cookies: {
      getAll() {
        return Array.from(cookieJar, ([name, value]) => ({ name, value }));
      },
      setAll(cookies) {
        for (const cookie of cookies) cookieJar.set(cookie.name, cookie.value);
      },
    },
  });
  const { error } = await client.auth.setSession({
    access_token: session.access_token,
    refresh_token: session.refresh_token,
  });

  if (error) throw new Error("Session cookie untuk pengujian API gagal dibuat.");

  return Array.from(cookieJar, ([name, value]) => `${name}=${value}`).join("; ");
}

async function appRequest(path, { cookie, body, rawBody, method = "GET" } = {}) {
  const headers = {};
  if (cookie) headers.Cookie = cookie;
  if (body !== undefined || rawBody !== undefined) {
    headers["Content-Type"] = "application/json";
  }

  let response;
  try {
    response = await fetch(`${appBaseUrl}${path}`, {
      method,
      headers,
      body: rawBody ?? (body === undefined ? undefined : JSON.stringify(body)),
      redirect: "manual",
    });
  } catch {
    throw new Error(
      `Aplikasi tidak dapat dihubungi di ${appBaseUrl}. Jalankan pnpm dev terlebih dahulu.`,
    );
  }

  return { response, payload: await parseResponse(response) };
}

async function restRequest(session, query = "", options = {}) {
  const headers = {
    apikey: publishableKey,
    Authorization: `Bearer ${session.access_token}`,
  };
  if (options.body !== undefined) headers["Content-Type"] = "application/json";
  if (options.prefer) headers.Prefer = options.prefer;

  const response = await fetch(`${restUrl}${query}`, {
    method: options.method || "GET",
    headers,
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
  });

  return { response, payload: await parseResponse(response) };
}

function expectStatus(result, expected, label) {
  ensure(
    result.response.status === expected,
    `${label}: mengharapkan status ${expected}, menerima ${result.response.status}.`,
  );
}

async function createDebt(cookie, owner, input) {
  const result = await appRequest("/api/debts", {
    method: "POST",
    cookie,
    body: input,
  });
  expectStatus(result, 201, "Create debt");
  ensure(result.payload?.data?.user_id === owner.user.id, "Owner create tidak sesuai session.");
  ensure(typeof result.payload.data.amount === "string", "Amount response bukan string.");
  ensure(result.payload.data.settled_at === null, "Debt baru tidak berstatus unsettled.");
  return result.payload.data;
}

async function cleanupFixtures(owner, ids) {
  for (const id of ids) {
    const result = await restRequest(
      owner.session,
      `?id=eq.${encodeURIComponent(id)}`,
      { method: "DELETE" },
    );
    ensure(result.response.ok, "Fixture live test gagal dibersihkan.");
  }
}

async function run() {
  const [ownerA, ownerB] = await Promise.all([
    signIn(
      process.env.SUPABASE_TEST_USER_A_EMAIL,
      process.env.SUPABASE_TEST_USER_A_PASSWORD,
      "A",
    ),
    signIn(
      process.env.SUPABASE_TEST_USER_B_EMAIL,
      process.env.SUPABASE_TEST_USER_B_PASSWORD,
      "B",
    ),
  ]);
  ensure(ownerA.user.id !== ownerB.user.id, "Akun A dan B harus berbeda.");

  const [cookieA, cookieB] = await Promise.all([
    createCookieHeader(ownerA.session),
    createCookieHeader(ownerB.session),
  ]);

  try {
    const unauthenticated = await appRequest("/api/debts");
    expectStatus(unauthenticated, 401, "GET tanpa session");
    const unauthenticatedPatch = await appRequest("/api/debts/not-a-uuid", {
      method: "PATCH",
      body: {},
    });
    expectStatus(unauthenticatedPatch, 401, "PATCH tanpa session");
    const unauthenticatedDelete = await appRequest("/api/debts/not-a-uuid", {
      method: "DELETE",
    });
    expectStatus(unauthenticatedDelete, 401, "DELETE tanpa session");
    pass("semua endpoint menolak request tanpa session");

    for (const path of [
      "/api/debts?status=paid&type=all",
      "/api/debts?status=all&type=other",
    ]) {
      expectStatus(await appRequest(path, { cookie: cookieA }), 400, "Filter invalid");
    }
    expectStatus(
      await appRequest("/api/debts/not-a-uuid", {
        method: "PATCH",
        cookie: cookieA,
        body: { amount: "1" },
      }),
      400,
      "UUID invalid",
    );
    expectStatus(
      await appRequest("/api/debts", {
        method: "POST",
        cookie: cookieA,
        rawBody: "{",
      }),
      400,
      "JSON invalid",
    );

    const baseInput = {
      type: "owed_to_me",
      counterpart_name: fixtureMarker,
      amount: "1",
      due_date: "2026-10-05",
      note: null,
    };
    for (const invalidInput of [
      { ...baseInput, type: "other" },
      { ...baseInput, counterpart_name: " " },
      { ...baseInput, amount: "0" },
      { ...baseInput, amount: "1.5" },
      { ...baseInput, amount: "9223372036854775808" },
      { ...baseInput, due_date: "2026-02-30" },
      { ...baseInput, note: "x".repeat(201) },
      { ...baseInput, user_id: ownerB.user.id },
      { ...baseInput, settled_at: new Date().toISOString() },
      { ...baseInput, settled: true },
    ]) {
      expectStatus(
        await appRequest("/api/debts", {
          method: "POST",
          cookie: cookieA,
          body: invalidInput,
        }),
        400,
        "Payload create invalid",
      );
    }
    pass("filter, UUID, JSON, dan payload invalid menghasilkan 400");

    const debtA = await createDebt(cookieA, ownerA, {
      ...baseInput,
      amount: "9007199254740993",
    });
    fixtureIds.a.add(debtA.id);
    const debtAOwed = await createDebt(cookieA, ownerA, {
      ...baseInput,
      type: "i_owe",
      counterpart_name: `${fixtureMarker}-i-owe`,
      amount: "3",
    });
    fixtureIds.a.add(debtAOwed.id);
    const debtB = await createDebt(cookieB, ownerB, {
      ...baseInput,
      counterpart_name: `${fixtureMarker}-b`,
      amount: "77",
    });
    fixtureIds.b.add(debtB.id);

    const list = await appRequest("/api/debts?status=all&type=all", {
      cookie: cookieA,
    });
    expectStatus(list, 200, "GET debts");
    ensure(list.payload.summary.owed_to_me === "9007199254740993", "Total owed salah.");
    ensure(list.payload.summary.i_owe === "3", "Total i_owe salah.");
    ensure(list.payload.summary.net === "9007199254740990", "Net BigInt salah.");
    ensure(
      list.payload.data.every((row) => row.user_id === ownerA.user.id),
      "List API membocorkan row user lain.",
    );
    const filtered = await appRequest(
      "/api/debts?status=unsettled&type=i_owe",
      { cookie: cookieA },
    );
    expectStatus(filtered, 200, "GET filtered debts");
    ensure(filtered.payload.data.every((row) => row.type === "i_owe"), "Filter type gagal.");
    ensure(
      filtered.payload.summary.net === "9007199254740990",
      "Filter list mengubah summary global.",
    );
    pass("create, list, filter, dan kalkulasi BigInt benar");

    const edited = await appRequest(`/api/debts/${debtAOwed.id}`, {
      method: "PATCH",
      cookie: cookieA,
      body: { amount: "5", note: "sudah diedit" },
    });
    expectStatus(edited, 200, "Edit own row");
    ensure(edited.payload.data.amount === "5", "Edit amount tidak tersimpan sebagai string.");
    ensure(edited.payload.data.note === "sudah diedit", "Edit note tidak tersimpan.");
    for (const invalidUpdate of [{}, { user_id: ownerB.user.id }, { settled_at: null }]) {
      expectStatus(
        await appRequest(`/api/debts/${debtA.id}`, {
          method: "PATCH",
          cookie: cookieA,
          body: invalidUpdate,
        }),
        400,
        "Payload update invalid",
      );
    }

    const settleOnce = await appRequest(`/api/debts/${debtA.id}`, {
      method: "PATCH",
      cookie: cookieA,
      body: { settled: true },
    });
    expectStatus(settleOnce, 200, "Settle pertama");
    const firstTimestamp = settleOnce.payload.data.settled_at;
    ensure(typeof firstTimestamp === "string", "Settlement timestamp tidak tersimpan.");
    const settleTwice = await appRequest(`/api/debts/${debtA.id}`, {
      method: "PATCH",
      cookie: cookieA,
      body: { settled: true },
    });
    expectStatus(settleTwice, 200, "Settle kedua");
    ensure(
      settleTwice.payload.data.settled_at === firstTimestamp,
      "Settlement kedua mengubah timestamp pertama.",
    );
    const settledList = await appRequest("/api/debts", { cookie: cookieA });
    ensure(settledList.payload.summary.owed_to_me === "0", "Debt lunas masih dihitung.");
    const unsettle = await appRequest(`/api/debts/${debtA.id}`, {
      method: "PATCH",
      cookie: cookieA,
      body: { settled: false },
    });
    expectStatus(unsettle, 200, "Unsettle");
    ensure(unsettle.payload.data.settled_at === null, "Unsettle tidak persisten.");
    const unsettledList = await appRequest("/api/debts", { cookie: cookieA });
    ensure(
      unsettledList.payload.summary.owed_to_me === "9007199254740993" &&
        unsettledList.payload.summary.i_owe === "5" &&
        unsettledList.payload.summary.net === "9007199254740988",
      "Unsettle tidak mengembalikan summary outstanding.",
    );
    pass("settlement persisten dan idempotent");

    const missingId = "00000000-0000-4000-8000-000000000000";
    const missing = await appRequest(`/api/debts/${missingId}`, {
      method: "PATCH",
      cookie: cookieA,
      body: { amount: "2" },
    });
    const inaccessible = await appRequest(`/api/debts/${debtB.id}`, {
      method: "PATCH",
      cookie: cookieA,
      body: { amount: "2" },
    });
    expectStatus(missing, 404, "Missing row");
    expectStatus(inaccessible, 404, "Inaccessible row");
    ensure(
      JSON.stringify(missing.payload) === JSON.stringify(inaccessible.payload),
      "Missing dan inaccessible row memiliki response berbeda.",
    );
    const missingDelete = await appRequest(`/api/debts/${missingId}`, {
      method: "DELETE",
      cookie: cookieA,
    });
    const inaccessibleDelete = await appRequest(`/api/debts/${debtB.id}`, {
      method: "DELETE",
      cookie: cookieA,
    });
    expectStatus(missingDelete, 404, "Delete missing row");
    expectStatus(inaccessibleDelete, 404, "Delete inaccessible row");
    ensure(
      JSON.stringify(missingDelete.payload) ===
        JSON.stringify(inaccessibleDelete.payload),
      "DELETE missing dan inaccessible row memiliki response berbeda.",
    );

    const crossSelect = await restRequest(
      ownerA.session,
      `?id=eq.${encodeURIComponent(debtB.id)}&select=*`,
    );
    ensure(crossSelect.response.ok, "Direct REST SELECT gagal dijalankan.");
    ensure(Array.isArray(crossSelect.payload) && crossSelect.payload.length === 0, "RLS SELECT bocor.");

    const spoofInsert = await restRequest(ownerA.session, "", {
      method: "POST",
      prefer: "return=representation",
      body: {
        ...baseInput,
        user_id: ownerB.user.id,
        counterpart_name: `${fixtureMarker}-spoof`,
      },
    });
    ensure(!spoofInsert.response.ok, "RLS menerima INSERT dengan owner user lain.");

    const crossUpdate = await restRequest(
      ownerA.session,
      `?id=eq.${encodeURIComponent(debtB.id)}&select=*`,
      {
        method: "PATCH",
        prefer: "return=representation",
        body: { amount: "999" },
      },
    );
    ensure(crossUpdate.response.ok, "Direct REST UPDATE tidak dapat diverifikasi.");
    ensure(Array.isArray(crossUpdate.payload) && crossUpdate.payload.length === 0, "RLS UPDATE bocor.");

    const crossDelete = await restRequest(
      ownerA.session,
      `?id=eq.${encodeURIComponent(debtB.id)}&select=*`,
      { method: "DELETE", prefer: "return=representation" },
    );
    ensure(crossDelete.response.ok, "Direct REST DELETE tidak dapat diverifikasi.");
    ensure(Array.isArray(crossDelete.payload) && crossDelete.payload.length === 0, "RLS DELETE bocor.");

    const ownerBCheck = await restRequest(
      ownerB.session,
      `?id=eq.${encodeURIComponent(debtB.id)}&select=id,amount`,
    );
    ensure(ownerBCheck.response.ok, "Owner B tidak dapat membaca fixture sendiri.");
    ensure(ownerBCheck.payload?.[0]?.amount === 77 || ownerBCheck.payload?.[0]?.amount === "77", "Row B berubah lewat user A.");
    pass("RLS SELECT, INSERT, UPDATE, dan DELETE mengisolasi dua user");

    const deleted = await appRequest(`/api/debts/${debtAOwed.id}`, {
      method: "DELETE",
      cookie: cookieA,
    });
    expectStatus(deleted, 200, "Delete own row");
    ensure(deleted.payload?.data?.deleted === true, "Response delete tidak valid.");
    fixtureIds.a.delete(debtAOwed.id);
    pass("edit/delete owner dan response ownership-safe benar");
  } finally {
    await Promise.all([
      cleanupFixtures(ownerA, fixtureIds.a),
      cleanupFixtures(ownerB, fixtureIds.b),
    ]);
  }
}

run().catch((error) => {
  console.error(`✗ ${error instanceof Error ? error.message : "Live verification gagal."}`);
  process.exitCode = 1;
});
