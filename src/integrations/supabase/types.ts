export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      access_events: {
        Row: {
          action: string
          correlation_id: string
          department_id: string | null
          event_type: string
          id: string
          metadata: Json
          reason_code: string | null
          records_returned: number
          result: string
          role: string | null
          scenario_tag: string | null
          seq: number
          session_id: string | null
          source_ip: string | null
          target_id: string | null
          target_type: string | null
          ts: string
          user_id: string | null
          username: string | null
        }
        Insert: {
          action: string
          correlation_id: string
          department_id?: string | null
          event_type: string
          id: string
          metadata?: Json
          reason_code?: string | null
          records_returned?: number
          result: string
          role?: string | null
          scenario_tag?: string | null
          seq?: number
          session_id?: string | null
          source_ip?: string | null
          target_id?: string | null
          target_type?: string | null
          ts?: string
          user_id?: string | null
          username?: string | null
        }
        Update: {
          action?: string
          correlation_id?: string
          department_id?: string | null
          event_type?: string
          id?: string
          metadata?: Json
          reason_code?: string | null
          records_returned?: number
          result?: string
          role?: string | null
          scenario_tag?: string | null
          seq?: number
          session_id?: string | null
          source_ip?: string | null
          target_id?: string | null
          target_type?: string | null
          ts?: string
          user_id?: string | null
          username?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "access_events_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "access_events_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      alert_events: {
        Row: {
          alert_id: string
          event_id: string
          relation_type: string
        }
        Insert: {
          alert_id: string
          event_id: string
          relation_type?: string
        }
        Update: {
          alert_id?: string
          event_id?: string
          relation_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "alert_events_alert_id_fkey"
            columns: ["alert_id"]
            isOneToOne: false
            referencedRelation: "alerts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "alert_events_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "access_events"
            referencedColumns: ["id"]
          },
        ]
      }
      alert_timeline: {
        Row: {
          action: string
          actor: string | null
          alert_id: string
          id: string
          note: string | null
          ts: string
        }
        Insert: {
          action: string
          actor?: string | null
          alert_id: string
          id?: string
          note?: string | null
          ts?: string
        }
        Update: {
          action?: string
          actor?: string | null
          alert_id?: string
          id?: string
          note?: string | null
          ts?: string
        }
        Relationships: [
          {
            foreignKeyName: "alert_timeline_alert_id_fkey"
            columns: ["alert_id"]
            isOneToOne: false
            referencedRelation: "alerts"
            referencedColumns: ["id"]
          },
        ]
      }
      alerts: {
        Row: {
          created_at: string
          evidence_json: Json
          id: string
          ml_score: number | null
          risk_score: number
          rule_ids: string[]
          scenario_tag: string | null
          severity: string
          status: string
          summary: string
          type: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          evidence_json?: Json
          id: string
          ml_score?: number | null
          risk_score?: number
          rule_ids?: string[]
          scenario_tag?: string | null
          severity: string
          status?: string
          summary: string
          type: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          evidence_json?: Json
          id?: string
          ml_score?: number | null
          risk_score?: number
          rule_ids?: string[]
          scenario_tag?: string | null
          severity?: string
          status?: string
          summary?: string
          type?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "alerts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      behavior_profiles: {
        Row: {
          avg_records_per_action: number
          avg_records_per_hour: number
          common_hours: number[]
          dept_entropy: number
          failed_login_rate: number
          login_rate: number
          model_version: string
          sample_size: number
          std_records_per_action: number
          unique_patients_per_session: number
          updated_at: string
          user_id: string
          window_days: number
        }
        Insert: {
          avg_records_per_action?: number
          avg_records_per_hour?: number
          common_hours?: number[]
          dept_entropy?: number
          failed_login_rate?: number
          login_rate?: number
          model_version?: string
          sample_size?: number
          std_records_per_action?: number
          unique_patients_per_session?: number
          updated_at?: string
          user_id: string
          window_days?: number
        }
        Update: {
          avg_records_per_action?: number
          avg_records_per_hour?: number
          common_hours?: number[]
          dept_entropy?: number
          failed_login_rate?: number
          login_rate?: number
          model_version?: string
          sample_size?: number
          std_records_per_action?: number
          unique_patients_per_session?: number
          updated_at?: string
          user_id?: string
          window_days?: number
        }
        Relationships: [
          {
            foreignKeyName: "behavior_profiles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      care_assignments: {
        Row: {
          id: string
          patient_id: string
          user_id: string
          valid_from: string
          valid_to: string | null
        }
        Insert: {
          id: string
          patient_id: string
          user_id: string
          valid_from?: string
          valid_to?: string | null
        }
        Update: {
          id?: string
          patient_id?: string
          user_id?: string
          valid_from?: string
          valid_to?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "care_assignments_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "care_assignments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      departments: {
        Row: {
          id: string
          name: string
        }
        Insert: {
          id: string
          name: string
        }
        Update: {
          id?: string
          name?: string
        }
        Relationships: []
      }
      patient_records: {
        Row: {
          created_at: string
          id: string
          patient_id: string
          payload: Json
          record_type: string
          title: string
        }
        Insert: {
          created_at?: string
          id: string
          patient_id: string
          payload?: Json
          record_type: string
          title: string
        }
        Update: {
          created_at?: string
          id?: string
          patient_id?: string
          payload?: Json
          record_type?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "patient_records_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      patients: {
        Row: {
          created_at: string
          demographic_band: string
          department_id: string
          display_name: string
          id: string
          synthetic_mrn: string
        }
        Insert: {
          created_at?: string
          demographic_band: string
          department_id: string
          display_name: string
          id: string
          synthetic_mrn: string
        }
        Update: {
          created_at?: string
          demographic_band?: string
          department_id?: string
          display_name?: string
          id?: string
          synthetic_mrn?: string
        }
        Relationships: [
          {
            foreignKeyName: "patients_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
        ]
      }
      permissions: {
        Row: {
          action: string
          id: string
          resource_type: string
        }
        Insert: {
          action: string
          id: string
          resource_type: string
        }
        Update: {
          action?: string
          id?: string
          resource_type?: string
        }
        Relationships: []
      }
      role_permissions: {
        Row: {
          permission_id: string
          role_id: string
        }
        Insert: {
          permission_id: string
          role_id: string
        }
        Update: {
          permission_id?: string
          role_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "role_permissions_permission_id_fkey"
            columns: ["permission_id"]
            isOneToOne: false
            referencedRelation: "permissions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "role_permissions_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "roles"
            referencedColumns: ["id"]
          },
        ]
      }
      roles: {
        Row: {
          id: string
          label: string
          name: string
        }
        Insert: {
          id: string
          label: string
          name: string
        }
        Update: {
          id?: string
          label?: string
          name?: string
        }
        Relationships: []
      }
      sessions: {
        Row: {
          expires_at: string
          id: string
          issued_at: string
          revoked_at: string | null
          source_ip: string | null
          token_hash: string
          user_id: string
        }
        Insert: {
          expires_at: string
          id: string
          issued_at?: string
          revoked_at?: string | null
          source_ip?: string | null
          token_hash: string
          user_id: string
        }
        Update: {
          expires_at?: string
          id?: string
          issued_at?: string
          revoked_at?: string | null
          source_ip?: string | null
          token_hash?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sessions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      users: {
        Row: {
          created_at: string
          department_id: string | null
          display_name: string
          id: string
          password_hash: string
          role_id: string
          status: string
          username: string
        }
        Insert: {
          created_at?: string
          department_id?: string | null
          display_name: string
          id: string
          password_hash: string
          role_id: string
          status?: string
          username: string
        }
        Update: {
          created_at?: string
          department_id?: string | null
          display_name?: string
          id?: string
          password_hash?: string
          role_id?: string
          status?: string
          username?: string
        }
        Relationships: [
          {
            foreignKeyName: "users_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "users_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "roles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      verify_credentials: {
        Args: { p_password: string; p_username: string }
        Returns: {
          user_id: string
        }[]
      }
    }
    Enums: {
      [_ in never]: never
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
