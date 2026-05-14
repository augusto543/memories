"use client";

import * as React from "react";
import { useSearchParams } from "next/navigation";
import { AlertCircle } from "lucide-react";

const ERRORS: Record<string, string> = {
  auth_callback_failed: "Não conseguimos completar o login. Tente novamente.",
  access_denied: "Acesso negado. Você pode tentar com outra conta.",
};

export function LoginError() {
  const searchParams = useSearchParams();
  const error = searchParams.get("error");
  if (!error) return null;

  const message = ERRORS[error] ?? "Erro inesperado durante o login.";

  return (
    <div className="mb-4 flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
      <AlertCircle className="mt-0.5 size-4 shrink-0" />
      <span>{message}</span>
    </div>
  );
}
