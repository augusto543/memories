"use client";

import * as React from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { ImagePlus, Loader2, Star, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { deletePhoto, setCoverPhoto, uploadPhoto } from "@/actions/photos";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { PHOTO_LIMITS } from "@/lib/constants";
import { prepareImageForUpload } from "@/lib/images/prepare-image";
import { photoFileSchema } from "@/lib/validations/photo";
import { cn } from "@/lib/utils";

export interface ExistingPhoto {
  id: string;
  url: string;
  isCover: boolean;
}

export function DatePhotosManager({
  dateId,
  initial,
}: {
  dateId: string;
  initial: ExistingPhoto[];
}) {
  const router = useRouter();
  const [photos, setPhotos] = React.useState<ExistingPhoto[]>(initial);
  const [busy, setBusy] = React.useState(false);
  const [optimizing, setOptimizing] = React.useState(false);
  const [progress, setProgress] = React.useState(0);
  const [pendingRemove, setPendingRemove] = React.useState<string | null>(null);
  const [removing, setRemoving] = React.useState(false);
  const inputRef = React.useRef<HTMLInputElement>(null);

  const canAddMore = photos.length < PHOTO_LIMITS.MAX_PER_DATE;

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return;

    const available = PHOTO_LIMITS.MAX_PER_DATE - photos.length;
    const queue = Array.from(files).slice(0, available);
    if (files.length > available) {
      toast.warning(
        `Você pode ter até ${PHOTO_LIMITS.MAX_PER_DATE} fotos por encontro.`,
      );
    }

    setBusy(true);
    setProgress(0);
    let done = 0;
    const added: ExistingPhoto[] = [];

    for (const file of queue) {
      // Fotos grandes são comprimidas no browser antes de subir.
      let upload = file;
      if (file.size > PHOTO_LIMITS.MAX_BYTES) {
        setOptimizing(true);
        const prepared = await prepareImageForUpload(file);
        setOptimizing(false);
        if (!prepared.ok) {
          toast.error(`${file.name}: ${prepared.error}`);
          done += 1;
          setProgress(Math.round((done / queue.length) * 100));
          continue;
        }
        upload = prepared.file;
      }

      const parsed = photoFileSchema.safeParse(upload);
      if (!parsed.success) {
        toast.error(`${file.name}: ${parsed.error.issues[0]?.message}`);
        done += 1;
        setProgress(Math.round((done / queue.length) * 100));
        continue;
      }

      const fd = new FormData();
      fd.append("dateId", dateId);
      fd.append("file", upload);
      const res = await uploadPhoto(fd);
      done += 1;
      setProgress(Math.round((done / queue.length) * 100));

      if (!res.ok) {
        toast.error(`${file.name}: ${res.error}`);
        continue;
      }
      // Preview imediato via objectURL; a URL assinada chega no próximo refresh.
      added.push({
        id: res.data.id,
        url: URL.createObjectURL(upload),
        isCover: false,
      });
    }

    if (added.length > 0) {
      setPhotos((prev) => [...prev, ...added]);
      toast.success(
        added.length === 1 ? "Foto adicionada." : `${added.length} fotos adicionadas.`,
      );
      router.refresh();
    }

    setBusy(false);
    setOptimizing(false);
    setProgress(0);
    if (inputRef.current) inputRef.current.value = "";
  }

  async function onConfirmRemove() {
    if (!pendingRemove) return;
    setRemoving(true);
    const res = await deletePhoto({ id: pendingRemove });
    setRemoving(false);
    if (!res.ok) {
      toast.error(res.error);
      return;
    }
    setPhotos((prev) => prev.filter((p) => p.id !== pendingRemove));
    setPendingRemove(null);
    router.refresh();
  }

  async function onSetCover(id: string) {
    // otimista
    setPhotos((prev) => prev.map((p) => ({ ...p, isCover: p.id === id })));
    const res = await setCoverPhoto({ id });
    if (!res.ok) {
      toast.error(res.error);
      router.refresh();
      return;
    }
    toast.success("Capa atualizada.");
    router.refresh();
  }

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
        {photos.map((p) => (
          <div
            key={p.id}
            className={cn(
              "group relative aspect-square overflow-hidden rounded-lg border",
              p.isCover && "ring-2 ring-primary",
            )}
          >
            {p.url ? (
              <Image
                src={p.url}
                alt="Foto do encontro"
                fill
                sizes="120px"
                className="object-cover"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center bg-muted">
                <Loader2 className="size-4 animate-spin text-muted-foreground" />
              </div>
            )}

            {/* Marca de capa */}
            {p.isCover && (
              <span className="absolute left-1 top-1 inline-flex items-center gap-0.5 rounded-full bg-primary px-1.5 py-0.5 text-[10px] font-medium text-primary-foreground shadow-soft">
                <Star className="size-2.5 fill-current" />
                capa
              </span>
            )}

            {/* Ações */}
            <div className="absolute inset-x-0 bottom-0 flex items-center justify-between gap-1 bg-gradient-to-t from-black/70 to-transparent p-1 opacity-0 transition-opacity group-hover:opacity-100">
              {!p.isCover ? (
                <button
                  type="button"
                  onClick={() => onSetCover(p.id)}
                  className="inline-flex items-center gap-1 rounded-full bg-white/15 px-1.5 py-0.5 text-[10px] text-white hover:bg-white/30"
                  aria-label="Definir como capa"
                >
                  <Star className="size-3" />
                  capa
                </button>
              ) : (
                <span />
              )}
              <button
                type="button"
                onClick={() => setPendingRemove(p.id)}
                className="rounded-full bg-white/15 p-1 text-white hover:bg-destructive hover:text-destructive-foreground"
                aria-label="Remover foto"
              >
                <Trash2 className="size-3" />
              </button>
            </div>
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
              {optimizing ? "Otimizando…" : busy ? "Enviando…" : "Adicionar"}
            </span>
          </button>
        )}
      </div>

      {busy && (
        <div className="space-y-1">
          <Progress value={progress} className="h-1.5" />
          {optimizing && (
            <p
              className="flex items-center gap-1.5 text-xs text-muted-foreground"
              aria-live="polite"
            >
              <Loader2 className="size-3 animate-spin" />
              Otimizando foto…
            </p>
          )}
        </div>
      )}

      <p className="text-xs text-muted-foreground">
        {photos.length}/{PHOTO_LIMITS.MAX_PER_DATE} fotos · toque na estrela para
        definir a capa · fotos grandes são otimizadas automaticamente
      </p>

      <Dialog
        open={pendingRemove !== null}
        onOpenChange={(o) => !o && setPendingRemove(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Remover foto?</DialogTitle>
            <DialogDescription>
              Esta ação não pode ser desfeita.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => setPendingRemove(null)}
              disabled={removing}
            >
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={onConfirmRemove}
              disabled={removing}
            >
              {removing && <Loader2 className="size-4 animate-spin" />}
              Remover
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
