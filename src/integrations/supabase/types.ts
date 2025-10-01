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
    PostgrestVersion: "12.2.12 (cd3cf9e)"
  }
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
          status: string | null
          timestamp: string
          type: string
          updated_at: string | null
        }
        Insert: {
          acknowledged_by?: string | null
          created_at?: string
          id?: string
          message: string
          plant_id: string
          severity: string
          status?: string | null
          timestamp?: string
          type: string
          updated_at?: string | null
        }
        Update: {
          acknowledged_by?: string | null
          created_at?: string
          id?: string
          message?: string
          plant_id?: string
          severity?: string
          status?: string | null
          timestamp?: string
          type?: string
          updated_at?: string | null
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
      analytics_trends: {
        Row: {
          calculated_at: string
          created_at: string
          id: string
          metric_type: string
          period: string
          plant_id: string | null
          trend_data: Json
        }
        Insert: {
          calculated_at?: string
          created_at?: string
          id?: string
          metric_type: string
          period: string
          plant_id?: string | null
          trend_data: Json
        }
        Update: {
          calculated_at?: string
          created_at?: string
          id?: string
          metric_type?: string
          period?: string
          plant_id?: string | null
          trend_data?: Json
        }
        Relationships: []
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
      audit_findings: {
        Row: {
          audit_id: string
          category: string
          created_at: string
          description: string
          detailed_analysis: Json | null
          estimated_impact_brl: number
          estimated_impact_kwh: number
          evidence: Json
          id: string
          probable_causes: Json
          severity: string
          title: string
        }
        Insert: {
          audit_id: string
          category: string
          created_at?: string
          description: string
          detailed_analysis?: Json | null
          estimated_impact_brl?: number
          estimated_impact_kwh?: number
          evidence?: Json
          id?: string
          probable_causes?: Json
          severity: string
          title: string
        }
        Update: {
          audit_id?: string
          category?: string
          created_at?: string
          description?: string
          detailed_analysis?: Json | null
          estimated_impact_brl?: number
          estimated_impact_kwh?: number
          evidence?: Json
          id?: string
          probable_causes?: Json
          severity?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "audit_findings_audit_id_fkey"
            columns: ["audit_id"]
            isOneToOne: false
            referencedRelation: "plant_audits"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_recommendations: {
        Row: {
          action_description: string
          action_title: string
          action_type: string
          audit_id: string
          created_at: string
          estimated_benefit_brl_year: number
          estimated_benefit_kwh_year: number
          estimated_cost_brl: number
          finding_id: string
          id: string
          implementation_details: Json | null
          payback_months: number | null
          priority: string
          roi_percent: number | null
          status: string
          updated_at: string
        }
        Insert: {
          action_description: string
          action_title: string
          action_type: string
          audit_id: string
          created_at?: string
          estimated_benefit_brl_year?: number
          estimated_benefit_kwh_year?: number
          estimated_cost_brl?: number
          finding_id: string
          id?: string
          implementation_details?: Json | null
          payback_months?: number | null
          priority: string
          roi_percent?: number | null
          status?: string
          updated_at?: string
        }
        Update: {
          action_description?: string
          action_title?: string
          action_type?: string
          audit_id?: string
          created_at?: string
          estimated_benefit_brl_year?: number
          estimated_benefit_kwh_year?: number
          estimated_cost_brl?: number
          finding_id?: string
          id?: string
          implementation_details?: Json | null
          payback_months?: number | null
          priority?: string
          roi_percent?: number | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "audit_recommendations_audit_id_fkey"
            columns: ["audit_id"]
            isOneToOne: false
            referencedRelation: "plant_audits"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "audit_recommendations_finding_id_fkey"
            columns: ["finding_id"]
            isOneToOne: false
            referencedRelation: "audit_findings"
            referencedColumns: ["id"]
          },
        ]
      }
      automated_reports: {
        Row: {
          created_at: string
          generated_at: string
          id: string
          period_end: string
          period_start: string
          plant_id: string | null
          report_data: Json
          report_type: string
        }
        Insert: {
          created_at?: string
          generated_at?: string
          id?: string
          period_end: string
          period_start: string
          plant_id?: string | null
          report_data: Json
          report_type: string
        }
        Update: {
          created_at?: string
          generated_at?: string
          id?: string
          period_end?: string
          period_start?: string
          plant_id?: string | null
          report_data?: Json
          report_type?: string
        }
        Relationships: []
      }
      baseline_forecasts: {
        Row: {
          ambient_temp: number | null
          cell_temp_estimated: number | null
          confidence_lower: number
          confidence_upper: number
          config_id: string
          created_at: string
          expected_generation_kwh: number
          id: string
          metadata: Json | null
          plant_id: string
          poa_irradiance: number | null
          shading_factor: number | null
          soiling_factor: number | null
          system_efficiency: number | null
          timestamp: string
        }
        Insert: {
          ambient_temp?: number | null
          cell_temp_estimated?: number | null
          confidence_lower: number
          confidence_upper: number
          config_id: string
          created_at?: string
          expected_generation_kwh: number
          id?: string
          metadata?: Json | null
          plant_id: string
          poa_irradiance?: number | null
          shading_factor?: number | null
          soiling_factor?: number | null
          system_efficiency?: number | null
          timestamp: string
        }
        Update: {
          ambient_temp?: number | null
          cell_temp_estimated?: number | null
          confidence_lower?: number
          confidence_upper?: number
          config_id?: string
          created_at?: string
          expected_generation_kwh?: number
          id?: string
          metadata?: Json | null
          plant_id?: string
          poa_irradiance?: number | null
          shading_factor?: number | null
          soiling_factor?: number | null
          system_efficiency?: number | null
          timestamp?: string
        }
        Relationships: [
          {
            foreignKeyName: "baseline_forecasts_config_id_fkey"
            columns: ["config_id"]
            isOneToOne: false
            referencedRelation: "digital_twin_configs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "baseline_forecasts_plant_id_fkey"
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
      data_quality_logs: {
        Row: {
          accuracy_metrics: Json | null
          accuracy_score: number
          auto_corrections: Json
          completeness_metrics: Json | null
          completeness_score: number
          consistency_metrics: Json | null
          consistency_score: number
          created_at: string
          data_source: string
          id: string
          issues: Json
          overall_score: number
          period_end: string
          period_start: string
          plant_id: string | null
          timeliness_metrics: Json | null
          timeliness_score: number
        }
        Insert: {
          accuracy_metrics?: Json | null
          accuracy_score?: number
          auto_corrections?: Json
          completeness_metrics?: Json | null
          completeness_score?: number
          consistency_metrics?: Json | null
          consistency_score?: number
          created_at?: string
          data_source: string
          id?: string
          issues?: Json
          overall_score?: number
          period_end: string
          period_start: string
          plant_id?: string | null
          timeliness_metrics?: Json | null
          timeliness_score?: number
        }
        Update: {
          accuracy_metrics?: Json | null
          accuracy_score?: number
          auto_corrections?: Json
          completeness_metrics?: Json | null
          completeness_score?: number
          consistency_metrics?: Json | null
          consistency_score?: number
          created_at?: string
          data_source?: string
          id?: string
          issues?: Json
          overall_score?: number
          period_end?: string
          period_start?: string
          plant_id?: string | null
          timeliness_metrics?: Json | null
          timeliness_score?: number
        }
        Relationships: [
          {
            foreignKeyName: "data_quality_logs_plant_id_fkey"
            columns: ["plant_id"]
            isOneToOne: false
            referencedRelation: "plants"
            referencedColumns: ["id"]
          },
        ]
      }
      digital_twin_configs: {
        Row: {
          baseline_model: Json
          calibration_date: string | null
          created_at: string
          environmental_context: Json
          id: string
          inverters: Json
          layout: Json
          losses: Json
          performance_ratio_target: number
          plant_id: string
          strings: Json
          trackers: Json | null
          updated_at: string
          validation_metrics: Json | null
          version: string
        }
        Insert: {
          baseline_model: Json
          calibration_date?: string | null
          created_at?: string
          environmental_context: Json
          id?: string
          inverters?: Json
          layout: Json
          losses: Json
          performance_ratio_target?: number
          plant_id: string
          strings?: Json
          trackers?: Json | null
          updated_at?: string
          validation_metrics?: Json | null
          version?: string
        }
        Update: {
          baseline_model?: Json
          calibration_date?: string | null
          created_at?: string
          environmental_context?: Json
          id?: string
          inverters?: Json
          layout?: Json
          losses?: Json
          performance_ratio_target?: number
          plant_id?: string
          strings?: Json
          trackers?: Json | null
          updated_at?: string
          validation_metrics?: Json | null
          version?: string
        }
        Relationships: [
          {
            foreignKeyName: "digital_twin_configs_plant_id_fkey"
            columns: ["plant_id"]
            isOneToOne: false
            referencedRelation: "plants"
            referencedColumns: ["id"]
          },
        ]
      }
      invoice_analyses: {
        Row: {
          ai_insights: Json | null
          analysis_report: Json
          anomalies_detected: Json | null
          chat_report: string | null
          created_at: string | null
          id: string
          invoice_id: string | null
          recommendations: Json | null
          updated_at: string | null
        }
        Insert: {
          ai_insights?: Json | null
          analysis_report: Json
          anomalies_detected?: Json | null
          chat_report?: string | null
          created_at?: string | null
          id?: string
          invoice_id?: string | null
          recommendations?: Json | null
          updated_at?: string | null
        }
        Update: {
          ai_insights?: Json | null
          analysis_report?: Json
          anomalies_detected?: Json | null
          chat_report?: string | null
          created_at?: string | null
          id?: string
          invoice_id?: string | null
          recommendations?: Json | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "invoice_analyses_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
        ]
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
      metrics_cache: {
        Row: {
          cache_data: Json
          cache_key: string
          created_at: string
          expires_at: string
          id: string
          updated_at: string
        }
        Insert: {
          cache_data: Json
          cache_key: string
          created_at?: string
          expires_at: string
          id?: string
          updated_at?: string
        }
        Update: {
          cache_data?: Json
          cache_key?: string
          created_at?: string
          expires_at?: string
          id?: string
          updated_at?: string
        }
        Relationships: []
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
      performance_gaps: {
        Row: {
          actual_kwh: number
          alert_id: string | null
          alert_triggered: boolean
          created_at: string
          estimated_loss_brl: number | null
          expected_kwh: number
          gap_kwh: number
          gap_percent: number
          id: string
          plant_id: string
          probable_causes: Json
          timestamp: string
        }
        Insert: {
          actual_kwh: number
          alert_id?: string | null
          alert_triggered?: boolean
          created_at?: string
          estimated_loss_brl?: number | null
          expected_kwh: number
          gap_kwh: number
          gap_percent: number
          id?: string
          plant_id: string
          probable_causes?: Json
          timestamp: string
        }
        Update: {
          actual_kwh?: number
          alert_id?: string | null
          alert_triggered?: boolean
          created_at?: string
          estimated_loss_brl?: number | null
          expected_kwh?: number
          gap_kwh?: number
          gap_percent?: number
          id?: string
          plant_id?: string
          probable_causes?: Json
          timestamp?: string
        }
        Relationships: [
          {
            foreignKeyName: "performance_gaps_plant_id_fkey"
            columns: ["plant_id"]
            isOneToOne: false
            referencedRelation: "plants"
            referencedColumns: ["id"]
          },
        ]
      }
      plant_audits: {
        Row: {
          actual_generation_kwh: number
          audit_date: string
          confidence_percent: number
          created_at: string
          executive_summary: Json | null
          expected_generation_kwh: number
          gap_kwh: number
          gap_percent: number
          id: string
          period_end: string
          period_start: string
          plant_id: string
          recoverable_generation_kwh: number
          recoverable_value_brl: number
          status: string
          updated_at: string
        }
        Insert: {
          actual_generation_kwh: number
          audit_date: string
          confidence_percent?: number
          created_at?: string
          executive_summary?: Json | null
          expected_generation_kwh: number
          gap_kwh: number
          gap_percent: number
          id?: string
          period_end: string
          period_start: string
          plant_id: string
          recoverable_generation_kwh?: number
          recoverable_value_brl?: number
          status?: string
          updated_at?: string
        }
        Update: {
          actual_generation_kwh?: number
          audit_date?: string
          confidence_percent?: number
          created_at?: string
          executive_summary?: Json | null
          expected_generation_kwh?: number
          gap_kwh?: number
          gap_percent?: number
          id?: string
          period_end?: string
          period_start?: string
          plant_id?: string
          recoverable_generation_kwh?: number
          recoverable_value_brl?: number
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "plant_audits_plant_id_fkey"
            columns: ["plant_id"]
            isOneToOne: false
            referencedRelation: "plants"
            referencedColumns: ["id"]
          },
        ]
      }
      plant_credentials: {
        Row: {
          access_key: string | null
          appkey: string | null
          base_url: string | null
          created_at: string
          id: string
          password: string | null
          plant_id: string
          provider: string
          updated_at: string
          username: string | null
        }
        Insert: {
          access_key?: string | null
          appkey?: string | null
          base_url?: string | null
          created_at?: string
          id?: string
          password?: string | null
          plant_id: string
          provider: string
          updated_at?: string
          username?: string | null
        }
        Update: {
          access_key?: string | null
          appkey?: string | null
          base_url?: string | null
          created_at?: string
          id?: string
          password?: string | null
          plant_id?: string
          provider?: string
          updated_at?: string
          username?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "plant_credentials_plant_id_fkey"
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
      security_audit_logs: {
        Row: {
          action: string
          created_at: string
          error_message: string | null
          id: string
          ip_address: unknown | null
          record_id: string | null
          success: boolean
          table_name: string | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string
          error_message?: string | null
          id?: string
          ip_address?: unknown | null
          record_id?: string | null
          success?: boolean
          table_name?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          error_message?: string | null
          id?: string
          ip_address?: unknown | null
          record_id?: string | null
          success?: boolean
          table_name?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      smart_alerts: {
        Row: {
          acknowledged_at: string | null
          alert_type: string
          conditions: Json | null
          created_at: string
          id: string
          message: string
          plant_id: string | null
          resolved_at: string | null
          severity: string
          status: string
          triggered_at: string
        }
        Insert: {
          acknowledged_at?: string | null
          alert_type: string
          conditions?: Json | null
          created_at?: string
          id?: string
          message: string
          plant_id?: string | null
          resolved_at?: string | null
          severity: string
          status?: string
          triggered_at?: string
        }
        Update: {
          acknowledged_at?: string | null
          alert_type?: string
          conditions?: Json | null
          created_at?: string
          id?: string
          message?: string
          plant_id?: string | null
          resolved_at?: string | null
          severity?: string
          status?: string
          triggered_at?: string
        }
        Relationships: []
      }
      sungrow_credential_profiles: {
        Row: {
          access_key: string
          appkey: string
          auth_mode: string
          base_url: string | null
          created_at: string
          description: string | null
          id: string
          is_default: boolean | null
          name: string
          password: string | null
          updated_at: string
          user_id: string
          username: string | null
        }
        Insert: {
          access_key: string
          appkey: string
          auth_mode?: string
          base_url?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_default?: boolean | null
          name: string
          password?: string | null
          updated_at?: string
          user_id: string
          username?: string | null
        }
        Update: {
          access_key?: string
          appkey?: string
          auth_mode?: string
          base_url?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_default?: boolean | null
          name?: string
          password?: string | null
          updated_at?: string
          user_id?: string
          username?: string | null
        }
        Relationships: []
      }
      sungrow_tokens: {
        Row: {
          access_token: string
          config_hash: string
          created_at: string
          expires_at: string
          plant_id: string | null
          provider: string
          refresh_token: string | null
          scope: string | null
          token_type: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          access_token: string
          config_hash: string
          created_at?: string
          expires_at: string
          plant_id?: string | null
          provider?: string
          refresh_token?: string | null
          scope?: string | null
          token_type?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          access_token?: string
          config_hash?: string
          created_at?: string
          expires_at?: string
          plant_id?: string | null
          provider?: string
          refresh_token?: string | null
          scope?: string | null
          token_type?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
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
      system_backups: {
        Row: {
          backup_id: string
          backup_type: string
          created_at: string
          id: string
          metadata: Json | null
          size_mb: number
          status: string
          table_details: Json | null
          tables_included: string[]
          updated_at: string
        }
        Insert: {
          backup_id: string
          backup_type: string
          created_at?: string
          id?: string
          metadata?: Json | null
          size_mb?: number
          status?: string
          table_details?: Json | null
          tables_included?: string[]
          updated_at?: string
        }
        Update: {
          backup_id?: string
          backup_type?: string
          created_at?: string
          id?: string
          metadata?: Json | null
          size_mb?: number
          status?: string
          table_details?: Json | null
          tables_included?: string[]
          updated_at?: string
        }
        Relationships: []
      }
      system_health_logs: {
        Row: {
          component: string
          created_at: string
          id: string
          message: string | null
          metrics: Json
          status: string
        }
        Insert: {
          component: string
          created_at?: string
          id?: string
          message?: string | null
          metrics?: Json
          status: string
        }
        Update: {
          component?: string
          created_at?: string
          id?: string
          message?: string | null
          metrics?: Json
          status?: string
        }
        Relationships: []
      }
      system_metrics: {
        Row: {
          collected_at: string
          created_at: string
          id: string
          metric_data: Json
          metric_type: string
        }
        Insert: {
          collected_at?: string
          created_at?: string
          id?: string
          metric_data: Json
          metric_type: string
        }
        Update: {
          collected_at?: string
          created_at?: string
          id?: string
          metric_data?: Json
          metric_type?: string
        }
        Relationships: []
      }
      system_restore_logs: {
        Row: {
          backup_id: string
          completed_at: string | null
          created_at: string
          errors: Json | null
          id: string
          restore_id: string
          started_at: string
          status: string
          tables_restored: Json | null
        }
        Insert: {
          backup_id: string
          completed_at?: string | null
          created_at?: string
          errors?: Json | null
          id?: string
          restore_id: string
          started_at: string
          status: string
          tables_restored?: Json | null
        }
        Update: {
          backup_id?: string
          completed_at?: string | null
          created_at?: string
          errors?: Json | null
          id?: string
          restore_id?: string
          started_at?: string
          status?: string
          tables_restored?: Json | null
        }
        Relationships: []
      }
      ticket_history: {
        Row: {
          changed_at: string
          changed_by: string | null
          field_changed: string
          id: string
          new_value: string | null
          notes: string | null
          old_value: string | null
          ticket_id: string
        }
        Insert: {
          changed_at?: string
          changed_by?: string | null
          field_changed: string
          id?: string
          new_value?: string | null
          notes?: string | null
          old_value?: string | null
          ticket_id: string
        }
        Update: {
          changed_at?: string
          changed_by?: string | null
          field_changed?: string
          id?: string
          new_value?: string | null
          notes?: string | null
          old_value?: string | null
          ticket_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ticket_history_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      tickets: {
        Row: {
          actual_hours: number | null
          assigned_to: string | null
          closed_at: string | null
          created_at: string
          description: string
          due_date: string | null
          estimated_hours: number | null
          id: string
          opened_at: string
          plant_id: string
          priority: string
          status: string
          title: string | null
          type: string
          updated_at: string
        }
        Insert: {
          actual_hours?: number | null
          assigned_to?: string | null
          closed_at?: string | null
          created_at?: string
          description: string
          due_date?: string | null
          estimated_hours?: number | null
          id?: string
          opened_at?: string
          plant_id: string
          priority: string
          status?: string
          title?: string | null
          type: string
          updated_at?: string
        }
        Update: {
          actual_hours?: number | null
          assigned_to?: string | null
          closed_at?: string | null
          created_at?: string
          description?: string
          due_date?: string | null
          estimated_hours?: number | null
          id?: string
          opened_at?: string
          plant_id?: string
          priority?: string
          status?: string
          title?: string | null
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
      detect_suspicious_activity: {
        Args: {
          p_max_failed_attempts?: number
          p_time_window_minutes?: number
          p_user_id: string
        }
        Returns: boolean
      }
      get_recent_security_events: {
        Args: { p_hours?: number }
        Returns: {
          action: string
          created_at: string
          ip_address: unknown
          success: boolean
          table_name: string
          user_id: string
        }[]
      }
      get_user_role: {
        Args: { user_id: string }
        Returns: string
      }
      log_sensitive_access: {
        Args: {
          p_action: string
          p_record_id?: string
          p_success?: boolean
          p_table_name: string
          p_user_id: string
        }
        Returns: undefined
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
  public: {
    Enums: {},
  },
} as const
