# Kasbon

Kasbon adalah web app untuk mencatat hutang-piutang pribadi: siapa yang berhutang kepada kita, kepada siapa kita berhutang, berapa nominalnya, dan apakah sudah lunas. Project ini dibangun dari Next.js project kosong untuk hiring task Junior Fullstack Developer.

- **Live demo:** [kasbon-app-test-lake.vercel.app](https://kasbon-app-test-lake.vercel.app)
- **Repository:** [github.com/richierichardo/kasbon-app-test](https://github.com/richierichardo/kasbon-app-test)

## Requirement coverage

| Area | Implementasi |
|---|---|
| Auth | Signup, login, logout, email confirmation, cookie-based session, dan protected dashboard menggunakan Supabase Auth. |
| Dashboard | Tiga summary card, list kasbon, format Rupiah, tanggal relatif, status eksplisit, filter status/tipe, dan seluruh action CRUD. |
| Form | Create/edit dengan tipe hutang, nama, nominal, tanggal default hari ini, catatan maksimal 200 karakter, serta validasi client dan server. |
| API | Authenticated GET, POST, PATCH, dan DELETE dengan response/error Bahasa Indonesia dan status code yang sesuai. |
| Database | Migration untuk enum, tabel, constraint, index, trigger timestamp, grants, dan owner-only RLS. |
| Quality | TypeScript strict, tanpa explicit `any` pada source aplikasi, komponen terpisah, regression test, dan live API/RLS verifier. |
| Deployment | Aplikasi berjalan di Vercel dan terhubung ke project Supabase sendiri. |

## Approach

Keputusan teknis utama yang paling saya prioritaskan adalah menjadikan verified session dan Row Level Security sebagai dua lapis ownership boundary. Route handler mengambil identitas melalui `supabase.auth.getUser()` dan tidak menerima `user_id` dari client, lalu query tetap dijalankan memakai Supabase client milik session user agar policy `auth.uid()` berlaku. Nominal disimpan sebagai PostgreSQL `bigint`, diekspos sebagai decimal string, dan dihitung menggunakan `BigInt` supaya format Rupiah, summary, serta Net tetap presisi meskipun nilainya melewati `Number.MAX_SAFE_INTEGER`.

## Fitur utama

### Auth dan session

- Signup dan login menggunakan email/password.
- Callback `/auth/confirm` menangani email confirmation.
- Session disimpan di cookies dan direfresh melalui Next.js proxy.
- User tanpa session diarahkan ke `/login`; user yang sudah login tidak kembali ke halaman auth.
- Logout menghapus session dan kembali ke halaman login.

### Dashboard dan business logic

- Summary **Dihutang ke saya**, **Saya hutang**, dan **Net** hanya menghitung kasbon belum lunas.
- Net dihitung sebagai `owed_to_me - i_owe` dan selalu disertai tanda serta keterangan arah, sehingga tidak bergantung pada warna saja.
- Nominal tampil dengan locale `id-ID`, misalnya `Rp 1.234.000`.
- Input nominal menampilkan prefix Rupiah dan pemisah ribuan, tetapi tetap dikirim sebagai decimal string.
- Tanggal tampil secara relatif seperti “kemarin” atau “3 hari lagi”, dengan tanggal absolut sebagai konteks.
- Filter status dan tipe dapat dikombinasikan.
- Create, edit, settle/unsettle, dan delete selalu dikonfirmasi server lalu melakukan refetch.
- Status lunas disimpan pada `settled_at`; refresh browser tidak mengembalikannya ke state lama.
- Settle bersifat idempotent: request berulang mempertahankan timestamp settlement pertama.
- Delete memakai dialog konfirmasi dan response ownership-safe.

### Bonus

Seluruh bonus pada brief sudah diimplementasikan:

| Bonus | Implementasi |
|---|---|
| Search nama | Case-insensitive, debounce 300 ms, clear action, dan dijalankan di database. |
| Sort jumlah/tanggal | Sort `amount bigint` dan `due_date` di PostgreSQL dengan tie-breaker `created_at`. |
| Group per orang | Normalisasi nama case-insensitive, jumlah entry, jumlah outstanding, total tiap arah, dan accordion yang tetap memiliki action CRUD. |
| Bar chart | Dua horizontal bar outstanding dengan label dan nilai Rupiah; rasio dihitung memakai `BigInt` tanpa chart library. |
| UI states | Loading, database kosong, hasil filter/search kosong, fetch error, dan mutation feedback ditangani terpisah. |
| Mobile-first | Summary responsive, control dapat wrap tanpa overflow, target sentuh minimal 44px, dan modal keyboard-friendly. |

## Arsitektur dan data flow

```text
Browser
  -> Next.js Server Action / Route Handler
  -> Supabase client dengan session user
  -> Row Level Security
  -> PostgreSQL public.debts
```

Aturan penting:

- `user_id` selalu berasal dari verified session.
- Aplikasi user-facing hanya memakai publishable key; tidak ada service-role client pada request aplikasi.
- Search, status, tipe, dan sorting hanya memengaruhi list. Summary dan chart tetap mewakili seluruh outstanding debt user.
- Amount keluar dari API sebagai decimal string dan tidak dikonversi menjadi JavaScript `number`.
- `settled_at = NULL` berarti belum lunas; timestamp berarti lunas.
- Missing row dan row milik user lain menghasilkan response `404` yang sama.

## API

| Method | Endpoint | Fungsi | Success |
|---|---|---|---|
| `GET` | `/api/debts?status=all&type=all&q=budi&sort=newest` | List, filter, search, sort, dan summary milik user | `200` |
| `POST` | `/api/debts` | Membuat kasbon baru | `201` |
| `PATCH` | `/api/debts/[id]` | Mengedit atau settle/unsettle | `200` |
| `DELETE` | `/api/debts/[id]` | Menghapus kasbon | `200` |

Parameter GET:

- `status=all|unsettled|settled`
- `type=all|owed_to_me|i_owe`
- `q=<nama>` dengan panjang maksimal 100 karakter
- `sort=newest|amount_desc|amount_asc|due_asc|due_desc`

Semua endpoint memerlukan session. Error menggunakan JSON Bahasa Indonesia dengan `400` untuk input invalid, `401` untuk session tidak tersedia, `404` untuk row tidak ada/tidak dapat diakses, dan `500` untuk kegagalan tak terduga.

## Database dan RLS

Migration berada di `supabase/migrations/`:

- `0001_create_debts.sql` membuat enum, tabel `public.debts`, constraint, index, trigger, grants, dan policy RLS.
- `0002_add_debt_amount_text.sql` menambahkan generated text representation untuk menjaga precision `bigint` saat melalui JSON.

Policy role `authenticated` membatasi SELECT, INSERT, UPDATE, dan DELETE dengan ownership guard `auth.uid() = user_id`. UPDATE menggunakan `USING` dan `WITH CHECK`, sehingga user tidak dapat mengambil atau memindahkan ownership row.

## Stack

- Next.js 16 App Router, React 19, dan TypeScript strict.
- Tailwind CSS v4 untuk styling.
- Supabase PostgreSQL, Auth, `@supabase/supabase-js`, dan `@supabase/ssr`.
- Lucide React untuk ikon yang konsisten.
- Node.js built-in test runner agar regression suite tidak membutuhkan testing framework tambahan.

Tidak ada chart library karena chart MVP cukup direpresentasikan oleh dua bar aksesibel. Dependency tambahan hanya dipakai jika memberi fungsi yang tidak praktis dibuat sendiri.

## Menjalankan secara lokal

Prasyarat:

- Node.js 20.9 atau lebih baru.
- pnpm.
- Supabase project.

Install dependency:

```bash
pnpm install
```

Salin `.env.example` menjadi `.env.local`, kemudian isi konfigurasi aplikasi:

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

Jangan menaruh secret/service-role key pada variable `NEXT_PUBLIC_*`, source aplikasi, atau repository.

Link Supabase CLI dan terapkan migration:

```bash
pnpm exec supabase link --project-ref <project-ref>
pnpm exec supabase db push
```

Pada Supabase Authentication URL Configuration:

- Site URL lokal: `http://localhost:3000`
- Redirect URL lokal: `http://localhost:3000/auth/confirm`
- Site URL production: origin Vercel tanpa trailing slash
- Redirect URL production: `https://<domain-vercel>/auth/confirm`

Jalankan aplikasi:

```bash
pnpm dev
```

Buka [http://localhost:3000](http://localhost:3000).

## Verifikasi

Quality checks lokal:

```bash
pnpm test
pnpm lint
pnpm typecheck
pnpm build
```

Regression suite memeriksa validator create/update, precision `BigInt`, summary dan Net, filter/search/sort parser, grouping, bar width, format Rupiah, tanggal relatif, serta static assertion migration RLS.

Untuk live verification, jalankan aplikasi dan isi dua akun Supabase berbeda yang sudah confirmed:

```env
APP_BASE_URL=http://localhost:3000
SUPABASE_TEST_USER_A_EMAIL=
SUPABASE_TEST_USER_A_PASSWORD=
SUPABASE_TEST_USER_B_EMAIL=
SUPABASE_TEST_USER_B_PASSWORD=
```

Kemudian jalankan:

```bash
pnpm verify:live
```

Verifier membuat fixture unik dan membersihkannya dalam `finally`. Cakupannya:

- unauthenticated request menghasilkan `401`;
- payload, filter, UUID, dan JSON invalid menghasilkan `400`;
- authenticated CRUD serta precision nominal;
- search, sorting, dan kombinasi filter;
- settlement persistence dan timestamp idempotent;
- user A tidak dapat membaca, insert atas nama, update, atau delete row user B melalui Supabase REST;
- missing ID dan inaccessible ID menghasilkan bentuk `404` yang sama.

## Guard terhadap auto-reject

| Risiko pada brief | Guard dan bukti |
|---|---|
| RLS bocor | Owner-only policy untuk empat operasi serta verifier REST dua user. |
| Format Rupiah salah | Satu formatter `id-ID`, amount berbentuk string, dan test nilai di atas safe integer. |
| “Tandai lunas” hanya di client | PATCH menyimpan `settled_at` di PostgreSQL dan dashboard refetch dari server. |
| `any` di mana-mana | TypeScript strict; boundary eksternal dimulai sebagai `unknown` lalu divalidasi. |
| Mock/hardcode production | Dashboard hanya membaca authenticated API dan Supabase; verifier memakai fixture sementara. |
| Deploy tidak berjalan | Link Vercel aktif tersedia di bagian atas README. |
| Tidak memahami kode | Data flow, kontrak API, precision, RLS, idempotence, dan trade-off dijelaskan di README serta commit dipisahkan per fitur. |

## Trade-off: jika ada satu hari lagi

Prioritas pertama adalah memindahkan kalkulasi summary menjadi agregasi PostgreSQL/RPC dan menambahkan cursor pagination, sehingga API tidak perlu membaca seluruh row outstanding ketika data user bertambah. Berikutnya saya akan menambahkan browser end-to-end test untuk flow email confirmation, keyboard/focus modal, date picker, grouping, dan CRUD pada viewport mobile. Sisa waktu digunakan untuk soft delete agar kesalahan hapus dapat dipulihkan tanpa mengurangi ownership isolation.

## Time spent

Project dikerjakan selama dua hari kalender dalam 11 tahap implementasi, termasuk setup, schema/RLS, auth, CRUD, UI polish, bonus, deployment, dan live verification. Jam efektif tidak dicatat sejak awal; commit history digunakan sebagai catatan progres yang jujur dan dapat direview.

## Struktur project

```text
app/                  halaman, server actions, dan route handlers
components/           auth form, dashboard, modal, chart, dan debt list
lib/debts/            types, validation, formatting, filter, grouping, dan summary
lib/supabase/         typed browser/server Supabase clients
supabase/migrations/  versioned schema dan RLS
tests/                regression tests
scripts/              live API dan cross-user RLS verifier
docs/                 brief, PRD, ERD, design, dan implementation plan
```
