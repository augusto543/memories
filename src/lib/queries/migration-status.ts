/** Distinguish an unapplied Supabase migration from an ordinary query failure. */
export class FeatureMigrationPendingError extends Error {
  constructor() {
    super("As novas tabelas ainda não foram criadas no Supabase.");
    this.name = "FeatureMigrationPendingError";
  }
}

export function isMissingFeatureTable(error: { code?: string; message?: string } | null): boolean {
  if (!error) return false;
  // PostgREST schema cache or PostgreSQL undefined_table.
  return error.code === "PGRST205" || error.code === "42P01"
    || (error.code === "PGRST200" && /relationship|schema cache/i.test(error.message ?? ""));
}
