import { createClient } from "@supabase/supabase-js";

const DEMO_EMAIL = "demo@gmail.com";
const DEMO_PASSWORD = "qwerty";

function requireEnvironment(name, fallbackName) {
  const value = process.env[name] ?? (fallbackName ? process.env[fallbackName] : undefined);

  if (!value) {
    const alternatives = fallbackName ? ` atau ${fallbackName}` : "";
    throw new Error(`Environment ${name}${alternatives} belum diisi.`);
  }

  return value;
}

function localDate(offsetDays) {
  const date = new Date();
  date.setDate(date.getDate() + offsetDays);
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("-");
}

async function findUserByEmail(supabase, email) {
  for (let page = 1; ; page += 1) {
    const { data, error } = await supabase.auth.admin.listUsers({
      page,
      perPage: 1000,
    });

    if (error) throw error;

    const user = data.users.find(
      (candidate) => candidate.email?.toLowerCase() === email.toLowerCase(),
    );
    if (user) return user;
    if (data.users.length < 1000) return null;
  }
}

async function ensureDemoUser(supabase) {
  const existing = await findUserByEmail(supabase, DEMO_EMAIL);

  if (existing) {
    const { data, error } = await supabase.auth.admin.updateUserById(existing.id, {
      password: DEMO_PASSWORD,
      email_confirm: true,
    });
    if (error) throw error;
    return data.user;
  }

  const { data, error } = await supabase.auth.admin.createUser({
    email: DEMO_EMAIL,
    password: DEMO_PASSWORD,
    email_confirm: true,
  });
  if (error) throw error;
  return data.user;
}

async function seedDemoDebts(supabase, userId) {
  const now = new Date().toISOString();
  const debts = [
    {
      id: "adf39bf0-c243-4d6a-a6ef-dd6a91754d01",
      user_id: userId,
      type: "owed_to_me",
      counterpart_name: "Budi Santoso",
      amount: "350000",
      due_date: localDate(3),
      note: "Kasbon makan siang dan transport",
      settled_at: null,
    },
    {
      id: "adf39bf0-c243-4d6a-a6ef-dd6a91754d02",
      user_id: userId,
      type: "i_owe",
      counterpart_name: "Ani",
      amount: "125000",
      due_date: localDate(7),
      note: "Patungan hadiah",
      settled_at: null,
    },
    {
      id: "adf39bf0-c243-4d6a-a6ef-dd6a91754d03",
      user_id: userId,
      type: "owed_to_me",
      counterpart_name: "Budi Santoso",
      amount: "75000",
      due_date: localDate(-2),
      note: "Sudah dibayar",
      settled_at: now,
    },
  ];

  const { error } = await supabase.from("debts").upsert(debts, {
    onConflict: "id",
  });
  if (error) throw error;
}

async function run() {
  const url = requireEnvironment("NEXT_PUBLIC_SUPABASE_URL");
  const secretKey = requireEnvironment(
    "SUPABASE_SECRET_KEY",
    "SUPABASE_SERVICE_ROLE_KEY",
  );
  if (
    secretKey === process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    secretKey.startsWith("sb_publishable_")
  ) {
    throw new Error("Seeder membutuhkan secret key, bukan publishable key.");
  }
  const supabase = createClient(url, secretKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  const user = await ensureDemoUser(supabase);
  await seedDemoDebts(supabase, user.id);

  console.log(`Akun demo siap: ${DEMO_EMAIL}`);
  console.log("Tiga catatan contoh sudah tersimpan untuk akun demo.");
}

run().catch((error) => {
  const message = error instanceof Error ? error.message : "Seeder gagal.";
  console.error(`Seeder akun demo gagal: ${message}`);
  process.exitCode = 1;
});
