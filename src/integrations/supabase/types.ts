export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      alerts: {
        Row: {
          acknowledged_by: string | null
          created_at: string
          id: string
          message: string
          plant_id: string
          severity: string
          timestamp: string
          type: string
        }
        Insert: {
          acknowledged_by?: string | null
          created_at?: string
          id?: string
          message: string
          plant_id: string
          severity: string
          timestamp?: string
          type: string
        }
        Update: {
          acknowledged_by?: string | null
          created_at?: string
          id?: string
          message?: string
          plant_id?: string
          severity?: string
          timestamp?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "alerts_plant_id_fkey"
            columns: ["plant_id"]
            isOneToOne: false
            referencedRelation: "plants"
            referencedColumns: ["id"]
          },
        ]
      }
      beneficiaries: {
        Row: {
          allocation_percent: number
          cnpj: string
          created_at: string
          id: string
          name: string
          plant_id: string
          uc_code: string
          updated_at: string
        }
        Insert: {
          allocation_percent: number
          cnpj: string
          created_at?: string
          id?: string
          name: string
          plant_id: string
          uc_code: string
          updated_at?: string
        }
        Update: {
          allocation_percent?: number
          cnpj?: string
          created_at?: string
          id?: string
          name?: string
          plant_id?: string
          uc_code?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "beneficiaries_plant_id_fkey"
            columns: ["plant_id"]
            isOneToOne: false
            referencedRelation: "plants"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_metrics: {
        Row: {
          calculated_at: string | null
          created_at: string
          customer_id: string
          energy_balance_kwh: number | null
          id: string
          month: string
          total_consumption_kwh: number | null
          total_generation_kwh: number | null
          total_savings_r$: number | null
          updated_at: string
        }
        Insert: {
          calculated_at?: string | null
          created_at?: string
          customer_id: string
          energy_balance_kwh?: number | null
          id?: string
          month: string
          total_consumption_kwh?: number | null
          total_generation_kwh?: number | null
          total_savings_r$?: number | null
          updated_at?: string
        }
        Update: {
          calculated_at?: string | null
          created_at?: string
          customer_id?: string
          energy_balance_kwh?: number | null
          id?: string
          month?: string
          total_consumption_kwh?: number | null
          total_generation_kwh?: number | null
          total_savings_r$?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "customer_metrics_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_units: {
        Row: {
          address_city: string | null
          address_complement: string | null
          address_neighborhood: string | null
          address_number: string | null
          address_state: string | null
          address_street: string | null
          address_zip_code: string | null
          created_at: string
          customer_id: string
          id: string
          is_active: boolean | null
          uc_code: string
          unit_name: string | null
          updated_at: string
        }
        Insert: {
          address_city?: string | null
          address_complement?: string | null
          address_neighborhood?: string | null
          address_number?: string | null
          address_state?: string | null
          address_street?: string | null
          address_zip_code?: string | null
          created_at?: string
          customer_id: string
          id?: string
          is_active?: boolean | null
          uc_code: string
          unit_name?: string | null
          updated_at?: string
        }
        Update: {
          address_city?: string | null
          address_complement?: string | null
          address_neighborhood?: string | null
          address_number?: string | null
          address_state?: string | null
          address_street?: string | null
          address_zip_code?: string | null
          created_at?: string
          customer_id?: string
          id?: string
          is_active?: boolean | null
          uc_code?: string
          unit_name?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "customer_units_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      customers: {
        Row: {
          address_city: string | null
          address_complement: string | null
          address_neighborhood: string | null
          address_number: string | null
          address_state: string | null
          address_street: string | null
          address_zip_code: string | null
          birth_date: string
          created_at: string
          document: string
          email: string
          id: string
          name: string
          phone: string
          updated_at: string
        }
        Insert: {
          address_city?: string | null
          address_complement?: string | null
          address_neighborhood?: string | null
          address_number?: string | null
          address_state?: string | null
          address_street?: string | null
          address_zip_code?: string | null
          birth_date: string
          created_at?: string
          document: string
          email: string
          id?: string
          name: string
          phone: string
          updated_at?: string
        }
        Update: {
          address_city?: string | null
          address_complement?: string | null
          address_neighborhood?: string | null
          address_number?: string | null
          address_state?: string | null
          address_street?: string | null
          address_zip_code?: string | null
          birth_date?: string
          created_at?: string
          document?: string
          email?: string
          id?: string
          name?: string
          phone?: string
          updated_at?: string
        }
        Relationships: []
      }
      invoices: {
        Row: {
          created_at: string
          customer_unit_id: string | null
          demand_kw: number
          energy_kwh: number
          extracted_data: Json | null
          file_url: string
          id: string
          reference_month: string
          status: string
          taxes_r$: number
          total_r$: number
          uc_code: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          customer_unit_id?: string | null
          demand_kw?: number
          energy_kwh?: number
          extracted_data?: Json | null
          file_url: string
          id?: string
          reference_month: string
          status?: string
          taxes_r$?: number
          total_r$?: number
          uc_code: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          customer_unit_id?: string | null
          demand_kw?: number
          energy_kwh?: number
          extracted_data?: Json | null
          file_url?: string
          id?: string
          reference_month?: string
          status?: string
          taxes_r$?: number
          total_r$?: number
          uc_code?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "invoices_customer_unit_id_fkey"
            columns: ["customer_unit_id"]
            isOneToOne: false
            referencedRelation: "customer_units"
            referencedColumns: ["id"]
          },
        ]
      }
      monitoring_configs: {
        Row: {
          config_data: Json
          created_at: string
          enabled: boolean | null
          id: string
          plant_id: string
          sync_interval_minutes: number | null
          system_type: string
          updated_at: string
        }
        Insert: {
          config_data: Json
          created_at?: string
          enabled?: boolean | null
          id?: string
          plant_id: string
          sync_interval_minutes?: number | null
          system_type: string
          updated_at?: string
        }
        Update: {
          config_data?: Json
          created_at?: string
          enabled?: boolean | null
          id?: string
          plant_id?: string
          sync_interval_minutes?: number | null
          system_type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "monitoring_configs_plant_id_fkey"
            columns: ["plant_id"]
            isOneToOne: false
            referencedRelation: "plants"
            referencedColumns: ["id"]
          },
        ]
      }
      plants: {
        Row: {
          api_credentials: Json | null
          api_site_id: string | null
          capacity_kwp: number
          concessionaria: string
          created_at: string
          customer_id: string | null
          id: string
          last_sync: string | null
          lat: number
          lng: number
          monitoring_system: string | null
          name: string
          start_date: string
          status: string
          sync_enabled: boolean | null
          updated_at: string
        }
        Insert: {
          api_credentials?: Json | null
          api_site_id?: string | null
          capacity_kwp: number
          concessionaria: string
          created_at?: string
          customer_id?: string | null
          id?: string
          last_sync?: string | null
          lat: number
          lng: number
          monitoring_system?: string | null
          name: string
          start_date: string
          status?: string
          sync_enabled?: boolean | null
          updated_at?: string
        }
        Update: {
          api_credentials?: Json | null
          api_site_id?: string | null
          capacity_kwp?: number
          concessionaria?: string
          created_at?: string
          customer_id?: string | null
          id?: string
          last_sync?: string | null
          lat?: number
          lng?: number
          monitoring_system?: string | null
          name?: string
          start_date?: string
          status?: string
          sync_enabled?: boolean | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "plants_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      readings: {
        Row: {
          created_at: string
          energy_kwh: number
          id: string
          plant_id: string
          power_w: number
          timestamp: string
        }
        Insert: {
          created_at?: string
          energy_kwh?: number
          id?: string
          plant_id: string
          power_w?: number
          timestamp: string
        }
        Update: {
          created_at?: string
          energy_kwh?: number
          id?: string
          plant_id?: string
          power_w?: number
          timestamp?: string
        }
        Relationships: [
          {
            foreignKeyName: "readings_plant_id_fkey"
            columns: ["plant_id"]
            isOneToOne: false
            referencedRelation: "plants"
            referencedColumns: ["id"]
          },
        ]
      }
      savings: {
        Row: {
          beneficiary_id: string
          created_at: string
          credits_kwh: number
          id: string
          month: string
          savings_r$: number
          updated_at: string
        }
        Insert: {
          beneficiary_id: string
          created_at?: string
          credits_kwh?: number
          id?: string
          month: string
          savings_r$?: number
          updated_at?: string
        }
        Update: {
          beneficiary_id?: string
          created_at?: string
          credits_kwh?: number
          id?: string
          month?: string
          savings_r$?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "savings_beneficiary_id_fkey"
            columns: ["beneficiary_id"]
            isOneToOne: false
            referencedRelation: "beneficiaries"
            referencedColumns: ["id"]
          },
        ]
      }
      sync_logs: {
        Row: {
          created_at: string
          data_points_synced: number | null
          id: string
          message: string | null
          plant_id: string
          status: string
          sync_duration_ms: number | null
          system_type: string
        }
        Insert: {
          created_at?: string
          data_points_synced?: number | null
          id?: string
          message?: string | null
          plant_id: string
          status: string
          sync_duration_ms?: number | null
          system_type: string
        }
        Update: {
          created_at?: string
          data_points_synced?: number | null
          id?: string
          message?: string | null
          plant_id?: string
          status?: string
          sync_duration_ms?: number | null
          system_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "sync_logs_plant_id_fkey"
            columns: ["plant_id"]
            isOneToOne: false
            referencedRelation: "plants"
            referencedColumns: ["id"]
          },
        ]
      }
      tickets: {
        Row: {
          assigned_to: string | null
          created_at: string
          description: string
          id: string
          opened_at: string
          plant_id: string
          priority: string
          status: string
          type: string
          updated_at: string
        }
        Insert: {
          assigned_to?: string | null
          created_at?: string
          description: string
          id?: string
          opened_at?: string
          plant_id: string
          priority: string
          status?: string
          type: string
          updated_at?: string
        }
        Update: {
          assigned_to?: string | null
          created_at?: string
          description?: string
          id?: string
          opened_at?: string
          plant_id?: string
          priority?: string
          status?: string
          type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tickets_plant_id_fkey"
            columns: ["plant_id"]
            isOneToOne: false
            referencedRelation: "plants"
            referencedColumns: ["id"]
          },
        ]
      }
      users: {
        Row: {
          created_at: string
          email: string
          id: string
          name: string
          role: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          name: string
          role?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          name?: string
          role?: string
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DefaultSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
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
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof Database },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
