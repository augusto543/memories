import { z } from "zod";
import { TEXT_LIMITS } from "@/lib/constants";

export const tagNameSchema = z
  .string()
  .trim()
  .min(1, "Nome da tag não pode ser vazio")
  .max(TEXT_LIMITS.TAG_NAME_MAX, "Tag muito longa");

export const createTagSchema = z.object({ name: tagNameSchema });

export const attachTagSchema = z.object({
  dateId: z.string().uuid(),
  tagId: z.string().uuid(),
});

export const detachTagSchema = attachTagSchema;
