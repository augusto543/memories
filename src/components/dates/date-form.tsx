"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { format, parse, isValid } from "date-fns";
import { Calendar as CalendarIcon, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RatingInput } from "@/components/dates/rating-input";
import { TagsInput } from "@/components/dates/tags-input";
import {
  PhotoUploader,
  type UploadedPhoto,
} from "@/components/dates/photo-uploader";
import { createDate, updateDate } from "@/actions/dates";

interface InitialValues {
  id?: string;
  title?: string;
  description?: string | null;
  location?: string | null;
  rating?: number | null;
  happened_at?: string;
  tags?: string[];
}

function applyDateMask(input: string): string {
  const digits = input.replace(/\D/g, "").slice(0, 8);
  const parts: string[] = [];
  if (digits.length > 0) parts.push(digits.slice(0, 2));
  if (digits.length > 2) parts.push(digits.slice(2, 4));
  if (digits.length > 4) parts.push(digits.slice(4, 8));
  return parts.join("/");
}

function parseBRDate(br: string): Date | null {
  const d = parse(br, "dd/MM/yyyy", new Date());
  return isValid(d) ? d : null;
}

export function DateForm({
  mode,
  initial,
  tagSuggestions = [],
}: {
  mode: "create" | "edit";
  initial?: InitialValues;
  tagSuggestions?: string[];
}) {
  const router = useRouter();
  const [title, setTitle] = React.useState(initial?.title ?? "");
  const [description, setDescription] = React.useState(
    initial?.description ?? "",
  );
  const [location, setLocation] = React.useState(initial?.location ?? "");
  const [rating, setRating] = React.useState<number | null>(
    initial?.rating ?? null,
  );
  const [happenedAt, setHappenedAt] = React.useState(
    initial?.happened_at
      ? format(new Date(initial.happened_at), "dd/MM/yyyy")
      : format(new Date(), "dd/MM/yyyy"),
  );
  const [tags, setTags] = React.useState<string[]>(initial?.tags ?? []);
  const [photos, setPhotos] = React.useState<UploadedPhoto[]>([]);
  const [submitting, setSubmitting] = React.useState(false);
  const dateInputRef = React.useRef<HTMLInputElement>(null);

  const happenedAtISO = React.useMemo(() => {
    const d = parseBRDate(happenedAt);
    return d ? format(d, "yyyy-MM-dd") : "";
  }, [happenedAt]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (submitting) return;

    const parsedDate = parseBRDate(happenedAt);
    if (!parsedDate) {
      toast.error("Data inválida. Use o formato DD/MM/AAAA.");
      return;
    }

    setSubmitting(true);

    try {
      if (mode === "create") {
        const res = await createDate({
          title,
          description: description || undefined,
          location: location || undefined,
          rating,
          happened_at: parsedDate.toISOString(),
          tags,
          photoPaths: photos.map((p) => p.path),
        });
        if (!res.ok) {
          toast.error(res.error);
          return;
        }
        toast.success("Encontro criado!");
        router.push(`/dates/${res.data.id}`);
        router.refresh();
      } else if (initial?.id) {
        const res = await updateDate({
          id: initial.id,
          title,
          description: description || undefined,
          location: location || undefined,
          rating,
          happened_at: parsedDate.toISOString(),
          tags,
        });
        if (!res.ok) {
          toast.error(res.error);
          return;
        }
        toast.success("Atualizado!");
        router.push(`/dates/${initial.id}`);
        router.refresh();
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="title">Título</Label>
        <Input
          id="title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Ex: Jantar no terraço"
          required
          maxLength={120}
          autoFocus
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="happened_at">Quando</Label>
          <div className="relative">
            <Input
              id="happened_at"
              type="text"
              inputMode="numeric"
              placeholder="DD/MM/AAAA"
              value={happenedAt}
              onChange={(e) => setHappenedAt(applyDateMask(e.target.value))}
              maxLength={10}
              required
              className="pr-10"
            />
            <button
              type="button"
              aria-label="Abrir calendário"
              onClick={() => dateInputRef.current?.showPicker?.()}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
            >
              <CalendarIcon className="size-4" />
            </button>
            <input
              ref={dateInputRef}
              type="date"
              value={happenedAtISO}
              onChange={(e) => {
                if (!e.target.value) return;
                const d = parse(e.target.value, "yyyy-MM-dd", new Date());
                if (isValid(d)) setHappenedAt(format(d, "dd/MM/yyyy"));
              }}
              tabIndex={-1}
              aria-hidden="true"
              className="sr-only"
            />
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="location">Onde</Label>
          <Input
            id="location"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            placeholder="Ex: São Paulo, SP"
            maxLength={200}
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label>Nota</Label>
        <RatingInput value={rating} onChange={setRating} />
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Memória</Label>
        <Textarea
          id="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={5}
          placeholder="O que aconteceu? Como você se sentiu?"
          maxLength={5000}
        />
      </div>

      <div className="space-y-2">
        <Label>Tags</Label>
        <TagsInput
          value={tags}
          onChange={setTags}
          suggestions={tagSuggestions}
        />
      </div>

      {mode === "create" && (
        <div className="space-y-2">
          <Label>Fotos</Label>
          <PhotoUploader value={photos} onChange={setPhotos} />
        </div>
      )}

      <div className="flex items-center justify-end gap-2 pt-4">
        <Button
          type="button"
          variant="ghost"
          onClick={() => router.back()}
          disabled={submitting}
        >
          Cancelar
        </Button>
        <Button type="submit" disabled={submitting || title.trim().length === 0}>
          {submitting && <Loader2 className="size-4 animate-spin" />}
          <span>{mode === "create" ? "Criar encontro" : "Salvar"}</span>
        </Button>
      </div>
    </form>
  );
}
