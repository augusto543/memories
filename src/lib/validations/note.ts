import { z } from "zod";

export const MOOD_VALUES = ["love", "longing", "joy", "calm", "nostalgia"] as const;
export type Mood = (typeof MOOD_VALUES)[number];

export const moodSchema = z.enum(MOOD_VALUES).nullable().optional();

export const createNoteSchema = z.object({
  content: z.string().trim().min(1, "Escreva algo").max(500, "Máximo 500 caracteres"),
  mood: moodSchema,
});
export type CreateNoteInput = z.infer<typeof createNoteSchema>;

export const noteIdSchema = z.object({ id: z.string().uuid() });
