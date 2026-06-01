"use client";

import * as React from "react";
import Image from "next/image";
import { ImagePlus, Loader2, X } from "lucide-react";
import { toast } from "sonner";
import { uploadDraftPhoto } from "@/actions/photos";
import { PHOTO_LIMITS } from "@/lib/constants";
import { photoFileSchema } from "@/lib/validations/photo";

export interface UploadedPhoto {
  path: string;
  previewUrl: string;
  name: string;
}

export function PhotoUploader({
  value,
  onChange,
}: {
  value: UploadedPhoto[];
  onChange: (v: UploadedPhoto[]) => void;
}) {
  const [busy, setBusy] = React.useState(false);
  const inputRef = React.useRef<HTMLInputElement>(null);

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    setBusy(true);
    try {
      const available = PHOTO_LIMITS.MAX_PER_DATE - value.length;
      const queue = Array.from(files).slice(0, available);
      if (files.length > available) {
        toast.warning(
          `Você pode enviar até ${PHOTO_LIMITS.MAX_PER_DATE} fotos por encontro.`,
        );
      }

      const added: UploadedPhoto[] = [];
      for (const file of queue) {
        // valida no client antes de subir
        const parsed = photoFileSchema.safeParse(file);
        if (!parsed.success) {
          toast.error(`${file.name}: ${parsed.error.issues[0]?.message}`);
          continue;
        }

        const fd = new FormData();
        fd.append("file", file);
        const res = await uploadDraftPhoto(fd);
        if (!res.ok) {
          toast.error(`${file.name}: ${res.error}`);
          continue;
        }
        const previewUrl = URL.createObjectURL(file);
        added.push({ path: res.data.path, previewUrl, name: file.name });
      }

      if (added.length > 0) {
        onChange([...value, ...added]);
      }
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  function remove(path: string) {
    const next = value.filter((p) => p.path !== path);
    onChange(next);
  }

  const canAddMore = value.length < PHOTO_LIMITS.MAX_PER_DATE;

  return (
    <div className="space-y-3">
      <input
        ref={inputRef}
        type="file"
        accept={PHOTO_LIMITS.ALLOWED_MIME_TYPES.join(",")}
        multiple
        className="hidden"
        onChange={(e) => handleFiles(e.target.files)}
      />

      <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-5">
        {value.map((p) => (
          <div
            key={p.path}
            className="relative aspect-square overflow-hidden rounded-lg border"
          >
            <Image
              src={p.previewUrl}
              alt={p.name}
              fill
              sizes="120px"
              className="object-cover"
            />
            <button
              type="button"
              onClick={() => remove(p.path)}
              className="absolute right-1 top-1 rounded-full bg-black/60 p-1 text-white opacity-90 hover:opacity-100"
              aria-label="Remover"
            >
              <X className="size-3" />
            </button>
          </div>
        ))}

        {canAddMore && (
          <button
            type="button"
            disabled={busy}
            onClick={() => inputRef.current?.click()}
            className="flex aspect-square flex-col items-center justify-center gap-1 rounded-lg border-2 border-dashed border-border bg-muted/40 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-50"
          >
            {busy ? (
              <Loader2 className="size-5 animate-spin" />
            ) : (
              <ImagePlus className="size-5" />
            )}
            <span className="text-xs">{busy ? "Enviando…" : "Adicionar"}</span>
          </button>
        )}
      </div>

      <p className="text-xs text-muted-foreground">
        {value.length}/{PHOTO_LIMITS.MAX_PER_DATE} fotos · até{" "}
        {PHOTO_LIMITS.MAX_BYTES / 1024 / 1024}MB cada · jpg, png, webp
      </p>
    </div>
  );
}
