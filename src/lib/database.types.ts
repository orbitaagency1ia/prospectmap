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
          next_follow_up_at: string | null;
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
          next_follow_up_at?: string | null;
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
          next_follow_up_at?: string | null;
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
      prospect_lists: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          focus: string;
          city_filter: string | null;
          sector_filter: string | null;
          service_focus:
            | "asistente_multicanal"
            | "automatizacion_interna"
            | "avatar_ia"
            | "saas_a_medida"
            | null;
          status: "borrador" | "activa" | "en_curso" | "completada" | "archivada";
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          name: string;
          focus?: string;
          city_filter?: string | null;
          sector_filter?: string | null;
          service_focus?:
            | "asistente_multicanal"
            | "automatizacion_interna"
            | "avatar_ia"
            | "saas_a_medida"
            | null;
          status?: "borrador" | "activa" | "en_curso" | "completada" | "archivada";
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          name?: string;
          focus?: string;
          city_filter?: string | null;
          sector_filter?: string | null;
          service_focus?:
            | "asistente_multicanal"
            | "automatizacion_interna"
            | "avatar_ia"
            | "saas_a_medida"
            | null;
          status?: "borrador" | "activa" | "en_curso" | "completada" | "archivada";
          notes?: string | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "prospect_lists_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          }
        ];
      };
      prospect_list_items: {
        Row: {
          id: string;
          list_id: string;
          user_id: string;
          business_id: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          list_id: string;
          user_id: string;
          business_id: string;
          created_at?: string;
        };
        Update: {
          list_id?: string;
          user_id?: string;
          business_id?: string;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "prospect_list_items_list_id_fkey";
            columns: ["list_id"];
            isOneToOne: false;
            referencedRelation: "prospect_lists";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "prospect_list_items_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "prospect_list_items_business_id_fkey";
            columns: ["business_id"];
            isOneToOne: false;
            referencedRelation: "businesses";
            referencedColumns: ["id"];
          }
        ];
      };
      attack_sessions: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          source: "daily_queue" | "list" | "territory" | "priorities" | "pipeline" | "alerts" | "manual";
          source_ref: string | null;
          status: "draft" | "active" | "paused" | "completed" | "archived";
          queue_filters: Json;
          started_at: string;
          ended_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          name?: string;
          source?: "daily_queue" | "list" | "territory" | "priorities" | "pipeline" | "alerts" | "manual";
          source_ref?: string | null;
          status?: "draft" | "active" | "paused" | "completed" | "archived";
          queue_filters?: Json;
          started_at?: string;
          ended_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          name?: string;
          source?: "daily_queue" | "list" | "territory" | "priorities" | "pipeline" | "alerts" | "manual";
          source_ref?: string | null;
          status?: "draft" | "active" | "paused" | "completed" | "archived";
          queue_filters?: Json;
          started_at?: string;
          ended_at?: string | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "attack_sessions_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          }
        ];
      };
      attack_session_items: {
        Row: {
          id: string;
          session_id: string;
          user_id: string;
          business_id: string;
          position: number;
          queue_reason: string;
          why_today: string[];
          zone_key: string | null;
          zone_label: string | null;
          pinned_for_today: boolean;
          status: "pending" | "in_progress" | "worked" | "skipped" | "dismissed";
          last_worked_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          session_id: string;
          user_id: string;
          business_id: string;
          position?: number;
          queue_reason?: string;
          why_today?: string[];
          zone_key?: string | null;
          zone_label?: string | null;
          pinned_for_today?: boolean;
          status?: "pending" | "in_progress" | "worked" | "skipped" | "dismissed";
          last_worked_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          session_id?: string;
          user_id?: string;
          business_id?: string;
          position?: number;
          queue_reason?: string;
          why_today?: string[];
          zone_key?: string | null;
          zone_label?: string | null;
          pinned_for_today?: boolean;
          status?: "pending" | "in_progress" | "worked" | "skipped" | "dismissed";
          last_worked_at?: string | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "attack_session_items_session_id_fkey";
            columns: ["session_id"];
            isOneToOne: false;
            referencedRelation: "attack_sessions";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "attack_session_items_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "attack_session_items_business_id_fkey";
            columns: ["business_id"];
            isOneToOne: false;
            referencedRelation: "businesses";
            referencedColumns: ["id"];
          }
        ];
      };
      attack_results: {
        Row: {
          id: string;
          user_id: string;
          session_id: string | null;
          session_item_id: string | null;
          business_id: string;
          result:
            | "no_contactado"
            | "contacto_intentado"
            | "hablo_con_alguien"
            | "interesado"
            | "reunion_conseguida"
            | "propuesta_pendiente"
            | "no_encaja"
            | "perdido"
            | "volver_mas_tarde";
          note_text: string | null;
          follow_up_at: string | null;
          priority_after: "alta" | "media" | "baja" | null;
          suggested_next_step: string | null;
          suggested_due_at: string | null;
          moved_to_pipeline: boolean;
          added_to_list_id: string | null;
          discarded: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          session_id?: string | null;
          session_item_id?: string | null;
          business_id: string;
          result:
            | "no_contactado"
            | "contacto_intentado"
            | "hablo_con_alguien"
            | "interesado"
            | "reunion_conseguida"
            | "propuesta_pendiente"
            | "no_encaja"
            | "perdido"
            | "volver_mas_tarde";
          note_text?: string | null;
          follow_up_at?: string | null;
          priority_after?: "alta" | "media" | "baja" | null;
          suggested_next_step?: string | null;
          suggested_due_at?: string | null;
          moved_to_pipeline?: boolean;
          added_to_list_id?: string | null;
          discarded?: boolean;
          created_at?: string;
        };
        Update: {
          result?:
            | "no_contactado"
            | "contacto_intentado"
            | "hablo_con_alguien"
            | "interesado"
            | "reunion_conseguida"
            | "propuesta_pendiente"
            | "no_encaja"
            | "perdido"
            | "volver_mas_tarde";
          note_text?: string | null;
          follow_up_at?: string | null;
          priority_after?: "alta" | "media" | "baja" | null;
          suggested_next_step?: string | null;
          suggested_due_at?: string | null;
          moved_to_pipeline?: boolean;
          added_to_list_id?: string | null;
          discarded?: boolean;
        };
        Relationships: [
          {
            foreignKeyName: "attack_results_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "attack_results_session_id_fkey";
            columns: ["session_id"];
            isOneToOne: false;
            referencedRelation: "attack_sessions";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "attack_results_session_item_id_fkey";
            columns: ["session_item_id"];
            isOneToOne: false;
            referencedRelation: "attack_session_items";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "attack_results_business_id_fkey";
            columns: ["business_id"];
            isOneToOne: false;
            referencedRelation: "businesses";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "attack_results_added_to_list_id_fkey";
            columns: ["added_to_list_id"];
            isOneToOne: false;
            referencedRelation: "prospect_lists";
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
      business_events: {
        Row: {
          id: string;
          user_id: string;
          business_id: string;
          event_type:
            | "business_saved"
            | "business_updated"
            | "status_changed"
            | "priority_changed"
            | "follow_up_scheduled"
            | "note_added"
            | "attack_result_logged";
          title: string;
          details: string | null;
          metadata: Json;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          business_id: string;
          event_type:
            | "business_saved"
            | "business_updated"
            | "status_changed"
            | "priority_changed"
            | "follow_up_scheduled"
            | "note_added"
            | "attack_result_logged";
          title: string;
          details?: string | null;
          metadata?: Json;
          created_at?: string;
        };
        Update: {
          details?: string | null;
          metadata?: Json;
        };
        Relationships: [
          {
            foreignKeyName: "business_events_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "business_events_business_id_fkey";
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
