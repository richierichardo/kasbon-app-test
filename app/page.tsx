import { HandCoins } from "lucide-react";

import { signOut } from "@/app/auth/actions";
import { DashboardClient } from "@/components/dashboard/dashboard-client";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export default async function Home() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  return (
    <main className="min-h-screen bg-mist text-forest">
      <header className="bg-forest px-6 py-4 text-mist">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <HandCoins aria-hidden="true" className="text-sage" size={28} />
            <p className="font-bold">Kasbon</p>
          </div>
          <form action={signOut}>
            <button
              type="submit"
              className="rounded-lg px-3 py-2 font-semibold underline focus:outline-2 focus:outline-sage"
            >
              Keluar
            </button>
          </form>
        </div>
      </header>
      <DashboardClient userEmail={user.email ?? "akun kamu"} />
    </main>
  );
}
