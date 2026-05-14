import { Suspense } from "react";
import type { Metadata } from "next";
import { Heart } from "lucide-react";
import { GoogleButton } from "@/components/auth/google-button";
import { LoginError } from "@/components/auth/login-error";

export const metadata: Metadata = {
  title: "Entrar",
};

export default function LoginPage() {
  return (
    <main className="relative min-h-screen overflow-hidden bg-background">
      {/* Background aurora gradient */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-aurora opacity-100"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-noise opacity-[0.015]"
      />

      <div className="relative z-10 flex min-h-screen items-center justify-center px-4">
        <div className="w-full max-w-sm">
          {/* Logo / heading */}
          <div className="mb-10 text-center">
            <div className="mb-6 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 ring-1 ring-primary/20">
              <Heart className="size-6 text-primary" fill="currentColor" />
            </div>
            <h1 className="font-display text-5xl tracking-tight">
              <span className="text-gradient">Memories</span>
            </h1>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
              Um diário privado para os
              <br />
              momentos que importam.
            </p>
          </div>

          {/* Card de login */}
          <div className="relative rounded-2xl border bg-card/60 p-6 backdrop-blur-xl shadow-xl shadow-black/5">
            <Suspense fallback={null}>
              <LoginError />
            </Suspense>
            <Suspense
              fallback={
                <div className="h-11 w-full animate-pulse rounded-lg bg-secondary" />
              }
            >
              <GoogleButton className="w-full" />
            </Suspense>

            <p className="mt-6 text-center text-xs text-muted-foreground/80">
              Ao entrar, você concorda em guardar suas memórias
              <br />
              com privacidade total.
            </p>
          </div>

          <p className="mt-8 text-center text-xs text-muted-foreground/60">
            ✨ Construído com amor
          </p>
        </div>
      </div>
    </main>
  );
}
