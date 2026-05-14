import type { DateRow, PhotoRow, TagRow } from "./database";

/** Encontro hidratado com suas fotos e tags — formato usado pelos componentes. */
export interface DateWithRelations extends DateRow {
  photos: PhotoRow[];
  tags: TagRow[];
  /** URLs assinadas das fotos, na mesma ordem de `photos`. */
  photoUrls: string[];
}

/** Card resumido para a timeline (foto de capa + contagens). */
export interface DateCard {
  id: string;
  title: string;
  description: string | null;
  location: string | null;
  rating: number | null;
  happened_at: string;
  coverUrl: string | null;
  photoCount: number;
  tags: Pick<TagRow, "id" | "name">[];
}

/** Estatísticas do dashboard. */
export interface DashboardStats {
  totalDates: number;
  totalPhotos: number;
  averageRating: number | null;
  topRated: DateCard[];
  thisYearCount: number;
  uniqueLocations: number;
}
