/**
 * Tipos do schema do Supabase. Em produção, regere com:
 *   npx supabase gen types typescript --project-id <id> --schema public > src/types/database.ts
 *
 * O formato segue o padrão canônico do supabase-cli (incluindo o campo
 * __InternalSupabase e CompositeTypes/Enums com `{[_ in never]: never}`).
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  __InternalSupabase: {
    PostgrestVersion: "12";
  };
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          email: string;
          full_name: string | null;
          avatar_url: string | null;
          partner_id: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          email: string;
          full_name?: string | null;
          avatar_url?: string | null;
          partner_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          full_name?: string | null;
          avatar_url?: string | null;
          partner_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      dates: {
        Row: {
          id: string;
          user_id: string;
          title: string;
          description: string | null;
          location: string | null;
          rating: number | null;
          happened_at: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          title: string;
          description?: string | null;
          location?: string | null;
          rating?: number | null;
          happened_at?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          title?: string;
          description?: string | null;
          location?: string | null;
          rating?: number | null;
          happened_at?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      tags: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          name: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          name?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      date_tags: {
        Row: {
          id: string;
          date_id: string;
          tag_id: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          date_id: string;
          tag_id: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          date_id?: string;
          tag_id?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "date_tags_date_id_fkey";
            columns: ["date_id"];
            isOneToOne: false;
            referencedRelation: "dates";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "date_tags_tag_id_fkey";
            columns: ["tag_id"];
            isOneToOne: false;
            referencedRelation: "tags";
            referencedColumns: ["id"];
          },
        ];
      };
      notes: {
        Row: {
          id: string;
          user_id: string;
          content: string;
          mood: "love" | "longing" | "joy" | "calm" | "nostalgia" | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          content: string;
          mood?: "love" | "longing" | "joy" | "calm" | "nostalgia" | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          content?: string;
          mood?: "love" | "longing" | "joy" | "calm" | "nostalgia" | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      photos: {
        Row: {
          id: string;
          date_id: string;
          storage_path: string;
          width: number | null;
          height: number | null;
          position: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          date_id: string;
          storage_path: string;
          width?: number | null;
          height?: number | null;
          position?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          date_id?: string;
          storage_path?: string;
          width?: number | null;
          height?: number | null;
          position?: number;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "photos_date_id_fkey";
            columns: ["date_id"];
            isOneToOne: false;
            referencedRelation: "dates";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: { [_ in never]: never };
    Functions: {
      create_date_with_relations: {
        Args: {
          p_title: string;
          p_description: string | null;
          p_location: string | null;
          p_rating: number | null;
          p_happened_at: string | null;
          p_tag_names: string[] | null;
          p_photo_paths: string[] | null;
        };
        Returns: string;
      };
    };
    Enums: { [_ in never]: never };
    CompositeTypes: { [_ in never]: never };
  };
};

// Atalhos -------------------------------------------------------------------
export type Tables<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Row"];

export type InsertDto<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Insert"];

export type UpdateDto<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Update"];

export type DateRow    = Tables<"dates">;
export type PhotoRow   = Tables<"photos">;
export type TagRow     = Tables<"tags">;
export type ProfileRow = Tables<"profiles">;
export type NoteRow    = Tables<"notes">;
