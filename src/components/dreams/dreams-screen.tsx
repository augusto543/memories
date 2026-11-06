"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import {
  CalendarDays, Check, Compass, Heart, Pencil, Plus, Sparkles, Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { changeDreamStatus, deleteDream, saveDream, type DreamInput, type DreamStatus } from "@/actions/dreams";
import type { CoupleDreamRow } from "@/types/database";
import { cn } from "@/lib/utils";

type Category = CoupleDreamRow["category"];
type Filter = "todos" | DreamStatus;

const CATEGORIES: { value: Category; label: string }[] = [
  { value: "viagem", label: "Viagem" },
  { value: "encontro", label: "Encontro" },
  { value: "aventura", label: "Aventura" },
  { value: "projeto", label: "Projeto" },
  { value: "outro", label: "Outro" },
];

const STATUSES: { value: DreamStatus; label: string }[] = [
  { value: "sonho", label: "Sonhamos" },
  { value: "planejado", label: "Planejamos" },
  { value: "realizado", label: "Realizamos" },
];

type Draft = DreamInput;
const emptyDraft = (): Draft => ({
  title: "", details: "", category: "viagem", status: "sonho", targetDate: "",
});

export function DreamsScreen({ viewerId, coupleId, dreams }: {
  viewerId: string;
  coupleId: string | null;
  dreams: CoupleDreamRow[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [filter, setFilter] = useState<Filter>("todos");
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<Draft>(emptyDraft);

  const stats = useMemo(() => ({
    total: dreams.length,
    done: dreams.filter((d) => d.status === "realizado").length,
    planned: dreams.filter((d) => d.status === "planejado").length,
  }), [dreams]);
  const visible = dreams.filter((dream) => filter === "todos" || dream.status === filter);
  const progress = stats.total ? Math.round((stats.done / stats.total) * 100) : 0;

  function create() {
    setDraft(emptyDraft());
    setEditing(true);
  }

  function edit(dream: CoupleDreamRow) {
    setDraft({
      id: dream.id, title: dream.title, details: dream.details ?? "",
      category: dream.category, status: dream.status, targetDate: dream.target_date ?? "",
    });
    setEditing(true);
  }

  function save() {
    startTransition(async () => {
      const result = await saveDream(draft);
      if (!result.ok) { toast.error(result.error); return; }
      toast.success(draft.id ? "Plano atualizado!" : "Mais um sonho para viver juntos! ✨");
      setEditing(false);
      router.refresh();
    });
  }

  function updateStatus(id: string, status: DreamStatus) {
    startTransition(async () => {
      const result = await changeDreamStatus({ id, status });
      if (!result.ok) { toast.error(result.error); return; }
      toast.success(status === "realizado" ? "Sonho realizado! 💗" : "Progresso atualizado.");
      router.refresh();
    });
  }

  function remove(id: string) {
    if (!window.confirm("Ocultar este sonho? Ele continuará guardado no banco para recuperação.")) return;
    startTransition(async () => {
      const result = await deleteDream({ id });
      if (!result.ok) { toast.error(result.error); return; }
      toast.success("Sonho ocultado.");
      router.refresh();
    });
  }

  if (!coupleId) {
    return (
      <div className="mx-auto max-w-2xl space-y-5 py-8">
        <h1 className="font-display italic text-4xl md:text-6xl text-gradient">sonhos e planos</h1>
        <div className="rounded-3xl border bg-card p-6 space-y-4">
          <Heart className="size-9 text-primary" />
          <h2 className="font-display text-2xl">Tudo que ainda vamos viver</h2>
          <p className="text-sm text-muted-foreground">
            A lista de sonhos é compartilhada com seu par. Crie um espaço do casal ou aceite um convite para começar.
          </p>
          <Link href="/couple" className="inline-block rounded-xl bg-primary px-5 py-3 text-sm text-primary-foreground">
            Ir para nosso espaço
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <header className="space-y-3">
        <span className="text-xs uppercase tracking-[0.2em] text-primary">nosso futuro</span>
        <h1 className="font-display italic text-4xl md:text-6xl text-gradient">sonhos e planos</h1>
        <p className="max-w-xl text-sm text-muted-foreground">
          Uma lista só nossa de lugares para conhecer, encontros para ter e experiências para transformar em lembranças.
        </p>
      </header>

      <section className="grid grid-cols-3 gap-3" aria-label="Progresso dos sonhos">
        {[
          { value: stats.total, label: "Sonhos" },
          { value: stats.planned, label: "Planejados" },
          { value: stats.done, label: "Realizados" },
        ].map((item) => (
          <div key={item.label} className="rounded-2xl border bg-card p-4">
            <p className="font-display text-3xl text-primary">{item.value}</p>
            <p className="text-xs text-muted-foreground">{item.label}</p>
          </div>
        ))}
      </section>
      {stats.total > 0 && (
        <div className="space-y-2">
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Nossa lista de conquistas</span><span>{progress}% realizado</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-muted">
            <div className="h-full rounded-full bg-primary transition-all" style={{ width: progress + "%" }} />
          </div>
        </div>
      )}

      <div className="flex flex-wrap gap-3 items-center justify-between">
        <div role="group" aria-label="Filtrar sonhos" className="flex flex-wrap gap-2">
          {([{ value: "todos", label: "Todos" }, ...STATUSES] as { value: Filter; label: string }[]).map((item) => (
            <button key={item.value} type="button" onClick={() => setFilter(item.value)}
              aria-pressed={filter === item.value}
              className={cn(
                "rounded-full border px-3 py-2 text-xs transition",
                filter === item.value ? "bg-primary text-primary-foreground border-primary" : "text-muted-foreground hover:border-primary/40"
              )}>
              {item.label}
            </button>
          ))}
        </div>
        <button type="button" onClick={create} className="flex gap-2 items-center rounded-xl bg-primary px-4 py-2.5 text-sm text-primary-foreground">
          <Plus className="size-4" /> Novo sonho
        </button>
      </div>

      {editing && (
        <section className="rounded-3xl border bg-card p-5 sm:p-6 space-y-4" aria-label="Editar sonho">
          <h2 className="font-display text-2xl">{draft.id ? "Editar nosso plano" : "Adicionar um sonho"}</h2>
          <label className="block space-y-1 text-sm">O que queremos viver?
            <input maxLength={120} value={draft.title} onChange={(e) => setDraft((d) => ({ ...d, title: e.target.value }))}
              placeholder="Ver o pôr do sol na praia, fazer uma viagem..." className="block w-full rounded-xl border bg-background p-3" />
          </label>
          <label className="block space-y-1 text-sm">Detalhes (opcional)
            <textarea maxLength={1500} rows={3} value={draft.details}
              onChange={(e) => setDraft((d) => ({ ...d, details: e.target.value }))}
              placeholder="O que torna esse sonho especial?" className="block w-full rounded-xl border bg-background p-3" />
          </label>
          <div className="grid gap-3 sm:grid-cols-3">
            <label className="block space-y-1 text-sm">Categoria
              <select value={draft.category} onChange={(e) => setDraft((d) => ({ ...d, category: e.target.value as Category }))}
                className="block w-full rounded-xl border bg-background p-3">
                {CATEGORIES.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
              </select>
            </label>
            <label className="block space-y-1 text-sm">Etapa
              <select value={draft.status} onChange={(e) => setDraft((d) => ({ ...d, status: e.target.value as DreamStatus }))}
                className="block w-full rounded-xl border bg-background p-3">
                {STATUSES.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
              </select>
            </label>
            <label className="block space-y-1 text-sm">Data desejada (opcional)
              <input type="date" value={draft.targetDate} onChange={(e) => setDraft((d) => ({ ...d, targetDate: e.target.value }))}
                className="block w-full rounded-xl border bg-background p-3" />
            </label>
          </div>
          <div className="flex gap-2">
            <button type="button" disabled={pending || !draft.title.trim()} onClick={save}
              className="rounded-xl bg-primary px-5 py-2.5 text-sm text-primary-foreground disabled:opacity-50">
              {pending ? "Salvando..." : "Salvar sonho"}
            </button>
            <button type="button" disabled={pending} onClick={() => setEditing(false)}
              className="rounded-xl border px-4 py-2.5 text-sm">Cancelar</button>
          </div>
        </section>
      )}

      {visible.length === 0 ? (
        <div className="rounded-3xl border border-dashed p-10 text-center space-y-3">
          <Sparkles className="size-8 mx-auto text-primary" />
          <p className="font-display italic text-xl">Nenhum sonho por aqui ainda</p>
          <p className="text-sm text-muted-foreground">Que tal imaginar juntos a próxima experiência?</p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {visible.map((dream) => (
            <article key={dream.id} className="rounded-3xl border bg-card p-5 sm:p-6 space-y-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <span className="text-xs text-primary">{CATEGORIES.find((x) => x.value === dream.category)?.label}</span>
                  <h2 className="font-display text-xl break-words mt-1">{dream.title}</h2>
                </div>
                <Compass className="size-6 text-primary/60 shrink-0" />
              </div>
              {dream.details && <p className="text-sm whitespace-pre-wrap break-words text-muted-foreground">{dream.details}</p>}
              {dream.target_date && (
                <p className="flex items-center gap-2 text-xs text-muted-foreground">
                  <CalendarDays className="size-4" /> Para {new Intl.DateTimeFormat("pt-BR", { timeZone: "UTC" }).format(new Date(dream.target_date + "T00:00:00Z"))}
                </p>
              )}
              {dream.completed_at && dream.status === "realizado" && (
                <p className="flex items-center gap-2 text-xs text-primary"><Check className="size-4" /> Sonho realizado!</p>
              )}
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs text-muted-foreground">{dream.created_by === viewerId ? "Criado por você" : "Criado pelo seu par"}</p>
                <div className="flex gap-3">
                  <button aria-label={"Editar " + dream.title} type="button" onClick={() => edit(dream)}
                    className="text-xs text-primary" disabled={pending}><Pencil className="size-4" /></button>
                  <button aria-label={"Apagar " + dream.title} type="button" onClick={() => remove(dream.id)}
                    className="text-xs text-destructive" disabled={pending}><Trash2 className="size-4" /></button>
                </div>
              </div>
              <label className="block space-y-1 text-xs text-muted-foreground">
                Progresso
                <select disabled={pending} value={dream.status}
                  onChange={(e) => updateStatus(dream.id, e.target.value as DreamStatus)}
                  className="block w-full rounded-xl border bg-background p-2.5 text-sm text-foreground">
                  {STATUSES.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
                </select>
              </label>
            </article>
          ))}
        </div>
      )}

      <p className="text-xs text-muted-foreground">
        Os sonhos e seus progressos são visíveis somente para os membros do casal. Nenhuma exclusão remove os dados definitivamente.
      </p>
    </div>
  );
}
