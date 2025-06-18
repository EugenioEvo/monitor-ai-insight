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
      invoices: {
        Row: {
          created_at: string
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
        Relationships: []
      }
      plants: {
        Row: {
          capacity_kwp: number
          concessionaria: string
          created_at: string
          id: string
          lat: number
          lng: number
          name: string
          start_date: string
          status: string
          updated_at: string
        }
        Insert: {
          capacity_kwp: number
          concessionaria: string
          created_at?: string
          id?: string
          lat: number
          lng: number
          name: string
          start_date: string
          status?: string
          updated_at?: string
        }
        Update: {
          capacity_kwp?: number
          concessionaria?: string
          created_at?: string
          id?: string
          lat?: number
          lng?: number
          name?: string
          start_date?: string
          status?: string
          updated_at?: string
        }
        Relationships: []
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
