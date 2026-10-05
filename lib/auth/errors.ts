export function getAuthErrorMessage(error: unknown): string {
  const message = error instanceof Error ? error.message.toLowerCase() : "";

  if (message.includes("invalid login credentials")) {
    return "Email atau password belum benar.";
  }

  if (message.includes("email not confirmed")) {
    return "Email kamu belum dikonfirmasi. Cek inbox lalu coba lagi.";
  }

  if (
    message.includes("already registered") ||
    message.includes("user already exists")
  ) {
    return "Email ini sudah terdaftar. Coba masuk atau pakai email lain.";
  }

  if (message.includes("password")) {
    return "Password minimal 6 karakter.";
  }

  if (message.includes("email")) {
    return "Masukkan alamat email yang valid.";
  }

  return "Ada kendala saat memproses akun. Coba lagi sebentar.";
}
