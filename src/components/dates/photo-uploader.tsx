"use client";

import * as React from "react";
import Image from "next/image";
import { ImagePlus, Loader2, X } from "lucide-react";
import { toast } from "sonner";
import { uploadDraftPhoto } from "@/actions/photos";
import { PHOTO_LIMITS } from "@/lib/constants";
import { prepareImageForUpload } from "@/lib/images/prepare-image";
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
  const [phase, setPhase] = React.useState<"idle" | "optimizing" | "uploading">(
    "idle",
  );
  const busy = phase !== "idle";
  const inputRef = React.useRef<HTMLInputElement>(null);

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    setPhase("uploading");
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
        // Fotos grandes são comprimidas no browser antes de subir.
        let upload = file;
        if (file.size > PHOTO_LIMITS.MAX_BYTES) {
          setPhase("optimizing");
          const prepared = await prepareImageForUpload(file);
          if (!prepared.ok) {
            toast.error(`${file.name}: ${prepared.error}`);
            continue;
          }
          upload = prepared.file;
        }
        setPhase("uploading");

        // valida no client antes de subir
        const parsed = photoFileSchema.safeParse(upload);
        if (!parsed.success) {
          toast.error(`${file.name}: ${parsed.error.issues[0]?.message}`);
          continue;
        }

        const fd = new FormData();
        fd.append("file", upload);
        const res = await uploadDraftPhoto(fd);
        if (!res.ok) {
          toast.error(`${file.name}: ${res.error}`);
          continue;
        }
        const previewUrl = URL.createObjectURL(upload);
        added.push({ path: res.data.path, previewUrl, name: file.name });
      }

      if (added.length > 0) {
        onChange([...value, ...added]);
      }
    } finally {
      setPhase("idle");
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
            <span className="text-xs">
              {phase === "optimizing"
                ? "Otimizando…"
                : phase === "uploading"
                  ? "Enviando…"
                  : "Adicionar"}
            </span>
          </button>
        )}
      </div>

      {phase === "optimizing" && (
        <p
          className="flex items-center gap-1.5 text-xs text-muted-foreground"
          aria-live="polite"
        >
          <Loader2 className="size-3 animate-spin" />
          Otimizando foto…
        </p>
      )}

      <p className="text-xs text-muted-foreground">
        {value.length}/{PHOTO_LIMITS.MAX_PER_DATE} fotos · jpg, png, webp ·
        fotos grandes são otimizadas automaticamente
      </p>
    </div>
  );
}
