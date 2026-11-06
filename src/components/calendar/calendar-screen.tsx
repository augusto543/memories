"use client";

import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CalendarDays, ChevronLeft, ChevronRight, Heart, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { saveSpecialEvent, deleteSpecialEvent } from "@/actions/calendar";
import { cn } from "@/lib/utils";
import {
  addCalendarDays, dayDifference, encounterLocalDay,
  nextOccurrence, occurrenceInYear, toDateOnlyUTC,
} from "@/lib/calendar";
import type { SpecialEventRow } from "@/types/database";
import type { EncounterCalendarItem } from "@/lib/queries/calendar";

interface Props {
  today: string;
  viewerId: string;
  hasCouple: boolean;
  events: SpecialEventRow[];
  encounters: EncounterCalendarItem[];
}

interface Draft {
  id?: string;
  title: string;
  description: string;
  eventDate: string;
  repeatsAnnually: boolean;
  remindDaysBefore: number | null;
  shareWithCouple: boolean;
}

const blankDraft = (day: string): Draft => ({
  title: "", description: "", eventDate: day,
  repeatsAnnually: false, remindDaysBefore: 3, shareWithCouple: false,
});

function dateLabel(day: string, options?: Intl.DateTimeFormatOptions): string {
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: "UTC", day: "numeric", month: "long", year: "numeric", ...options,
  }).format(toDateOnlyUTC(day));
}

export function CalendarScreen({ today, viewerId, hasCouple, events, encounters }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [month, setMonth] = useState(today.slice(0, 7));
  const [selectedDay, setSelectedDay] = useState(today);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<Draft>(blankDraft(today));

  const currentYear = Number(month.slice(0, 4));
  const currentMonth = Number(month.slice(5, 7));
  const first = new Date(Date.UTC(currentYear, currentMonth - 1, 1));
  const daysInMonth = new Date(Date.UTC(currentYear, currentMonth, 0)).getUTCDate();
  const offset = (first.getUTCDay() + 6) % 7;
  const cells = Array.from({ length: Math.ceil((offset + daysInMonth) / 7) * 7 }, (_, idx) => {
    const dayNumber = idx - offset + 1;
    return dayNumber > 0 && dayNumber <= daysInMonth
      ? month + "-" + String(dayNumber).padStart(2, "0")
      : null;
  });

  const encounterDays = useMemo(() => encounters.map((d) => ({
    ...d, day: encounterLocalDay(d.happened_at),
  })), [encounters]);

  const eventDay = (event: SpecialEventRow, year: number) =>
    event.repeats_annually ? occurrenceInYear(event.event_date, year) : event.event_date;

  const byDay = (day: string) => ({
    special: events.filter((e) => eventDay(e, Number(day.slice(0, 4))) === day),
    memories: encounterDays.filter((e) => e.day === day),
  });

  const selected = byDay(selectedDay);

  const upcoming = useMemo(() => events.map((event) => {
    const next = nextOccurrence(event.event_date, event.repeats_annually, today);
    return next ? { event, next, remaining: dayDifference(today, next) } : null;
  }).filter((x): x is { event: SpecialEventRow; next: string; remaining: number } => x !== null)
    .sort((a, b) => a.remaining - b.remaining), [events, today]);

  const reminders = upcoming.filter((x) =>
    x.event.remind_days_before !== null && x.remaining <= x.event.remind_days_before
  );

  function shiftMonth(delta: number) {
    const d = new Date(Date.UTC(currentYear, currentMonth - 1 + delta, 1));
    const value = d.toISOString().slice(0, 7);
    setMonth(value);
    setSelectedDay(value + "-01");
  }

  function beginCreate() {
    setDraft(blankDraft(selectedDay));
    setEditing(true);
  }

  function beginEdit(event: SpecialEventRow) {
    setDraft({
      id: event.id, title: event.title,
      description: event.description ?? "",
      eventDate: event.event_date,
      repeatsAnnually: event.repeats_annually,
      remindDaysBefore: event.remind_days_before,
      shareWithCouple: event.couple_id !== null,
    });
    setEditing(true);
  }

  function save() {
    startTransition(async () => {
      const result = await saveSpecialEvent(draft);
      if (!result.ok) { toast.error(result.error); return; }
      toast.success(draft.id ? "Data atualizada!" : "Data especial salva!");
      setEditing(false);
      router.refresh();
    });
  }

  function remove(id: string) {
    if (!window.confirm("Ocultar esta data especial? Ela poderá ser recuperada pelo administrador.")) return;
    startTransition(async () => {
      const result = await deleteSpecialEvent({ id });
      if (!result.ok) { toast.error(result.error); return; }
      toast.success("Data removida do calendário.");
      router.refresh();
    });
  }

  return (
    <div className="space-y-8">
      <header className="space-y-2">
        <span className="text-xs uppercase tracking-[0.2em] text-primary">datas e memórias</span>
        <h1 className="font-display italic text-4xl md:text-6xl text-gradient">nosso calendário</h1>
        <p className="text-sm text-muted-foreground">Datas que importam, encontros e lembretes para não deixar o carinho passar.</p>
      </header>

      {reminders.length > 0 && (
        <section className="rounded-2xl border border-primary/30 bg-primary/5 p-4 space-y-2" aria-label="Lembretes importantes">
          <h2 className="flex items-center gap-2 font-medium"><Heart className="size-4 text-primary" /> Lembretes de hoje</h2>
          {reminders.map(({ event, remaining }) => (
            <p key={event.id} className="text-sm">
              <strong>{event.title}</strong> — {remaining === 0 ? "é hoje! 💗" : "faltam " + remaining + (remaining === 1 ? " dia" : " dias")}
            </p>
          ))}
        </section>
      )}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
        <section className="rounded-3xl border bg-card p-4 sm:p-6 space-y-4">
          <div className="flex items-center justify-between gap-2">
            <button className="rounded-xl p-2 hover:bg-muted" type="button" onClick={() => shiftMonth(-1)} aria-label="Mês anterior">
              <ChevronLeft className="size-5" />
            </button>
            <h2 className="font-display text-2xl capitalize">
              {dateLabel(month + "-01", { day: undefined })}
            </h2>
            <button className="rounded-xl p-2 hover:bg-muted" type="button" onClick={() => shiftMonth(1)} aria-label="Próximo mês">
              <ChevronRight className="size-5" />
            </button>
          </div>
          <div className="grid grid-cols-7 gap-1 text-center text-xs text-muted-foreground" aria-hidden>
            {["seg", "ter", "qua", "qui", "sex", "sáb", "dom"].map((d) => <span key={d}>{d}</span>)}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {cells.map((day, idx) => {
              if (!day) return <span key={"empty-" + idx} className="min-h-12" />;
              const entries = byDay(day);
              return (
                <button key={day} type="button" onClick={() => setSelectedDay(day)}
                  aria-label={dateLabel(day)}
                  aria-pressed={selectedDay === day}
                  className={cn(
                    "relative flex min-h-12 flex-col items-center justify-center rounded-xl text-sm transition-colors",
                    selectedDay === day ? "bg-primary text-primary-foreground" :
                      day === today ? "bg-primary/10 text-primary" : "hover:bg-muted"
                  )}>
                  <span>{Number(day.slice(8, 10))}</span>
                  <span className="flex gap-0.5 h-1.5 mt-1">
                    {entries.special.length > 0 && <span className={cn("size-1.5 rounded-full", selectedDay === day ? "bg-white" : "bg-primary")} />}
                    {entries.memories.length > 0 && <span className={cn("size-1.5 rounded-full", selectedDay === day ? "bg-white/70" : "bg-muted-foreground")} />}
                  </span>
                </button>
              );
            })}
          </div>
          <div className="flex gap-4 text-xs text-muted-foreground">
            <span>● <span className="text-primary">datas especiais</span></span>
            <span>● encontros registrados</span>
          </div>
          <button type="button" onClick={() => {setMonth(today.slice(0, 7));setSelectedDay(today);}}
            className="text-xs underline underline-offset-4 text-primary">Ir para hoje</button>
        </section>

        <section className="space-y-4">
          <div className="rounded-3xl border bg-card p-5 space-y-4">
            <div className="flex items-start justify-between gap-2">
              <div><h2 className="font-display text-2xl">Dia selecionado</h2>
                <p className="text-sm text-muted-foreground">{dateLabel(selectedDay)}</p>
              </div>
              <button type="button" onClick={beginCreate}
                className="flex items-center gap-1 rounded-xl bg-primary px-3 py-2 text-xs text-primary-foreground">
                <Plus className="size-4" /> Data
              </button>
            </div>
            {!selected.special.length && !selected.memories.length && (
              <p className="text-sm text-muted-foreground">Nenhum registro neste dia. Que tal criar uma data especial?</p>
            )}
            {selected.special.map((event) => (
              <div key={event.id} className="rounded-xl bg-muted/50 p-3 space-y-1">
                <p className="text-sm font-medium">💗 {event.title}</p>
                {event.description && <p className="text-xs whitespace-pre-wrap">{event.description}</p>}
                <p className="text-xs text-muted-foreground">
                  {event.repeats_annually ? "Repete todo ano · " : ""}
                  {event.couple_id ? "Compartilhado" : "Privado"}
                </p>
                {viewerId === event.user_id && <div className="flex gap-3 pt-1">
                  <button type="button" onClick={() => beginEdit(event)} className="text-xs underline">Editar</button>
                  <button type="button" disabled={pending} onClick={() => remove(event.id)} className="text-xs text-destructive">Apagar</button>
                </div>}
              </div>
            ))}
            {selected.memories.map((date) => (
              <Link key={date.id} href={"/dates/" + date.id}
                className="block rounded-xl border p-3 text-sm hover:border-primary/40">
                <CalendarDays className="inline size-4 mr-1 text-primary" /> {date.title}
              </Link>
            ))}
          </div>
        </section>
      </div>

      {editing && <section className="rounded-3xl border bg-card p-5 sm:p-6 space-y-4" aria-label="Formulário de data especial">
        <h2 className="font-display text-2xl">{draft.id ? "Editar data especial" : "Nova data especial"}</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="space-y-1 text-sm sm:col-span-2">Título
            <input value={draft.title} maxLength={120} onChange={(e) => setDraft((d) => ({...d,title:e.target.value}))}
              className="block w-full rounded-xl border bg-background p-3" placeholder="Nosso aniversário, aniversário de namoro..." />
          </label>
          <label className="space-y-1 text-sm sm:col-span-2">Descrição (opcional)
            <textarea rows={3} maxLength={1000} value={draft.description}
              onChange={(e) => setDraft((d) => ({...d,description:e.target.value}))}
              className="block w-full rounded-xl border bg-background p-3" />
          </label>
          <label className="space-y-1 text-sm">Data
            <input type="date" required value={draft.eventDate} onChange={(e) => setDraft((d) => ({...d,eventDate:e.target.value}))}
              className="block w-full rounded-xl border bg-background p-3" />
          </label>
          <label className="space-y-1 text-sm">Lembrar com antecedência
            <select value={draft.remindDaysBefore === null ? "none" : String(draft.remindDaysBefore)}
              onChange={(e) => setDraft((d) => ({...d,remindDaysBefore:e.target.value === "none" ? null : Number(e.target.value)}))}
              className="block w-full rounded-xl border bg-background p-3">
              <option value="none">Sem lembrete</option>
              <option value="0">No dia</option>
              <option value="1">1 dia antes</option>
              <option value="3">3 dias antes</option>
              <option value="7">7 dias antes</option>
              <option value="14">14 dias antes</option>
              <option value="30">30 dias antes</option>
              <option value="90">90 dias antes</option>
            </select>
          </label>
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={draft.repeatsAnnually} onChange={(e) => setDraft((d) => ({...d,repeatsAnnually:e.target.checked}))} />
          Repetir todos os anos
        </label>
        {hasCouple && <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={draft.shareWithCouple} onChange={(e) => setDraft((d) => ({...d,shareWithCouple:e.target.checked}))} />
          Compartilhar com meu par
        </label>}
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={save} disabled={pending || !draft.title.trim() || !draft.eventDate}
            className="rounded-xl bg-primary px-5 py-2.5 text-sm text-primary-foreground disabled:opacity-50">
            {pending ? "Salvando..." : "Salvar data"}
          </button>
          <button type="button" onClick={() => setEditing(false)} disabled={pending}
            className="rounded-xl border px-4 py-2.5 text-sm">Cancelar</button>
        </div>
        <p className="text-xs text-muted-foreground">Os lembretes aparecem dentro do Memories quando você acessa o calendário. Não são enviados por e-mail ou notificação push.</p>
      </section>}

      <section className="space-y-3">
        <div className="flex items-center justify-between gap-2">
          <h2 className="font-display text-2xl">Próximas datas especiais</h2>
          {!editing && <button type="button" onClick={beginCreate} className="flex gap-1 items-center text-sm text-primary"><Plus className="size-4" /> Adicionar</button>}
        </div>
        {upcoming.length === 0 ? <p className="text-sm text-muted-foreground">Ainda não há datas futuras. Adicione uma lembrança importante para vocês.</p> :
          <div className="grid gap-3 md:grid-cols-2">
            {upcoming.slice(0, 8).map(({event,next,remaining}) =>
              <div key={event.id} className="rounded-2xl border bg-card p-4 flex justify-between gap-3">
                <div>
                  <p className="font-medium text-sm">{event.title}</p>
                  <p className="text-xs text-muted-foreground">{dateLabel(next)} · {remaining === 0 ? "hoje" : "em " + remaining + " dias"}</p>
                  {event.repeats_annually && <span className="text-xs text-primary">Anual</span>}
                </div>
                {viewerId === event.user_id && <button aria-label={"Editar " + event.title} type="button" onClick={() => beginEdit(event)}
                  className="text-xs underline self-start">Editar</button>}
              </div>
            )}
          </div>}
      </section>
    </div>
  );
}
