"use server";

import { redirect } from "next/navigation";
import { headers } from "next/headers";

import { getAuthErrorMessage } from "@/lib/auth/errors";
import { createClient } from "@/lib/supabase/server";

const MIN_PASSWORD_LENGTH = 6;

export type AuthFormState = {
  error?: string;
  message?: string;
  email?: string;
};

function readTextField(formData: FormData, field: string): string {
  const value = formData.get(field);
  return typeof value === "string" ? value.trim() : "";
}

function validateCredentials(
  email: string,
  password: string,
): string | undefined {
  if (!email || !email.includes("@")) {
    return "Masukkan alamat email yang valid.";
  }

  if (!password || password.length < MIN_PASSWORD_LENGTH) {
    return "Password minimal 6 karakter.";
  }

  return undefined;
}

export async function signIn(
  _previousState: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const email = readTextField(formData, "email");
  const password = readTextField(formData, "password");
  const validationError = validateCredentials(email, password);

  if (validationError) {
    return { error: validationError, email };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    return { error: getAuthErrorMessage(error), email };
  }

  redirect("/");
}

export async function signUp(
  _previousState: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const email = readTextField(formData, "email");
  const password = readTextField(formData, "password");
  const validationError = validateCredentials(email, password);

  if (validationError) {
    return { error: validationError, email };
  }

  const supabase = await createClient();
  const requestHeaders = await headers();
  const configuredSiteUrl = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "");
  const requestOrigin = requestHeaders.get("origin")?.replace(/\/$/, "");
  const siteUrl = configuredSiteUrl || requestOrigin;
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: siteUrl
      ? { emailRedirectTo: `${siteUrl}/auth/confirm` }
      : undefined,
  });

  if (error) {
    return { error: getAuthErrorMessage(error), email };
  }

  if (data.session) {
    redirect("/");
  }

  return {
    email,
    message: "Akun dibuat. Cek email kamu untuk mengonfirmasi akun.",
  };
}

export async function signOut(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
