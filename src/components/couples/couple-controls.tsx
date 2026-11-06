"use client";

import { useState } from "react";
import { createCouple, createCoupleInvite, acceptCoupleInvite } from "@/actions/couples";

export function CoupleControls({ mode, token }: { mode: "create" | "invite" | "accept"; token?: string }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [link, setLink] = useState("");
  const [sharePrevious, setSharePrevious] = useState(false);
  async function run() {
    setBusy(true);
    setError("");
    try {
      if (mode === "create") {
        const result = await createCouple();
        if (!result.success) setError(result.error);
        else window.location.reload();
      } else if (mode === "invite") {
        const result = await createCoupleInvite();
        if (!result.success) setError(result.error);
        else setLink(window.location.origin + result.data.url);
      } else if (token) {
        const result = await acceptCoupleInvite(token, sharePrevious);
        if (!result.success) setError(result.error);
        else window.location.assign("/couple");
      }
    } catch {
      setError("Ocorreu um erro. Tente novamente.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="space-y-4">
      {mode === "accept" && (
        <fieldset className="space-y-3 rounded-xl border p-4">
          <legend className="px-2 font-medium">Suas lembranças anteriores</legend>
          <label className="flex gap-2 items-start">
            <input type="radio" name="history" checked={!sharePrevious} onChange={() => setSharePrevious(false)} />
            <span>Manter privadas (recomendado)</span>
          </label>
          <label className="flex gap-2 items-start">
            <input type="radio" name="history" checked={sharePrevious} onChange={() => setSharePrevious(true)} />
            <span>Autorizar compartilhamento futuro do meu histórico</span>
          </label>
          <p className="text-sm text-muted-foreground">Por segurança, esta versão registra sua preferência, mas ainda não compartilha as lembranças antigas. Isso será ativado após a atualização das permissões e do Storage.</p>
        </fieldset>
      )}
      <button type="button" disabled={busy} onClick={run}
        className="rounded-xl bg-primary px-5 py-3 text-primary-foreground disabled:opacity-50">
        {busy ? "Aguarde..." : mode === "create" ? "Criar espaço do casal" : mode === "invite" ? "Gerar link de convite" : "Aceitar convite"}
      </button>
      {link && <div className="space-y-2"><p className="text-sm">Copie e envie este link ao seu parceiro:</p><input aria-label="Link de convite" className="w-full rounded border bg-background p-2 text-sm" readOnly value={link} onFocus={(e) => e.target.select()} /></div>}
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
    </div>
  );
}
