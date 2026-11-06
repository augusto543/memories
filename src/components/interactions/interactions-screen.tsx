"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Heart, MessageCircle, Send, Trash2 } from "lucide-react";
import { toast } from "sonner";
import {
  saveWeeklyAnswer, deleteWeeklyAnswer,
  addCoupleComment, deleteCoupleComment,
} from "@/actions/interactions";
import { addCalendarDays } from "@/lib/calendar";
import { questionForWeek } from "@/lib/weekly-questions";
import type { WeeklyAnswerRow, CoupleCommentRow } from "@/types/database";

interface Props {
  viewerId: string;
  coupleId: string | null;
  weekStart: string;
  question: string;
  answers: WeeklyAnswerRow[];
  comments: CoupleCommentRow[];
}

function shortDate(date: string): string {
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: "UTC", day: "numeric", month: "long",
  }).format(new Date(date + "T00:00:00Z"));
}

export function InteractionsScreen({ viewerId, coupleId, weekStart, question, answers, comments }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const mine = answers.find((a) => a.week_start === weekStart && a.user_id === viewerId);
  const [answerText, setAnswerText] = useState(mine?.content ?? "");
  const currentAnswers = answers.filter((a) => a.week_start === weekStart);
  const previousWeeks = Array.from({ length: 11 }, (_, i) => addCalendarDays(weekStart, -(i + 1) * 7))
    .filter((week) => answers.some((answer) => answer.week_start === week));

  function save() {
    startTransition(async () => {
      const result = await saveWeeklyAnswer({ content: answerText });
      if (!result.ok) { toast.error(result.error); return; }
      toast.success(mine ? "Sua resposta foi atualizada." : "Resposta enviada com carinho! 💗");
      router.refresh();
    });
  }

  function removeAnswer(id: string) {
    if (!window.confirm("Ocultar sua resposta e seus comentários? O administrador poderá recuperá-la.")) return;
    startTransition(async () => {
      const result = await deleteWeeklyAnswer({ id });
      if (!result.ok) { toast.error(result.error); return; }
      setAnswerText("");
      toast.success("Resposta ocultada.");
      router.refresh();
    });
  }

  if (!coupleId) return (
    <div className="mx-auto max-w-2xl space-y-5 py-8">
      <h1 className="font-display italic text-4xl md:text-5xl text-gradient">entre nós</h1>
      <div className="rounded-3xl border bg-card p-6 space-y-4">
        <Heart className="size-9 text-primary" />
        <h2 className="font-display text-2xl">Um cantinho só de vocês</h2>
        <p className="text-sm text-muted-foreground">Crie seu espaço do casal e convide seu par. Depois vocês poderão responder à pergunta da semana, comentar e conversar aqui.</p>
        <Link href="/couple" className="inline-block rounded-xl bg-primary px-5 py-3 text-sm text-primary-foreground">
          Ir para nosso espaço
        </Link>
      </div>
    </div>
  );

  return (
    <div className="mx-auto max-w-3xl space-y-9">
      <header className="space-y-2">
        <span className="text-xs uppercase tracking-[0.2em] text-primary">nosso espaço de conversa</span>
        <h1 className="font-display italic text-4xl md:text-6xl text-gradient">entre nós</h1>
        <p className="text-sm text-muted-foreground">Uma pergunta nova a cada segunda-feira. As respostas e conversas ficam visíveis apenas para os integrantes do casal.</p>
      </header>

      <section className="rounded-3xl border border-primary/20 bg-primary/5 p-5 sm:p-7 space-y-5">
        <div className="flex items-center justify-between gap-3 text-xs text-primary">
          <span className="uppercase tracking-wider">Pergunta da semana</span>
          <span>A partir de {shortDate(weekStart)}</span>
        </div>
        <h2 className="font-display italic text-2xl md:text-3xl leading-snug">{question}</h2>
        <label className="block space-y-2 text-sm">
          <span>{mine ? "Sua resposta (você pode editar)" : "O que você pensa?"}</span>
          <textarea className="w-full resize-y rounded-2xl border bg-background p-4 outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
            placeholder="Escreva do seu jeito..." value={answerText} maxLength={1500}
            rows={4} onChange={(e) => setAnswerText(e.target.value)} />
        </label>
        <div className="flex justify-between items-center gap-3">
          <span className="text-xs text-muted-foreground">{answerText.length}/1500</span>
          <button disabled={pending || !answerText.trim()} onClick={save} type="button"
            className="inline-flex gap-2 items-center rounded-xl bg-primary px-5 py-2.5 text-sm text-primary-foreground disabled:opacity-50">
            <Send className="size-4" /> {pending ? "Salvando..." : mine ? "Atualizar" : "Enviar resposta"}
          </button>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="font-display text-2xl">Nossas respostas</h2>
        {currentAnswers.length === 0 && <p className="text-sm text-muted-foreground">Ainda não há respostas esta semana. Que tal começar?</p>}
        <div className="space-y-5">
          {currentAnswers.map((answer) => (
            <AnswerCard key={answer.id} answer={answer} viewerId={viewerId}
              comments={comments.filter((c) => c.answer_id === answer.id)}
              onDelete={() => removeAnswer(answer.id)} pending={pending} />
          ))}
        </div>
      </section>

      <section className="space-y-4 border-t pt-8">
        <h2 className="font-display text-2xl">Conversas das semanas anteriores</h2>
        {previousWeeks.length === 0 ? <p className="text-sm text-muted-foreground">As perguntas que vocês responderem ficarão guardadas aqui.</p> :
          previousWeeks.map((week) => (
            <div key={week} className="space-y-3">
              <p className="text-xs uppercase tracking-wider text-muted-foreground">Semana de {shortDate(week)}</p>
              <h3 className="font-display italic text-xl">{questionForWeek(week)}</h3>
              {answers.filter((a) => a.week_start === week).map((answer) => (
                <AnswerCard key={answer.id} answer={answer} viewerId={viewerId}
                  comments={comments.filter((c) => c.answer_id === answer.id)}
                  onDelete={() => removeAnswer(answer.id)} pending={pending} />
              ))}
            </div>
          ))
        }
      </section>
    </div>
  );
}

function AnswerCard({ answer, viewerId, comments, onDelete, pending }: {
  answer: WeeklyAnswerRow;
  viewerId: string;
  comments: CoupleCommentRow[];
  onDelete: () => void;
  pending: boolean;
}) {
  const mine = answer.user_id === viewerId;
  return (
    <article className="rounded-3xl border bg-card p-5 sm:p-6 space-y-4">
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs uppercase tracking-wider text-primary">{mine ? "Você" : "Seu par"}</span>
        {mine && <button type="button" onClick={onDelete} disabled={pending}
          className="inline-flex items-center gap-1 text-xs text-destructive" aria-label="Apagar minha resposta">
          <Trash2 className="size-3.5" /> Apagar
        </button>}
      </div>
      <p className="whitespace-pre-wrap break-words text-sm leading-relaxed">{answer.content}</p>
      <CommentThread answerId={answer.id} comments={comments} viewerId={viewerId} />
    </article>
  );
}

function CommentThread({ answerId, comments, viewerId }: {
  answerId: string;
  comments: CoupleCommentRow[];
  viewerId: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [draft, setDraft] = useState("");
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const topLevel = comments.filter((c) => c.parent_id === null);

  function submit() {
    startTransition(async () => {
      const result = await addCoupleComment({ answerId, parentId: replyTo, content: draft });
      if (!result.ok) { toast.error(result.error); return; }
      setDraft("");
      setReplyTo(null);
      router.refresh();
    });
  }

  function remove(id: string) {
    if (!window.confirm("Ocultar este comentário? Ele poderá ser recuperado pelo administrador.")) return;
    startTransition(async () => {
      const result = await deleteCoupleComment({ id });
      if (!result.ok) { toast.error(result.error); return; }
      toast.success("Comentário ocultado.");
      router.refresh();
    });
  }

  function oneComment(comment: CoupleCommentRow, isReply: boolean) {
    const mine = comment.user_id === viewerId;
    return (
      <div key={comment.id} className={"rounded-xl p-3 space-y-1 " + (isReply ? "ml-5 bg-muted/30 border-l-2 border-primary/20" : "bg-muted/50")}>
        <div className="flex gap-3 items-center justify-between">
          <span className="text-xs font-semibold">{mine ? "Você" : "Seu par"}</span>
          {mine && <button type="button" onClick={() => remove(comment.id)} disabled={pending}
            aria-label="Apagar comentário" className="text-xs text-destructive">Apagar</button>}
        </div>
        <p className="text-sm whitespace-pre-wrap break-words">{comment.content}</p>
        {!isReply && <button type="button" onClick={() => setReplyTo(comment.id)}
          className="text-xs text-primary underline-offset-4 hover:underline">Responder</button>}
      </div>
    );
  }

  return (
    <div className="space-y-3 border-t pt-4">
      <h4 className="flex items-center gap-2 text-xs uppercase tracking-wide text-muted-foreground">
        <MessageCircle className="size-4" /> Comentários ({comments.length})
      </h4>
      {topLevel.map((comment) => (
        <div key={comment.id} className="space-y-2">
          {oneComment(comment, false)}
          {comments.filter((c) => c.parent_id === comment.id).map((reply) => oneComment(reply, true))}
        </div>
      ))}
      {replyTo && <div className="flex justify-between gap-2 text-xs text-primary">
        <span>Respondendo a um comentário</span>
        <button type="button" onClick={() => setReplyTo(null)} className="underline">Cancelar resposta</button>
      </div>}
      <label className="block space-y-2">
        <span className="sr-only">{replyTo ? "Sua resposta ao comentário" : "Seu comentário"}</span>
        <textarea value={draft} maxLength={1000} rows={2}
          onChange={(e) => setDraft(e.target.value)}
          placeholder={replyTo ? "Escreva sua resposta..." : "Deixe um comentário carinhoso..."}
          className="w-full rounded-xl border bg-background p-3 text-sm resize-y" />
      </label>
      <div className="flex justify-end">
        <button type="button" disabled={pending || !draft.trim()} onClick={submit}
          className="rounded-xl border border-primary/30 px-4 py-2 text-sm text-primary disabled:opacity-50">
          {pending ? "Enviando..." : replyTo ? "Enviar resposta" : "Comentar"}
        </button>
      </div>
    </div>
  );
}
