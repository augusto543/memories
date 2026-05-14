import { z } from "zod";
import { PHOTO_LIMITS } from "@/lib/constants";

const ALLOWED = PHOTO_LIMITS.ALLOWED_MIME_TYPES as readonly string[];

/**
 * Valida um File antes de subir.
 * Roda tanto no client (RHF) quanto no server (Server Action) — Zod aceita
 * `instanceof File` em ambos os runtimes Node 20+ / Edge.
 */
export const photoFileSchema = z
  .custom<File>(
    (v) => typeof File !== "undefined" && v instanceof File,
    "Arquivo inválido",
  )
  .refine(
    (f) => ALLOWED.includes(f.type),
    `Formato não suportado. Use ${ALLOWED.map((m) => m.split("/")[1]).join(", ")}.`,
  )
  .refine(
    (f) => f.size <= PHOTO_LIMITS.MAX_BYTES,
    `Imagem maior que ${PHOTO_LIMITS.MAX_BYTES / 1024 / 1024}MB`,
  );

export const uploadPhotoSchema = z.object({
  dateId: z.string().uuid(),
  file: photoFileSchema,
});

export const photoIdSchema = z.object({
  id: z.string().uuid(),
});
