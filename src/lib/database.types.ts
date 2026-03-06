export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          email: string;
          company_name: string;
          city_name: string;
          city_lat: number | null;
          city_lng: number | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          email: string;
          company_name?: string;
          city_name?: string;
          city_lat?: number | null;
          city_lng?: number | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          email?: string;
          company_name?: string;
          city_name?: string;
          city_lat?: number | null;
          city_lng?: number | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      businesses: {
        Row: {
          id: string;
          user_id: string;
          source: "overpass" | "csv" | "manual";
          external_source_id: string | null;
          vertical_override:
            | "autoescuelas"
            | "clinicas"
            | "hoteles"
            | "general_b2b"
            | null;
          name: string;
          address: string | null;
          city: string | null;
          category: string | null;
          phone: string | null;
          email: string | null;
          website: string | null;
          opening_hours: string | null;
          lat: number;
          lng: number;
          owner_name: string | null;
          owner_role: string | null;
          direct_phone: string | null;
          direct_email: string | null;
          contact_notes: string | null;
          prospect_status:
            | "sin_contactar"
            | "intento_contacto"
            | "contactado"
            | "reunion_agendada"
            | "propuesta_enviada"
            | "negociacion"
            | "ganado"
            | "perdido"
            | "bloqueado";
          priority: "alta" | "media" | "baja";
          last_contact_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          source: "overpass" | "csv" | "manual";
          external_source_id?: string | null;
          vertical_override?:
            | "autoescuelas"
            | "clinicas"
            | "hoteles"
            | "general_b2b"
            | null;
          name: string;
          address?: string | null;
          city?: string | null;
          category?: string | null;
          phone?: string | null;
          email?: string | null;
          website?: string | null;
          opening_hours?: string | null;
          lat: number;
          lng: number;
          owner_name?: string | null;
          owner_role?: string | null;
          direct_phone?: string | null;
          direct_email?: string | null;
          contact_notes?: string | null;
          prospect_status?:
            | "sin_contactar"
            | "intento_contacto"
            | "contactado"
            | "reunion_agendada"
            | "propuesta_enviada"
            | "negociacion"
            | "ganado"
            | "perdido"
            | "bloqueado";
          priority?: "alta" | "media" | "baja";
          last_contact_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          source?: "overpass" | "csv" | "manual";
          external_source_id?: string | null;
          vertical_override?:
            | "autoescuelas"
            | "clinicas"
            | "hoteles"
            | "general_b2b"
            | null;
          name?: string;
          address?: string | null;
          city?: string | null;
          category?: string | null;
          phone?: string | null;
          email?: string | null;
          website?: string | null;
          opening_hours?: string | null;
          lat?: number;
          lng?: number;
          owner_name?: string | null;
          owner_role?: string | null;
          direct_phone?: string | null;
          direct_email?: string | null;
          contact_notes?: string | null;
          prospect_status?:
            | "sin_contactar"
            | "intento_contacto"
            | "contactado"
            | "reunion_agendada"
            | "propuesta_enviada"
            | "negociacion"
            | "ganado"
            | "perdido"
            | "bloqueado";
          priority?: "alta" | "media" | "baja";
          last_contact_at?: string | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "businesses_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          }
        ];
      };
      account_profiles: {
        Row: {
          user_id: string;
          sector: string;
          target_verticals: string[];
          target_subsectors: string[];
          ideal_customer_profile: Json;
          offer_profile: Json;
          pricing_profile: Json;
          prospecting_preferences: Json;
          knowledge_base_text: string;
          knowledge_summary: Json;
          onboarding_completed: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          user_id: string;
          sector?: string;
          target_verticals?: string[];
          target_subsectors?: string[];
          ideal_customer_profile?: Json;
          offer_profile?: Json;
          pricing_profile?: Json;
          prospecting_preferences?: Json;
          knowledge_base_text?: string;
          knowledge_summary?: Json;
          onboarding_completed?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          sector?: string;
          target_verticals?: string[];
          target_subsectors?: string[];
          ideal_customer_profile?: Json;
          offer_profile?: Json;
          pricing_profile?: Json;
          prospecting_preferences?: Json;
          knowledge_base_text?: string;
          knowledge_summary?: Json;
          onboarding_completed?: boolean;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "account_profiles_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: true;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          }
        ];
      };
      account_settings: {
        Row: {
          user_id: string;
          vertical: "autoescuelas" | "clinicas" | "hoteles" | "general_b2b";
          demo_mode: boolean;
          scoring_config: Json;
          commercial_preferences: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          user_id: string;
          vertical?: "autoescuelas" | "clinicas" | "hoteles" | "general_b2b";
          demo_mode?: boolean;
          scoring_config?: Json;
          commercial_preferences?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          vertical?: "autoescuelas" | "clinicas" | "hoteles" | "general_b2b";
          demo_mode?: boolean;
          scoring_config?: Json;
          commercial_preferences?: Json;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "account_settings_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: true;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          }
        ];
      };
      business_notes: {
        Row: {
          id: string;
          user_id: string;
          business_id: string;
          note_text: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          business_id: string;
          note_text: string;
          created_at?: string;
        };
        Update: {
          note_text?: string;
        };
        Relationships: [
          {
            foreignKeyName: "business_notes_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "business_notes_business_id_fkey";
            columns: ["business_id"];
            isOneToOne: false;
            referencedRelation: "businesses";
            referencedColumns: ["id"];
          }
        ];
      };
      csv_import_errors: {
        Row: {
          id: string;
          user_id: string;
          raw_name: string | null;
          raw_address: string | null;
          raw_phone: string | null;
          raw_email: string | null;
          raw_category: string | null;
          raw_contact_name: string | null;
          raw_notes: string | null;
          error_reason: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          raw_name?: string | null;
          raw_address?: string | null;
          raw_phone?: string | null;
          raw_email?: string | null;
          raw_category?: string | null;
          raw_contact_name?: string | null;
          raw_notes?: string | null;
          error_reason: string;
          created_at?: string;
        };
        Update: {
          raw_name?: string | null;
          raw_address?: string | null;
          raw_phone?: string | null;
          raw_email?: string | null;
          raw_category?: string | null;
          raw_contact_name?: string | null;
          raw_notes?: string | null;
          error_reason?: string;
        };
        Relationships: [
          {
            foreignKeyName: "csv_import_errors_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          }
        ];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};
