"use client";

import Link from "next/link";
import { useState } from "react";
import { CalendarDays, Camera, Download, Heart, MapPin, NotebookPen, Share2, Star } from "lucide-react";
import { toast } from "sonner";
import { retrospectivePng, saveBlob } from "@/lib/retrospective-card";
import type { RetrospectiveData } from "@/lib/queries/retrospectives";

const MONTHS = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

function readableDate(day: string): string {
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: "UTC", day: "numeric", month: "short", year: "numeric",
  }).format(new Date(day + "T00:00:00Z"));
}

export function RetrospectiveScreen({ data, latestYear }: {
  data: RetrospectiveData;
  latestYear: number;
}) {
  const [working, setWorking] = useState(false);
  const rating = data.averageRating === null ? "—" : data.averageRating.toFixed(1).replace(".", ",");
  const filename = `memories-retrospectiva-${data.year}-${data.mode === "month" ? String(data.month).padStart(2, "0") : "ano"}.png`;
  const peak = Math.max(1, ...data.datesByMonth.map((item) => item.count));

  async function exportCard(share: boolean) {
    setWorking(true);
    try {
      const blob = await retrospectivePng(data);
      if (share && typeof navigator.share === "function") {
        const file = new File([blob], filename, { type: "image/png" });
        if (!navigator.canShare || navigator.canShare({ files: [file] })) {
          try {
            await navigator.share({ files: [file], title: "Nossa retrospectiva — Memories" });
            return;
          } catch (error) {
            if (error instanceof DOMException && error.name === "AbortError") return;
            // File sharing is not available in every browser; save the image instead.
          }
        }
      }
      saveBlob(blob, filename);
      toast.success(share ? "Cartão salvo. Envie a imagem para quem desejar." : "Cartão PNG salvo.");
    } catch (error) {
      console.error("[retrospectives/exportCard]", error);
      toast.error("Não foi possível gerar a imagem neste navegador.");
    } finally {
      setWorking(false);
    }
  }

  return (
    <div className="space-y-9">
      <header className="space-y-2">
        <span className="text-xs uppercase tracking-[0.2em] text-primary">nossa história em capítulos</span>
        <h1 className="font-display italic text-4xl md:text-6xl text-gradient">retrospectivas</h1>
        <p className="text-sm text-muted-foreground">
          Reviva cada mês ou ano pelas memórias que você registrou. O resumo não publica seus dados automaticamente.
        </p>
      </header>

      <form method="get" action="/retrospectives" className="flex flex-wrap gap-3 items-end rounded-2xl border bg-card p-4">
        <label className="space-y-1 text-sm">
          <span>Visão</span>
          <select name="mode" defaultValue={data.mode} className="block rounded-xl border bg-background p-3">
            <option value="month">Mensal</option>
            <option value="year">Anual</option>
          </select>
        </label>
        <label className="space-y-1 text-sm">
          <span>Ano</span>
          <select name="year" defaultValue={String(data.year)} className="block rounded-xl border bg-background p-3">
            {Array.from({ length: latestYear - 1999 }, (_, idx) => latestYear - idx)
              .map((year) => <option key={year} value={year}>{year}</option>)}
          </select>
        </label>
        <label className="space-y-1 text-sm">
          <span>Mês (para visão mensal)</span>
          <select name="month" defaultValue={String(data.month)} className="block rounded-xl border bg-background p-3">
            {MONTHS.map((label, index) => <option key={label} value={index + 1}>{label}</option>)}
          </select>
        </label>
        <button type="submit" className="rounded-xl bg-primary px-5 py-3 text-sm text-primary-foreground">
          Ver retrospectiva
        </button>
      </form>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <section className="rounded-3xl border bg-card p-5 sm:p-7 space-y-5">
          <p className="text-xs uppercase tracking-widest text-primary">{data.mode === "year" ? "ano especial" : "capítulo do mês"}</p>
          <h2 className="font-display italic text-3xl capitalize">{data.label}</h2>
          <div className="grid grid-cols-3 gap-3">
            {[
              { value: data.totalDates, label: "encontros", icon: Heart },
              { value: data.totalPhotos, label: "fotos", icon: Camera },
              { value: data.totalNotes, label: "notinhas", icon: NotebookPen },
            ].map((item) => {
              const Icon = item.icon;
              return (
                <div key={item.label} className="rounded-2xl bg-muted/50 p-3 space-y-2">
                  <Icon className="size-5 text-primary" />
                  <p className="font-display text-3xl">{item.value}</p>
                  <p className="text-xs text-muted-foreground">{item.label}</p>
                </div>
              );
            })}
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <p className="flex items-center gap-2 text-sm"><Star className="size-4 text-primary" /> Nota média: <strong>{rating}</strong></p>
            <p className="flex items-center gap-2 text-sm"><MapPin className="size-4 text-primary" /> Lugar frequente: <strong className="break-words">{data.topCity ?? "—"}</strong></p>
          </div>
          <div className="border-t pt-4 space-y-2">
            <h3 className="font-display text-xl">Momento marcante</h3>
            {data.bestMoment ? (
              <Link href={"/dates/" + data.bestMoment.id}
                className="block rounded-xl border p-3 hover:border-primary/40">
                <strong className="text-sm">{data.bestMoment.title}</strong>
                <span className="block text-xs text-muted-foreground mt-1">{readableDate(data.bestMoment.day)}</span>
              </Link>
            ) : <p className="text-sm text-muted-foreground">Ainda sem encontros registrados neste período.</p>}
          </div>

          {data.mode === "year" && (
            <div className="border-t pt-5 space-y-3">
              <h3 className="font-display text-xl">Nossa história mês a mês</h3>
              <div className="grid grid-cols-12 gap-1.5 items-end min-h-32" role="img"
                aria-label={data.datesByMonth.map((item) => item.label + ": " + item.count + " encontros").join(", ")}>
                {data.datesByMonth.map((item, idx) => (
                  <div key={idx} className="space-y-2 text-center">
                    <div className="h-24 flex items-end">
                      <div className="w-full rounded-t-md bg-primary/70 min-h-1" style={{ height: Math.max(4, (item.count / peak) * 100) + "%" }} />
                    </div>
                    <span className="block text-[10px] text-muted-foreground">{item.label.slice(0, 1).toUpperCase()}</span>
                  </div>
                ))}
              </div>
              <p className="text-xs text-muted-foreground">Quantidade de encontros por mês.</p>
            </div>
          )}
        </section>

        <section className="space-y-4">
          <h2 className="font-display text-xl">Seu cartão de retrospectiva</h2>
          <div aria-label={"Prévia do cartão: " + data.label}
            className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#411e39] via-[#7a3856] to-[#bd6b70] px-6 py-10 text-center text-[#fff8ed] shadow-lg space-y-6">
            <div className="absolute -right-16 -top-16 size-56 rounded-full bg-[#f5cbbb]/10 blur-2xl" aria-hidden />
            <p className="relative text-xs uppercase tracking-[0.35em] text-[#f5d3c4]">Memories</p>
            <h3 className="relative font-display italic text-3xl">Nossa história</h3>
            <p className="relative font-display italic text-xl text-[#ffddd0] capitalize">{data.label}</p>
            <Heart className="relative mx-auto size-14 fill-[#f3b2ad] text-[#f3b2ad]" />
            <div className="relative grid grid-cols-3 gap-2 border-b border-[#f5d3c4]/40 pb-6">
              {[
                [data.totalDates, "encontros"],
                [data.totalPhotos, "fotos"],
                [data.totalNotes, "notinhas"],
              ].map(([value, label]) => (
                <div key={label}><p className="font-display text-4xl">{value}</p><p className="text-xs text-[#f6c9c3]">{label}</p></div>
              ))}
            </div>
            <p className="relative text-xs uppercase tracking-widest text-[#f6c9c3]">Momento marcante</p>
            <p className="relative font-display italic text-xl break-words">{data.bestMoment?.title ?? "Cada momento merece ser lembrado."}</p>
            <p className="relative text-xs text-[#ffddd0]">Nota média {rating} · {data.topCity ?? "Mais lugares para descobrir"}</p>
            <p className="relative font-display italic text-sm text-[#f6c9c3]">As melhores memórias continuam sendo nossas.</p>
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            <button type="button" disabled={working} onClick={() => exportCard(false)}
              className="flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm text-primary-foreground disabled:opacity-50">
              <Download className="size-4" /> {working ? "Gerando..." : "Baixar cartão PNG"}
            </button>
            <button type="button" disabled={working} onClick={() => exportCard(true)}
              className="flex items-center justify-center gap-2 rounded-xl border px-4 py-3 text-sm disabled:opacity-50">
              <Share2 className="size-4" /> Compartilhar
            </button>
          </div>
          <p className="text-xs text-muted-foreground">
            Compartilhar é opcional. O cartão só contém os números, o lugar e o destaque exibidos na prévia. Nenhuma foto ou anotação privada é enviada a um servidor de compartilhamento.
          </p>
        </section>
      </div>

      <section className="space-y-3">
        <h2 className="font-display text-2xl">Encontros deste período</h2>
        {data.highlights.length === 0 ? (
          <p className="text-sm text-muted-foreground">Ainda não existem encontros neste período. Sua próxima lembrança pode começar hoje.</p>
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            {data.highlights.map((item) => (
              <Link href={"/dates/" + item.id} key={item.id} className="rounded-2xl border bg-card p-4 hover:border-primary/40">
                <p className="font-medium text-sm">{item.title}</p>
                <p className="flex items-center gap-1 text-xs text-muted-foreground mt-2">
                  <CalendarDays className="size-3.5" /> {readableDate(item.day)}
                </p>
              </Link>
            ))}
          </div>
        )}
      </section>
      <p className="text-xs text-muted-foreground">
        Por privacidade, esta primeira versão mostra somente as lembranças ativas criadas pela sua conta. Ainda não reúne automaticamente o histórico privado do parceiro.
      </p>
    </div>
  );
}
