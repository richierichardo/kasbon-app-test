import { HandCoins } from "lucide-react";

import { AuthForm } from "@/components/auth/auth-form";
import { signUp } from "@/app/auth/actions";

export default function SignupPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-mist px-6 py-12 text-forest">
      <section className="w-full max-w-md rounded-3xl border-2 border-leaf bg-mist p-6 sm:p-8">
        <div className="mb-8 flex flex-col gap-3">
          <HandCoins aria-hidden="true" className="text-sage" size={36} />
          <p className="text-sm font-semibold uppercase tracking-[0.2em]">
            Kasbon
          </p>
          <h1 className="text-3xl font-bold">Buat akun baru</h1>
          <p>Mulai catat siapa yang hutang ke kamu dan sebaliknya.</p>
        </div>
        <AuthForm action={signUp} mode="signup" />
      </section>
    </main>
  );
}
