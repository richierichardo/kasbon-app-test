"use client";

import { LogIn, UserPlus } from "lucide-react";
import Link from "next/link";
import { useActionState } from "react";

import type { AuthFormState } from "@/app/auth/actions";

type AuthFormProps = {
  action: (
    previousState: AuthFormState,
    formData: FormData,
  ) => Promise<AuthFormState>;
  mode: "login" | "signup";
  initialError?: string;
};

export function AuthForm({ action, mode, initialError }: AuthFormProps) {
  const [state, formAction, pending] = useActionState(action, {
    error: initialError,
  });
  const isLogin = mode === "login";

  return (
    <form action={formAction} className="flex flex-col gap-5">
      <div className="flex flex-col gap-2">
        <label htmlFor={`${mode}-email`} className="font-semibold">
          Email
        </label>
        <input
          id={`${mode}-email`}
          name="email"
          type="email"
          autoComplete="email"
          defaultValue={state.email}
          required
          className="min-h-12 rounded-xl border-2 border-cashmere bg-linen px-4 text-woody outline-none focus:border-woody focus:outline-2 focus:outline-woody"
        />
      </div>

      <div className="flex flex-col gap-2">
        <label htmlFor={`${mode}-password`} className="font-semibold">
          Password
        </label>
        <input
          id={`${mode}-password`}
          name="password"
          type="password"
          autoComplete={isLogin ? "current-password" : "new-password"}
          minLength={6}
          required
          className="min-h-12 rounded-xl border-2 border-cashmere bg-linen px-4 text-woody outline-none focus:border-woody focus:outline-2 focus:outline-woody"
        />
        {!isLogin && <p className="text-sm">Minimal 6 karakter.</p>}
      </div>

      {state.error && (
        <p role="alert" className="rounded-xl bg-cashmere p-3 font-semibold">
          {state.error}
        </p>
      )}

      {state.message && (
        <p role="status" className="rounded-xl bg-cashmere p-3 font-semibold">
          {state.message}
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        aria-busy={pending}
        className="flex min-h-12 items-center justify-center gap-2 rounded-xl bg-toast px-5 font-bold text-woody focus:outline-2 focus:outline-woody disabled:cursor-wait disabled:bg-cashmere"
      >
        {isLogin ? (
          <LogIn aria-hidden="true" size={19} />
        ) : (
          <UserPlus aria-hidden="true" size={19} />
        )}
        {pending ? "Sebentar..." : isLogin ? "Masuk" : "Buat akun"}
      </button>

      <p className="text-center text-sm">
        {isLogin ? "Belum punya akun?" : "Sudah punya akun?"}{" "}
        <Link
          href={isLogin ? "/signup" : "/login"}
          className="font-bold underline focus:outline-2 focus:outline-woody"
        >
          {isLogin ? "Daftar" : "Masuk"}
        </Link>
      </p>
    </form>
  );
}
