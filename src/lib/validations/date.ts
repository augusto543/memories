import { z } from "zod";
import { PHOTO_LIMITS, RATING_LIMITS, TEXT_LIMITS } from "@/lib/constants";

/**
 * Schema base de um encontro (compartilhado entre create e update).
 */
const dateFields = {
  title: z
    .string()
    .trim()
    .min(1, "Dê um título ao encontro")
    .max(TEXT_LIMITS.TITLE_MAX, `Máximo ${TEXT_LIMITS.TITLE_MAX} caracteres`),
  description: z
    .string()
    .trim()
    .max(TEXT_LIMITS.DESCRIPTION_MAX, "Descrição muito longa")
    .optional()
    .transform((v) => (v && v.length > 0 ? v : null)),
  location: z
    .string()
    .trim()
    .max(TEXT_LIMITS.LOCATION_MAX, "Local muito longo")
    .optional()
    .transform((v) => (v && v.length > 0 ? v : null)),
  rating: z
    .number()
    .int()
    .min(RATING_LIMITS.MIN, `Mínimo ${RATING_LIMITS.MIN}`)
    .max(RATING_LIMITS.MAX, `Máximo ${RATING_LIMITS.MAX}`)
    .nullable()
    .optional()
    .transform((v) => (typeof v === "number" ? v : null)),
  happened_at: z
    .string()
    .datetime({ offset: true })
    .or(z.string().regex(/^\d{4}-\d{2}-\d{2}/))
    .transform((v) => new Date(v).toISOString()),
  tags: z
    .array(
      z
        .string()
        .trim()
        .min(1)
        .max(TEXT_LIMITS.TAG_NAME_MAX, "Tag muito longa"),
    )
    .max(20, "Máximo 20 tags por encontro")
    .default([])
    .transform((arr) => {
      // dedupe case-insensitive preservando a forma original do primeiro hit
      const seen = new Set<string>();
      const out: string[] = [];
      for (const tag of arr) {
        const key = tag.toLowerCase();
        if (!seen.has(key)) {
          seen.add(key);
          out.push(tag);
        }
      }
      return out;
    }),
};

export const createDateSchema = z.object({
  ...dateFields,
  photoPaths: z
    .array(z.string().min(1))
    .max(
      PHOTO_LIMITS.MAX_PER_DATE,
      `Máximo ${PHOTO_LIMITS.MAX_PER_DATE} fotos por encontro`,
    )
    .default([]),
});

export const updateDateSchema = z.object({
  id: z.string().uuid(),
  ...dateFields,
});

export const dateIdSchema = z.object({
  id: z.string().uuid(),
});

export type CreateDateInput = z.input<typeof createDateSchema>;
export type UpdateDateInput = z.input<typeof updateDateSchema>;
