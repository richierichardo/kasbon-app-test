import { HandCoins } from "lucide-react";

export default function Home() {
  return (
    <main className="min-h-screen bg-mist px-6 py-12 text-forest">
      <section className="mx-auto flex max-w-3xl flex-col gap-6">
        <div className="flex items-center gap-3">
          <HandCoins aria-hidden="true" className="text-sage" size={32} />
          <p className="text-sm font-semibold uppercase tracking-[0.2em]">
            Kasbon
          </p>
        </div>
        <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
          Catatan kasbon yang simpel.
        </h1>
        <p className="max-w-xl text-lg">
          Bootstrap aplikasi selesai. Fitur autentikasi dan pencatatan utang
          akan dibangun di langkah berikutnya.
        </p>
      </section>
    </main>
  );
}
