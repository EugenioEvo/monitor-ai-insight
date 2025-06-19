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
      app_config: {
        Row: {
          created_at: string
          key: string
          updated_at: string
          value: string
        }
        Insert: {
          created_at?: string
          key: string
          updated_at?: string
          value: string
        }
        Update: {
          created_at?: string
          key?: string
          updated_at?: string
          value?: string
        }
        Relationships: []
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
          bandeira_tipo: string | null
          bandeira_valor: number | null
          classe_subclasse: string | null
          codigo_barras: string | null
          cofins_aliquota: number | null
          cofins_valor: number | null
          confidence_score: number | null
          consumo_fp_te_kwh: number | null
          consumo_p_te_kwh: number | null
          contrib_ilum_publica: number | null
          created_at: string
          customer_unit_id: string | null
          data_emissao: string | null
          data_leitura: string | null
          data_vencimento: string | null
          demand_kw: number
          demanda_te_kw: number | null
          demanda_tusd_kw: number | null
          dias_faturamento: number | null
          energia_compensada_kwh: number | null
          energia_injetada_kwh: number | null
          energy_kwh: number
          extracted_data: Json | null
          extraction_method: string | null
          fator_potencia: number | null
          file_url: string
          historico_consumo: Json | null
          icms_aliquota: number | null
          icms_valor: number | null
          id: string
          issqn_valor: number | null
          leitura_anterior: number | null
          leitura_atual: number | null
          linha_digitavel: string | null
          modalidade_tarifaria: string | null
          multiplicador: number | null
          observacoes: string | null
          outras_taxas: number | null
          pis_aliquota: number | null
          pis_valor: number | null
          processing_time_ms: number | null
          reference_month: string
          requires_review: boolean | null
          saldo_creditos_kwh: number | null
          status: string
          subgrupo_tensao: string | null
          tarifa_demanda_te: number | null
          tarifa_demanda_tusd: number | null
          tarifa_te_te: number | null
          tarifa_te_tusd: number | null
          taxes_r$: number
          total_r$: number
          uc_code: string
          updated_at: string
          validation_errors: Json | null
          valor_demanda_te: number | null
          valor_demanda_tusd: number | null
          valor_te: number | null
          valor_tusd: number | null
        }
        Insert: {
          bandeira_tipo?: string | null
          bandeira_valor?: number | null
          classe_subclasse?: string | null
          codigo_barras?: string | null
          cofins_aliquota?: number | null
          cofins_valor?: number | null
          confidence_score?: number | null
          consumo_fp_te_kwh?: number | null
          consumo_p_te_kwh?: number | null
          contrib_ilum_publica?: number | null
          created_at?: string
          customer_unit_id?: string | null
          data_emissao?: string | null
          data_leitura?: string | null
          data_vencimento?: string | null
          demand_kw?: number
          demanda_te_kw?: number | null
          demanda_tusd_kw?: number | null
          dias_faturamento?: number | null
          energia_compensada_kwh?: number | null
          energia_injetada_kwh?: number | null
          energy_kwh?: number
          extracted_data?: Json | null
          extraction_method?: string | null
          fator_potencia?: number | null
          file_url: string
          historico_consumo?: Json | null
          icms_aliquota?: number | null
          icms_valor?: number | null
          id?: string
          issqn_valor?: number | null
          leitura_anterior?: number | null
          leitura_atual?: number | null
          linha_digitavel?: string | null
          modalidade_tarifaria?: string | null
          multiplicador?: number | null
          observacoes?: string | null
          outras_taxas?: number | null
          pis_aliquota?: number | null
          pis_valor?: number | null
          processing_time_ms?: number | null
          reference_month: string
          requires_review?: boolean | null
          saldo_creditos_kwh?: number | null
          status?: string
          subgrupo_tensao?: string | null
          tarifa_demanda_te?: number | null
          tarifa_demanda_tusd?: number | null
          tarifa_te_te?: number | null
          tarifa_te_tusd?: number | null
          taxes_r$?: number
          total_r$?: number
          uc_code: string
          updated_at?: string
          validation_errors?: Json | null
          valor_demanda_te?: number | null
          valor_demanda_tusd?: number | null
          valor_te?: number | null
          valor_tusd?: number | null
        }
        Update: {
          bandeira_tipo?: string | null
          bandeira_valor?: number | null
          classe_subclasse?: string | null
          codigo_barras?: string | null
          cofins_aliquota?: number | null
          cofins_valor?: number | null
          confidence_score?: number | null
          consumo_fp_te_kwh?: number | null
          consumo_p_te_kwh?: number | null
          contrib_ilum_publica?: number | null
          created_at?: string
          customer_unit_id?: string | null
          data_emissao?: string | null
          data_leitura?: string | null
          data_vencimento?: string | null
          demand_kw?: number
          demanda_te_kw?: number | null
          demanda_tusd_kw?: number | null
          dias_faturamento?: number | null
          energia_compensada_kwh?: number | null
          energia_injetada_kwh?: number | null
          energy_kwh?: number
          extracted_data?: Json | null
          extraction_method?: string | null
          fator_potencia?: number | null
          file_url?: string
          historico_consumo?: Json | null
          icms_aliquota?: number | null
          icms_valor?: number | null
          id?: string
          issqn_valor?: number | null
          leitura_anterior?: number | null
          leitura_atual?: number | null
          linha_digitavel?: string | null
          modalidade_tarifaria?: string | null
          multiplicador?: number | null
          observacoes?: string | null
          outras_taxas?: number | null
          pis_aliquota?: number | null
          pis_valor?: number | null
          processing_time_ms?: number | null
          reference_month?: string
          requires_review?: boolean | null
          saldo_creditos_kwh?: number | null
          status?: string
          subgrupo_tensao?: string | null
          tarifa_demanda_te?: number | null
          tarifa_demanda_tusd?: number | null
          tarifa_te_te?: number | null
          tarifa_te_tusd?: number | null
          taxes_r$?: number
          total_r$?: number
          uc_code?: string
          updated_at?: string
          validation_errors?: Json | null
          valor_demanda_te?: number | null
          valor_demanda_tusd?: number | null
          valor_te?: number | null
          valor_tusd?: number | null
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
          consumer_unit_code: string | null
          created_at: string
          customer_id: string | null
          generator_address_city: string | null
          generator_address_complement: string | null
          generator_address_neighborhood: string | null
          generator_address_number: string | null
          generator_address_state: string | null
          generator_address_street: string | null
          generator_address_zip_code: string | null
          id: string
          initial_investment: number | null
          last_sync: string | null
          lat: number
          lng: number
          monitoring_system: string | null
          name: string
          owner_document: string | null
          owner_email: string | null
          owner_name: string | null
          owner_phone: string | null
          project_assumptions: Json | null
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
          consumer_unit_code?: string | null
          created_at?: string
          customer_id?: string | null
          generator_address_city?: string | null
          generator_address_complement?: string | null
          generator_address_neighborhood?: string | null
          generator_address_number?: string | null
          generator_address_state?: string | null
          generator_address_street?: string | null
          generator_address_zip_code?: string | null
          id?: string
          initial_investment?: number | null
          last_sync?: string | null
          lat: number
          lng: number
          monitoring_system?: string | null
          name: string
          owner_document?: string | null
          owner_email?: string | null
          owner_name?: string | null
          owner_phone?: string | null
          project_assumptions?: Json | null
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
          consumer_unit_code?: string | null
          created_at?: string
          customer_id?: string | null
          generator_address_city?: string | null
          generator_address_complement?: string | null
          generator_address_neighborhood?: string | null
          generator_address_number?: string | null
          generator_address_state?: string | null
          generator_address_street?: string | null
          generator_address_zip_code?: string | null
          id?: string
          initial_investment?: number | null
          last_sync?: string | null
          lat?: number
          lng?: number
          monitoring_system?: string | null
          name?: string
          owner_document?: string | null
          owner_email?: string | null
          owner_name?: string | null
          owner_phone?: string | null
          project_assumptions?: Json | null
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
      profiles: {
        Row: {
          created_at: string
          email: string
          full_name: string | null
          id: string
          role: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          email: string
          full_name?: string | null
          id: string
          role?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string
          full_name?: string | null
          id?: string
          role?: string
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
      get_user_role: {
        Args: { user_id: string }
        Returns: string
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
