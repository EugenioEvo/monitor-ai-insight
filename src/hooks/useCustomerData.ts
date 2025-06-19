
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Customer, Plant, CustomerUnit, Invoice, Reading, CustomerMetrics } from "@/types";

// Tipos específicos para os dados do banco
interface DatabaseInvoice {
  id: string;
  file_url: string;
  uc_code: string;
  reference_month: string;
  energy_kwh: number;
  demand_kw: number;
  total_r$: number;
  taxes_r$: number;
  status: string;
  extracted_data?: any;
  customer_unit_id?: string;
  created_at: string;
  updated_at: string;
}

interface DatabaseReading {
  id: string;
  plant_id: string;
  timestamp: string;
  power_w: number;
  energy_kwh: number;
  created_at: string;
}

// Hook principal para buscar dados completos de um cliente
export const useCustomerData = (customerId: string) => {
  return useQuery({
    queryKey: ["customer-dashboard", customerId],
    queryFn: async () => {
      // Buscar dados do cliente
      const { data: customer, error: customerError } = await supabase
        .from("customers")
        .select("*")
        .eq("id", customerId)
        .single();

      if (customerError) throw customerError;

      // Buscar plantas do cliente
      const { data: plants, error: plantsError } = await supabase
        .from("plants")
        .select("*")
        .eq("customer_id", customerId);

      if (plantsError) throw plantsError;

      // Buscar unidades consumidoras
      const { data: units, error: unitsError } = await supabase
        .from("customer_units")
        .select("*")
        .eq("customer_id", customerId)
        .eq("is_active", true);

      if (unitsError) throw unitsError;

      // Buscar faturas das UCs do cliente
      const unitIds = units?.map(unit => unit.id) || [];
      let invoices: Invoice[] = [];
      
      if (unitIds.length > 0) {
        const { data: invoiceData, error: invoicesError } = await supabase
          .from("invoices")
          .select("*")
          .in("customer_unit_id", unitIds)
          .order("reference_month", { ascending: false });

        if (invoicesError) throw invoicesError;
        
        // Converter dados do banco para o tipo Invoice
        invoices = (invoiceData as DatabaseInvoice[])?.map(invoice => ({
          ...invoice,
          energy_kwh: invoice.energy_kwh,
          demand_kw: invoice.demand_kw,
          total_r$: invoice.total_r$,
          taxes_r$: invoice.taxes_r$
        } as Invoice)) || [];
      }

      // Buscar leituras das plantas
      const plantIds = plants?.map(plant => plant.id) || [];
      let readings: Reading[] = [];
      
      if (plantIds.length > 0) {
        const { data: readingData, error: readingsError } = await supabase
          .from("readings")
          .select("*")
          .in("plant_id", plantIds)
          .order("timestamp", { ascending: false })
          .limit(1000);

        if (readingsError) throw readingsError;
        
        readings = (readingData as DatabaseReading[])?.map(reading => ({
          ...reading,
          power_w: reading.power_w,
          energy_kwh: reading.energy_kwh
        } as Reading)) || [];
      }

      // Buscar métricas consolidadas
      const { data: metrics, error: metricsError } = await supabase
        .from("customer_metrics")
        .select("*")
        .eq("customer_id", customerId)
        .order("month", { ascending: false });

      if (metricsError) throw metricsError;

      return {
        customer: customer as Customer,
        plants: plants as Plant[],
        units: units as CustomerUnit[],
        invoices,
        readings,
        metrics: metrics as CustomerMetrics[]
      };
    },
    enabled: !!customerId,
  });
};
