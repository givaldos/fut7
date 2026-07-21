export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      athlete_position_preferences: {
        Row: {
          athlete_id: string
          created_at: string
          position_code: string
          priority: number
          sport_format: Database["public"]["Enums"]["sport_format"]
          team_id: string
        }
        Insert: {
          athlete_id: string
          created_at?: string
          position_code: string
          priority: number
          sport_format: Database["public"]["Enums"]["sport_format"]
          team_id: string
        }
        Update: {
          athlete_id?: string
          created_at?: string
          position_code?: string
          priority?: number
          sport_format?: Database["public"]["Enums"]["sport_format"]
          team_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "athlete_position_preferences_athlete_id_team_id_fkey"
            columns: ["athlete_id", "team_id"]
            isOneToOne: false
            referencedRelation: "athletes"
            referencedColumns: ["id", "team_id"]
          },
          {
            foreignKeyName: "athlete_position_preferences_sport_format_position_code_fkey"
            columns: ["sport_format", "position_code"]
            isOneToOne: false
            referencedRelation: "positions"
            referencedColumns: ["sport_format", "code"]
          },
        ]
      }
      athlete_private: {
        Row: {
          athlete_id: string
          birth_date: string | null
          created_at: string
          email: string | null
          notes: string | null
          phone_e164: string | null
          privacy_terms_accepted_at: string | null
          privacy_terms_version: string | null
          team_id: string
          updated_at: string
        }
        Insert: {
          athlete_id: string
          birth_date?: string | null
          created_at?: string
          email?: string | null
          notes?: string | null
          phone_e164?: string | null
          privacy_terms_accepted_at?: string | null
          privacy_terms_version?: string | null
          team_id: string
          updated_at?: string
        }
        Update: {
          athlete_id?: string
          birth_date?: string | null
          created_at?: string
          email?: string | null
          notes?: string | null
          phone_e164?: string | null
          privacy_terms_accepted_at?: string | null
          privacy_terms_version?: string | null
          team_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "athlete_private_athlete_id_team_id_fkey"
            columns: ["athlete_id", "team_id"]
            isOneToOne: false
            referencedRelation: "athletes"
            referencedColumns: ["id", "team_id"]
          },
        ]
      }
      athletes: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          created_at: string
          created_by: string | null
          full_name: string
          id: string
          joined_on: string | null
          photo_path: string | null
          preferred_name: string | null
          public_profile: boolean
          registration_number: number
          registration_source: Database["public"]["Enums"]["registration_source"]
          removed_at: string | null
          removed_by: string | null
          shirt_number: number | null
          status: Database["public"]["Enums"]["athlete_status"]
          team_id: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          created_by?: string | null
          full_name: string
          id?: string
          joined_on?: string | null
          photo_path?: string | null
          preferred_name?: string | null
          public_profile?: boolean
          registration_number?: never
          registration_source?: Database["public"]["Enums"]["registration_source"]
          removed_at?: string | null
          removed_by?: string | null
          shirt_number?: number | null
          status?: Database["public"]["Enums"]["athlete_status"]
          team_id: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          created_by?: string | null
          full_name?: string
          id?: string
          joined_on?: string | null
          photo_path?: string | null
          preferred_name?: string | null
          public_profile?: boolean
          registration_number?: never
          registration_source?: Database["public"]["Enums"]["registration_source"]
          removed_at?: string | null
          removed_by?: string | null
          shirt_number?: number | null
          status?: Database["public"]["Enums"]["athlete_status"]
          team_id?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "athletes_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_logs: {
        Row: {
          action: string
          actor_id: string | null
          created_at: string
          entity_id: string
          entity_type: string
          id: number
          metadata: Json
          request_id: string | null
          team_id: string | null
        }
        Insert: {
          action: string
          actor_id?: string | null
          created_at?: string
          entity_id: string
          entity_type: string
          id?: never
          metadata?: Json
          request_id?: string | null
          team_id?: string | null
        }
        Update: {
          action?: string
          actor_id?: string | null
          created_at?: string
          entity_id?: string
          entity_type?: string
          id?: never
          metadata?: Json
          request_id?: string | null
          team_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_logs_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      communication_consents: {
        Row: {
          athlete_id: string
          channel: Database["public"]["Enums"]["message_channel"]
          created_at: string
          evidence: string
          granted_at: string | null
          revoked_at: string | null
          status: Database["public"]["Enums"]["consent_status"]
          team_id: string
          updated_at: string
        }
        Insert: {
          athlete_id: string
          channel: Database["public"]["Enums"]["message_channel"]
          created_at?: string
          evidence: string
          granted_at?: string | null
          revoked_at?: string | null
          status: Database["public"]["Enums"]["consent_status"]
          team_id: string
          updated_at?: string
        }
        Update: {
          athlete_id?: string
          channel?: Database["public"]["Enums"]["message_channel"]
          created_at?: string
          evidence?: string
          granted_at?: string | null
          revoked_at?: string | null
          status?: Database["public"]["Enums"]["consent_status"]
          team_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "communication_consents_athlete_id_team_id_fkey"
            columns: ["athlete_id", "team_id"]
            isOneToOne: false
            referencedRelation: "athletes"
            referencedColumns: ["id", "team_id"]
          },
        ]
      }
      event_attendance: {
        Row: {
          athlete_id: string
          created_at: string
          event_id: string
          responded_at: string | null
          responded_by: string | null
          source: Database["public"]["Enums"]["attendance_source"]
          status: Database["public"]["Enums"]["attendance_status"]
          team_id: string
          updated_at: string
        }
        Insert: {
          athlete_id: string
          created_at?: string
          event_id: string
          responded_at?: string | null
          responded_by?: string | null
          source?: Database["public"]["Enums"]["attendance_source"]
          status?: Database["public"]["Enums"]["attendance_status"]
          team_id: string
          updated_at?: string
        }
        Update: {
          athlete_id?: string
          created_at?: string
          event_id?: string
          responded_at?: string | null
          responded_by?: string | null
          source?: Database["public"]["Enums"]["attendance_source"]
          status?: Database["public"]["Enums"]["attendance_status"]
          team_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_attendance_athlete_id_team_id_fkey"
            columns: ["athlete_id", "team_id"]
            isOneToOne: false
            referencedRelation: "athletes"
            referencedColumns: ["id", "team_id"]
          },
          {
            foreignKeyName: "event_attendance_event_id_team_id_fkey"
            columns: ["event_id", "team_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id", "team_id"]
          },
        ]
      }
      event_series: {
        Row: {
          attendance_deadline_offset: string
          created_at: string
          created_by: string
          duration_minutes: number
          ends_on: string | null
          id: string
          is_active: boolean
          kind: Database["public"]["Enums"]["event_kind"]
          local_start_time: string
          organization_mode: Database["public"]["Enums"]["organization_mode"]
          recurrence_rule: string
          sport_format: Database["public"]["Enums"]["sport_format"]
          starts_on: string
          team_id: string
          timezone: string
          title: string
          updated_at: string
          venue_id: string | null
        }
        Insert: {
          attendance_deadline_offset?: string
          created_at?: string
          created_by: string
          duration_minutes: number
          ends_on?: string | null
          id?: string
          is_active?: boolean
          kind: Database["public"]["Enums"]["event_kind"]
          local_start_time: string
          organization_mode?: Database["public"]["Enums"]["organization_mode"]
          recurrence_rule: string
          sport_format: Database["public"]["Enums"]["sport_format"]
          starts_on: string
          team_id: string
          timezone?: string
          title: string
          updated_at?: string
          venue_id?: string | null
        }
        Update: {
          attendance_deadline_offset?: string
          created_at?: string
          created_by?: string
          duration_minutes?: number
          ends_on?: string | null
          id?: string
          is_active?: boolean
          kind?: Database["public"]["Enums"]["event_kind"]
          local_start_time?: string
          organization_mode?: Database["public"]["Enums"]["organization_mode"]
          recurrence_rule?: string
          sport_format?: Database["public"]["Enums"]["sport_format"]
          starts_on?: string
          team_id?: string
          timezone?: string
          title?: string
          updated_at?: string
          venue_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "event_series_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_series_venue_id_team_id_fkey"
            columns: ["venue_id", "team_id"]
            isOneToOne: false
            referencedRelation: "venues"
            referencedColumns: ["id", "team_id"]
          },
        ]
      }
      event_squads: {
        Row: {
          color: string | null
          created_at: string
          event_id: string
          id: string
          is_official: boolean
          name: string
          sort_order: number
          sport_format: Database["public"]["Enums"]["sport_format"]
          team_id: string
          updated_at: string
        }
        Insert: {
          color?: string | null
          created_at?: string
          event_id: string
          id?: string
          is_official?: boolean
          name: string
          sort_order?: number
          sport_format: Database["public"]["Enums"]["sport_format"]
          team_id: string
          updated_at?: string
        }
        Update: {
          color?: string | null
          created_at?: string
          event_id?: string
          id?: string
          is_official?: boolean
          name?: string
          sort_order?: number
          sport_format?: Database["public"]["Enums"]["sport_format"]
          team_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_squads_event_id_team_id_sport_format_fkey"
            columns: ["event_id", "team_id", "sport_format"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id", "team_id", "sport_format"]
          },
        ]
      }
      events: {
        Row: {
          attendance_deadline: string | null
          created_at: string
          created_by: string
          ends_at: string
          id: string
          is_series_exception: boolean
          kind: Database["public"]["Enums"]["event_kind"]
          opponent_name: string | null
          organization_mode: Database["public"]["Enums"]["organization_mode"]
          series_id: string | null
          series_position: number | null
          sport_format: Database["public"]["Enums"]["sport_format"]
          starts_at: string
          status: Database["public"]["Enums"]["event_status"]
          team_id: string
          title: string
          updated_at: string
          venue_id: string | null
        }
        Insert: {
          attendance_deadline?: string | null
          created_at?: string
          created_by: string
          ends_at: string
          id?: string
          is_series_exception?: boolean
          kind: Database["public"]["Enums"]["event_kind"]
          opponent_name?: string | null
          organization_mode?: Database["public"]["Enums"]["organization_mode"]
          series_id?: string | null
          series_position?: number | null
          sport_format: Database["public"]["Enums"]["sport_format"]
          starts_at: string
          status?: Database["public"]["Enums"]["event_status"]
          team_id: string
          title: string
          updated_at?: string
          venue_id?: string | null
        }
        Update: {
          attendance_deadline?: string | null
          created_at?: string
          created_by?: string
          ends_at?: string
          id?: string
          is_series_exception?: boolean
          kind?: Database["public"]["Enums"]["event_kind"]
          opponent_name?: string | null
          organization_mode?: Database["public"]["Enums"]["organization_mode"]
          series_id?: string | null
          series_position?: number | null
          sport_format?: Database["public"]["Enums"]["sport_format"]
          starts_at?: string
          status?: Database["public"]["Enums"]["event_status"]
          team_id?: string
          title?: string
          updated_at?: string
          venue_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "events_series_id_team_id_fkey"
            columns: ["series_id", "team_id"]
            isOneToOne: false
            referencedRelation: "event_series"
            referencedColumns: ["id", "team_id"]
          },
          {
            foreignKeyName: "events_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "events_venue_id_team_id_fkey"
            columns: ["venue_id", "team_id"]
            isOneToOne: false
            referencedRelation: "venues"
            referencedColumns: ["id", "team_id"]
          },
        ]
      }
      lineup_spots: {
        Row: {
          athlete_id: string
          created_at: string
          event_id: string
          field_x: number | null
          field_y: number | null
          id: string
          position_code: string | null
          slot_kind: Database["public"]["Enums"]["lineup_slot_kind"]
          sort_order: number
          sport_format: Database["public"]["Enums"]["sport_format"]
          squad_id: string
          team_id: string
          updated_at: string
        }
        Insert: {
          athlete_id: string
          created_at?: string
          event_id: string
          field_x?: number | null
          field_y?: number | null
          id?: string
          position_code?: string | null
          slot_kind?: Database["public"]["Enums"]["lineup_slot_kind"]
          sort_order?: number
          sport_format: Database["public"]["Enums"]["sport_format"]
          squad_id: string
          team_id: string
          updated_at?: string
        }
        Update: {
          athlete_id?: string
          created_at?: string
          event_id?: string
          field_x?: number | null
          field_y?: number | null
          id?: string
          position_code?: string | null
          slot_kind?: Database["public"]["Enums"]["lineup_slot_kind"]
          sort_order?: number
          sport_format?: Database["public"]["Enums"]["sport_format"]
          squad_id?: string
          team_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "lineup_spots_athlete_id_team_id_fkey"
            columns: ["athlete_id", "team_id"]
            isOneToOne: false
            referencedRelation: "athletes"
            referencedColumns: ["id", "team_id"]
          },
          {
            foreignKeyName: "lineup_spots_sport_format_position_code_fkey"
            columns: ["sport_format", "position_code"]
            isOneToOne: false
            referencedRelation: "positions"
            referencedColumns: ["sport_format", "code"]
          },
          {
            foreignKeyName: "lineup_spots_squad_id_team_id_event_id_sport_format_fkey"
            columns: ["squad_id", "team_id", "event_id", "sport_format"]
            isOneToOne: false
            referencedRelation: "event_squads"
            referencedColumns: ["id", "team_id", "event_id", "sport_format"]
          },
        ]
      }
      match_incidents: {
        Row: {
          assist_athlete_id: string | null
          athlete_id: string
          created_at: string
          created_by: string
          event_id: string
          id: string
          kind: Database["public"]["Enums"]["match_incident_kind"]
          minute: number | null
          notes: string | null
          scoring_side: number | null
          team_id: string
          updated_at: string
        }
        Insert: {
          assist_athlete_id?: string | null
          athlete_id: string
          created_at?: string
          created_by: string
          event_id: string
          id?: string
          kind: Database["public"]["Enums"]["match_incident_kind"]
          minute?: number | null
          notes?: string | null
          scoring_side?: number | null
          team_id: string
          updated_at?: string
        }
        Update: {
          assist_athlete_id?: string | null
          athlete_id?: string
          created_at?: string
          created_by?: string
          event_id?: string
          id?: string
          kind?: Database["public"]["Enums"]["match_incident_kind"]
          minute?: number | null
          notes?: string | null
          scoring_side?: number | null
          team_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "match_incidents_assist_athlete_id_team_id_fkey"
            columns: ["assist_athlete_id", "team_id"]
            isOneToOne: false
            referencedRelation: "athletes"
            referencedColumns: ["id", "team_id"]
          },
          {
            foreignKeyName: "match_incidents_athlete_id_team_id_fkey"
            columns: ["athlete_id", "team_id"]
            isOneToOne: false
            referencedRelation: "athletes"
            referencedColumns: ["id", "team_id"]
          },
          {
            foreignKeyName: "match_incidents_event_id_team_id_fkey"
            columns: ["event_id", "team_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id", "team_id"]
          },
        ]
      }
      match_reports: {
        Row: {
          created_at: string
          created_by: string
          event_id: string
          finalized_at: string | null
          finalized_by: string | null
          id: string
          notes: string | null
          side_a_label: string
          side_a_score: number
          side_b_label: string
          side_b_score: number
          team_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by: string
          event_id: string
          finalized_at?: string | null
          finalized_by?: string | null
          id?: string
          notes?: string | null
          side_a_label?: string
          side_a_score?: number
          side_b_label?: string
          side_b_score?: number
          team_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          event_id?: string
          finalized_at?: string | null
          finalized_by?: string | null
          id?: string
          notes?: string | null
          side_a_label?: string
          side_a_score?: number
          side_b_label?: string
          side_b_score?: number
          team_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "match_reports_event_id_team_id_fkey"
            columns: ["event_id", "team_id"]
            isOneToOne: true
            referencedRelation: "events"
            referencedColumns: ["id", "team_id"]
          },
        ]
      }
      notification_outbox: {
        Row: {
          athlete_id: string | null
          attempts: number
          available_at: string
          channel: Database["public"]["Enums"]["message_channel"]
          created_at: string
          dedupe_key: string
          event_id: string | null
          id: string
          last_error: string | null
          payload: Json
          processed_at: string | null
          provider_message_id: string | null
          recipient: string
          status: Database["public"]["Enums"]["message_status"]
          team_id: string
          template_key: string
          updated_at: string
        }
        Insert: {
          athlete_id?: string | null
          attempts?: number
          available_at?: string
          channel: Database["public"]["Enums"]["message_channel"]
          created_at?: string
          dedupe_key: string
          event_id?: string | null
          id?: string
          last_error?: string | null
          payload?: Json
          processed_at?: string | null
          provider_message_id?: string | null
          recipient: string
          status?: Database["public"]["Enums"]["message_status"]
          team_id: string
          template_key: string
          updated_at?: string
        }
        Update: {
          athlete_id?: string | null
          attempts?: number
          available_at?: string
          channel?: Database["public"]["Enums"]["message_channel"]
          created_at?: string
          dedupe_key?: string
          event_id?: string | null
          id?: string
          last_error?: string | null
          payload?: Json
          processed_at?: string | null
          provider_message_id?: string | null
          recipient?: string
          status?: Database["public"]["Enums"]["message_status"]
          team_id?: string
          template_key?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "notification_outbox_athlete_id_team_id_fkey"
            columns: ["athlete_id", "team_id"]
            isOneToOne: false
            referencedRelation: "athletes"
            referencedColumns: ["id", "team_id"]
          },
          {
            foreignKeyName: "notification_outbox_event_id_team_id_fkey"
            columns: ["event_id", "team_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id", "team_id"]
          },
          {
            foreignKeyName: "notification_outbox_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      player_position_preferences: {
        Row: {
          created_at: string
          position_code: string
          priority: number
          sport_format: Database["public"]["Enums"]["sport_format"]
          user_id: string
        }
        Insert: {
          created_at?: string
          position_code: string
          priority: number
          sport_format: Database["public"]["Enums"]["sport_format"]
          user_id: string
        }
        Update: {
          created_at?: string
          position_code?: string
          priority?: number
          sport_format?: Database["public"]["Enums"]["sport_format"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "player_position_preferences_sport_format_position_code_fkey"
            columns: ["sport_format", "position_code"]
            isOneToOne: false
            referencedRelation: "positions"
            referencedColumns: ["sport_format", "code"]
          },
        ]
      }
      player_profiles: {
        Row: {
          bio: string | null
          birth_date: string | null
          created_at: string
          display_name: string
          handle: string
          handle_changed_at: string | null
          is_public: boolean
          phone_verified_at: string
          photo_path: string | null
          preferred_name: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          bio?: string | null
          birth_date?: string | null
          created_at?: string
          display_name: string
          handle: string
          handle_changed_at?: string | null
          is_public?: boolean
          phone_verified_at: string
          photo_path?: string | null
          preferred_name?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          bio?: string | null
          birth_date?: string | null
          created_at?: string
          display_name?: string
          handle?: string
          handle_changed_at?: string | null
          is_public?: boolean
          phone_verified_at?: string
          photo_path?: string | null
          preferred_name?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      positions: {
        Row: {
          category: string
          code: string
          label: string
          sort_order: number
          sport_format: Database["public"]["Enums"]["sport_format"]
        }
        Insert: {
          category: string
          code: string
          label: string
          sort_order: number
          sport_format: Database["public"]["Enums"]["sport_format"]
        }
        Update: {
          category?: string
          code?: string
          label?: string
          sort_order?: number
          sport_format?: Database["public"]["Enums"]["sport_format"]
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          display_name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          display_name: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          display_name?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      team_invitations: {
        Row: {
          accepted_at: string | null
          accepted_by: string | null
          created_at: string
          email: string
          expires_at: string
          id: string
          invited_by: string
          role: Database["public"]["Enums"]["team_role"]
          status: Database["public"]["Enums"]["team_invitation_status"]
          team_id: string
          token_hash: string
          updated_at: string
        }
        Insert: {
          accepted_at?: string | null
          accepted_by?: string | null
          created_at?: string
          email: string
          expires_at: string
          id?: string
          invited_by: string
          role: Database["public"]["Enums"]["team_role"]
          status?: Database["public"]["Enums"]["team_invitation_status"]
          team_id: string
          token_hash: string
          updated_at?: string
        }
        Update: {
          accepted_at?: string | null
          accepted_by?: string | null
          created_at?: string
          email?: string
          expires_at?: string
          id?: string
          invited_by?: string
          role?: Database["public"]["Enums"]["team_role"]
          status?: Database["public"]["Enums"]["team_invitation_status"]
          team_id?: string
          token_hash?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "team_invitations_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      team_media: {
        Row: {
          alt_text: string | null
          created_at: string
          created_by: string
          id: string
          is_featured: boolean
          kind: string
          sort_order: number
          storage_path: string
          team_id: string
          updated_at: string
        }
        Insert: {
          alt_text?: string | null
          created_at?: string
          created_by: string
          id?: string
          is_featured?: boolean
          kind: string
          sort_order?: number
          storage_path: string
          team_id: string
          updated_at?: string
        }
        Update: {
          alt_text?: string | null
          created_at?: string
          created_by?: string
          id?: string
          is_featured?: boolean
          kind?: string
          sort_order?: number
          storage_path?: string
          team_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "team_media_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      team_memberships: {
        Row: {
          created_at: string
          invited_by: string | null
          role: Database["public"]["Enums"]["team_role"]
          status: Database["public"]["Enums"]["membership_status"]
          team_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          invited_by?: string | null
          role: Database["public"]["Enums"]["team_role"]
          status?: Database["public"]["Enums"]["membership_status"]
          team_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          invited_by?: string | null
          role?: Database["public"]["Enums"]["team_role"]
          status?: Database["public"]["Enums"]["membership_status"]
          team_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "team_memberships_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      team_public_profiles: {
        Row: {
          about: string | null
          created_at: string
          facebook_url: string | null
          instagram_url: string | null
          team_id: string
          tiktok_url: string | null
          updated_at: string
          website_url: string | null
          youtube_url: string | null
        }
        Insert: {
          about?: string | null
          created_at?: string
          facebook_url?: string | null
          instagram_url?: string | null
          team_id: string
          tiktok_url?: string | null
          updated_at?: string
          website_url?: string | null
          youtube_url?: string | null
        }
        Update: {
          about?: string | null
          created_at?: string
          facebook_url?: string | null
          instagram_url?: string | null
          team_id?: string
          tiktok_url?: string | null
          updated_at?: string
          website_url?: string | null
          youtube_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "team_public_profiles_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: true
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      teams: {
        Row: {
          created_at: string
          created_by: string
          default_sport_format: Database["public"]["Enums"]["sport_format"]
          id: string
          is_public: boolean
          logo_path: string | null
          name: string
          slug: string
          timezone: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by: string
          default_sport_format?: Database["public"]["Enums"]["sport_format"]
          id?: string
          is_public?: boolean
          logo_path?: string | null
          name: string
          slug: string
          timezone?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          default_sport_format?: Database["public"]["Enums"]["sport_format"]
          id?: string
          is_public?: boolean
          logo_path?: string | null
          name?: string
          slug?: string
          timezone?: string
          updated_at?: string
        }
        Relationships: []
      }
      venues: {
        Row: {
          address: string | null
          created_at: string
          id: string
          name: string
          team_id: string
          updated_at: string
        }
        Insert: {
          address?: string | null
          created_at?: string
          id?: string
          name: string
          team_id: string
          updated_at?: string
        }
        Update: {
          address?: string | null
          created_at?: string
          id?: string
          name?: string
          team_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "venues_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      public_athlete_directory: {
        Row: {
          display_name: string | null
          photo_path: string | null
          player_handle: string | null
          positions: Json | null
          registration_number: number | null
          shirt_number: number | null
          team_slug: string | null
        }
        Relationships: []
      }
      public_player_directory: {
        Row: {
          bio: string | null
          display_name: string | null
          handle: string | null
          photo_path: string | null
          positions: Json | null
          preferred_name: string | null
        }
        Relationships: []
      }
      public_team_directory: {
        Row: {
          about: string | null
          cover_path: string | null
          default_sport_format:
            | Database["public"]["Enums"]["sport_format"]
            | null
          facebook_url: string | null
          instagram_url: string | null
          logo_path: string | null
          name: string | null
          slug: string | null
          tiktok_url: string | null
          website_url: string | null
          youtube_url: string | null
        }
        Relationships: []
      }
      public_team_media: {
        Row: {
          alt_text: string | null
          created_at: string | null
          id: string | null
          is_featured: boolean | null
          sort_order: number | null
          storage_path: string | null
          team_slug: string | null
        }
        Relationships: []
      }
      public_team_upcoming_events: {
        Row: {
          attendance_deadline: string | null
          ends_at: string | null
          event_id: string | null
          kind: Database["public"]["Enums"]["event_kind"] | null
          opponent_name: string | null
          sport_format: Database["public"]["Enums"]["sport_format"] | null
          starts_at: string | null
          team_slug: string | null
          team_timezone: string | null
          title: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      add_match_incident_as_staff: {
        Args: {
          incident_assist_athlete_id?: string
          incident_athlete_id: string
          incident_kind: Database["public"]["Enums"]["match_incident_kind"]
          incident_minute?: number
          incident_notes?: string
          incident_scoring_side?: number
          requested_event_id: string
        }
        Returns: string
      }
      add_team_gallery_media: {
        Args: {
          requested_alt_text?: string
          requested_storage_path: string
          requested_team_id: string
        }
        Returns: string
      }
      complete_verified_athlete_registration: {
        Args: {
          accepts_privacy_terms: boolean
          accepts_whatsapp: boolean
          birth_date: string
          full_name: string
          position_codes: string[]
          preferred_name: string
          team_slug: string
        }
        Returns: string
      }
      create_athlete_as_staff: {
        Args: {
          athlete_birth_date?: string
          athlete_email?: string
          athlete_full_name: string
          athlete_phone_e164?: string
          athlete_preferred_name?: string
          athlete_public_profile?: boolean
          athlete_shirt_number?: number
          position_codes?: string[]
          requested_team_id: string
        }
        Returns: string
      }
      create_event_as_staff: {
        Args: {
          attendance_deadline_minutes: number
          event_duration_minutes: number
          event_kind: Database["public"]["Enums"]["event_kind"]
          event_opponent_name?: string
          event_organization_mode: Database["public"]["Enums"]["organization_mode"]
          event_sport_format: Database["public"]["Enums"]["sport_format"]
          event_starts_at: string
          event_title: string
          event_venue_address?: string
          event_venue_name?: string
          repeat_weeks?: number
          requested_team_id: string
        }
        Returns: string
      }
      create_team_for_current_user: {
        Args: {
          sport_format: Database["public"]["Enums"]["sport_format"]
          team_name: string
          team_slug: string
        }
        Returns: string
      }
      create_team_invitation: {
        Args: {
          invited_email: string
          invited_role: Database["public"]["Enums"]["team_role"]
          requested_team_id: string
        }
        Returns: {
          invitation_expires_at: string
          invitation_id: string
          invite_token: string
        }[]
      }
      delete_match_incident_as_staff: {
        Args: { requested_incident_id: string }
        Returns: boolean
      }
      get_my_player_statistics: {
        Args: never
        Returns: {
          assists: number
          goals: number
          matches_played: number
          red_cards: number
          yellow_cards: number
        }[]
      }
      get_public_player_statistics: {
        Args: { requested_handle: string }
        Returns: {
          assists: number
          goals: number
          matches_played: number
          red_cards: number
          yellow_cards: number
        }[]
      }
      get_team_invitation_preview: {
        Args: { raw_token: string }
        Returns: {
          invitation_expires_at: string
          invited_role: Database["public"]["Enums"]["team_role"]
          team_name: string
          team_slug: string
        }[]
      }
      list_my_player_team_links: {
        Args: never
        Returns: {
          athlete_id: string
          athlete_status: Database["public"]["Enums"]["athlete_status"]
          registration_number: number
          sport_format: Database["public"]["Enums"]["sport_format"]
          team_id: string
          team_name: string
          team_slug: string
          team_timezone: string
        }[]
      }
      list_my_team_invitations: {
        Args: never
        Returns: {
          invitation_created_at: string
          invitation_expires_at: string
          invitation_id: string
          invited_by_name: string
          invited_role: Database["public"]["Enums"]["team_role"]
          team_name: string
          team_slug: string
        }[]
      }
      remove_athlete_from_team: {
        Args: { requested_athlete_id: string }
        Returns: {
          removal_outcome: string
          removed_photo_path: string
        }[]
      }
      remove_my_player_photo: { Args: never; Returns: string }
      remove_team_media: {
        Args: { requested_media_id: string }
        Returns: string
      }
      replace_my_player_photo: {
        Args: { requested_storage_path: string }
        Returns: string
      }
      replace_team_identity_media: {
        Args: {
          requested_alt_text?: string
          requested_kind: string
          requested_storage_path: string
          requested_team_id: string
        }
        Returns: string
      }
      respond_to_event_as_player: {
        Args: {
          requested_event_id: string
          response_status: Database["public"]["Enums"]["attendance_status"]
        }
        Returns: Database["public"]["Enums"]["attendance_status"]
      }
      respond_to_team_invitation: {
        Args: { invitation_response: string; requested_invitation_id: string }
        Returns: string
      }
      review_athlete_registration: {
        Args: { decision: string; requested_athlete_id: string }
        Returns: Database["public"]["Enums"]["athlete_status"]
      }
      revoke_team_invitation: {
        Args: { requested_invitation_id: string }
        Returns: boolean
      }
      save_match_report_as_staff: {
        Args: {
          requested_event_id: string
          requested_notes?: string
          requested_side_a_label: string
          requested_side_a_score: number
          requested_side_b_label: string
          requested_side_b_score: number
          should_finalize?: boolean
        }
        Returns: string
      }
      set_athlete_availability: {
        Args: {
          next_status: Database["public"]["Enums"]["athlete_status"]
          requested_athlete_id: string
        }
        Returns: Database["public"]["Enums"]["athlete_status"]
      }
      set_event_attendance_as_staff: {
        Args: {
          next_status: Database["public"]["Enums"]["attendance_status"]
          requested_athlete_id: string
          requested_event_id: string
        }
        Returns: Database["public"]["Enums"]["attendance_status"]
      }
      set_team_featured_media: {
        Args: { requested_media_id: string }
        Returns: boolean
      }
      submit_athlete_registration: {
        Args: {
          accepts_privacy_terms?: boolean
          accepts_whatsapp?: boolean
          birth_date?: string
          email?: string
          full_name: string
          phone_e164?: string
          preferred_name?: string
          team_slug: string
        }
        Returns: boolean
      }
      update_athlete_as_admin: {
        Args: {
          athlete_birth_date?: string
          athlete_email?: string
          athlete_full_name?: string
          athlete_phone_e164?: string
          athlete_preferred_name?: string
          athlete_public_profile?: boolean
          athlete_shirt_number?: number
          position_codes?: string[]
          requested_athlete_id: string
          team_notes?: string
        }
        Returns: boolean
      }
      update_event_as_staff: {
        Args: {
          attendance_deadline_minutes: number
          edit_scope: string
          event_duration_minutes: number
          event_kind: Database["public"]["Enums"]["event_kind"]
          event_opponent_name?: string
          event_organization_mode: Database["public"]["Enums"]["organization_mode"]
          event_sport_format: Database["public"]["Enums"]["sport_format"]
          event_starts_at: string
          event_title: string
          event_venue_address?: string
          event_venue_name?: string
          requested_event_id: string
          requested_team_id: string
        }
        Returns: number
      }
      update_my_player_profile: {
        Args: {
          field_positions: string[]
          futsal_positions: string[]
          requested_bio: string
          requested_display_name: string
          requested_handle: string
          requested_is_public: boolean
          requested_preferred_name: string
          society_positions: string[]
        }
        Returns: string
      }
      update_team_social_settings: {
        Args: {
          requested_about: string
          requested_facebook_url: string
          requested_instagram_url: string
          requested_is_public: boolean
          requested_name: string
          requested_slug: string
          requested_sport_format: Database["public"]["Enums"]["sport_format"]
          requested_team_id: string
          requested_tiktok_url: string
          requested_timezone: string
          requested_website_url: string
          requested_youtube_url: string
        }
        Returns: boolean
      }
    }
    Enums: {
      athlete_status: "pending" | "active" | "inactive" | "rejected"
      attendance_source: "web" | "admin" | "whatsapp"
      attendance_status:
        | "pending"
        | "confirmed"
        | "declined"
        | "maybe"
        | "waitlist"
      consent_status: "granted" | "revoked"
      event_kind:
        | "weekly_match"
        | "championship"
        | "friendly"
        | "tournament"
        | "training"
        | "other"
      event_status: "scheduled" | "cancelled" | "completed"
      lineup_slot_kind: "starter" | "substitute"
      match_incident_kind: "goal" | "yellow_card" | "red_card"
      membership_status: "invited" | "active" | "suspended"
      message_channel: "whatsapp" | "email" | "push"
      message_status: "pending" | "processing" | "sent" | "failed" | "cancelled"
      organization_mode: "single_squad" | "split_teams"
      registration_source: "admin" | "public_form" | "import"
      sport_format: "field" | "society" | "futsal"
      team_invitation_status:
        | "pending"
        | "accepted"
        | "declined"
        | "revoked"
        | "expired"
      team_role: "owner" | "admin" | "manager"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      athlete_status: ["pending", "active", "inactive", "rejected"],
      attendance_source: ["web", "admin", "whatsapp"],
      attendance_status: [
        "pending",
        "confirmed",
        "declined",
        "maybe",
        "waitlist",
      ],
      consent_status: ["granted", "revoked"],
      event_kind: [
        "weekly_match",
        "championship",
        "friendly",
        "tournament",
        "training",
        "other",
      ],
      event_status: ["scheduled", "cancelled", "completed"],
      lineup_slot_kind: ["starter", "substitute"],
      match_incident_kind: ["goal", "yellow_card", "red_card"],
      membership_status: ["invited", "active", "suspended"],
      message_channel: ["whatsapp", "email", "push"],
      message_status: ["pending", "processing", "sent", "failed", "cancelled"],
      organization_mode: ["single_squad", "split_teams"],
      registration_source: ["admin", "public_form", "import"],
      sport_format: ["field", "society", "futsal"],
      team_invitation_status: [
        "pending",
        "accepted",
        "declined",
        "revoked",
        "expired",
      ],
      team_role: ["owner", "admin", "manager"],
    },
  },
} as const
