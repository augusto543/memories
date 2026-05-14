/**
 * Constantes compartilhadas. Os limites de foto também são espelhados:
 *   - no storage bucket (allowed_mime_types, file_size_limit)
 *   - na trigger enforce_photo_limit_per_date (count)
 * Trocar aqui significa atualizar nos 3 lugares.
 */
export const PHOTO_LIMITS = {
  MAX_PER_DATE: 10,
  MAX_BYTES: 5 * 1024 * 1024,
  ALLOWED_MIME_TYPES: ["image/jpeg", "image/png", "image/webp"] as const,
} as const;

export const TEXT_LIMITS = {
  TITLE_MAX: 120,
  DESCRIPTION_MAX: 5000,
  LOCATION_MAX: 200,
  TAG_NAME_MAX: 40,
} as const;

export const RATING_LIMITS = {
  MIN: 1,
  MAX: 10,
} as const;
