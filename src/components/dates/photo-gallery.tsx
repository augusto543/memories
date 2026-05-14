"use client";

import * as React from "react";
import Image from "next/image";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { cn } from "@/lib/utils";

export function PhotoGallery({ urls }: { urls: string[] }) {
  const [open, setOpen] = React.useState<number | null>(null);

  if (urls.length === 0) return null;

  return (
    <>
      <div
        className={cn(
          "grid gap-2",
          urls.length === 1 && "grid-cols-1",
          urls.length === 2 && "grid-cols-2",
          urls.length >= 3 && "grid-cols-2 sm:grid-cols-3",
        )}
      >
        {urls.map((url, i) =>
          url ? (
            <button
              key={i}
              type="button"
              onClick={() => setOpen(i)}
              className={cn(
                "relative overflow-hidden rounded-xl bg-muted",
                urls.length === 1 ? "aspect-[16/10]" : "aspect-square",
              )}
            >
              <Image
                src={url}
                alt={`Foto ${i + 1}`}
                fill
                sizes="(max-width: 768px) 50vw, 33vw"
                className="object-cover transition-transform hover:scale-[1.02]"
              />
            </button>
          ) : null,
        )}
      </div>

      {open !== null && (
        <Lightbox
          urls={urls}
          index={open}
          onClose={() => setOpen(null)}
          onChange={(i) => setOpen(i)}
        />
      )}
    </>
  );
}

function Lightbox({
  urls,
  index,
  onClose,
  onChange,
}: {
  urls: string[];
  index: number;
  onClose: () => void;
  onChange: (i: number) => void;
}) {
  React.useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft" && index > 0) onChange(index - 1);
      if (e.key === "ArrowRight" && index < urls.length - 1)
        onChange(index + 1);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [index, urls.length, onClose, onChange]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm"
      onClick={onClose}
    >
      <button
        type="button"
        onClick={onClose}
        className="absolute right-4 top-4 rounded-full bg-white/10 p-2 text-white hover:bg-white/20"
        aria-label="Fechar"
      >
        <X className="size-5" />
      </button>

      {index > 0 && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onChange(index - 1);
          }}
          className="absolute left-4 rounded-full bg-white/10 p-2 text-white hover:bg-white/20"
          aria-label="Anterior"
        >
          <ChevronLeft className="size-5" />
        </button>
      )}
      {index < urls.length - 1 && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onChange(index + 1);
          }}
          className="absolute right-4 top-1/2 -translate-y-1/2 rounded-full bg-white/10 p-2 text-white hover:bg-white/20"
          aria-label="Próxima"
        >
          <ChevronRight className="size-5" />
        </button>
      )}

      <div
        className="relative h-[85vh] w-[90vw] max-w-5xl"
        onClick={(e) => e.stopPropagation()}
      >
        <Image
          src={urls[index]!}
          alt={`Foto ${index + 1}`}
          fill
          sizes="90vw"
          className="object-contain"
          priority
        />
      </div>
    </div>
  );
}
