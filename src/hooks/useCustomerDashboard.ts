
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

// Interface para dados de consumo com aliases limpos
interface ConsumptionData {
  customer_unit_id: string;
  reference_month: string;
  energy_kwh: number;
  total_amount: number; // alias para total_r$
  taxes_amount: number; // alias para taxes_r$
}

// Hook para buscar dados completos de um cliente
export const useCustomerDashboard = (customerId: string) => {
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
          .limit(1000); // Últimas 1000 leituras

        if (readingsError) throw readingsError;
        
        // Converter dados do banco para o tipo Reading
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

// Hook para buscar dados de geração mensal por planta
export const useCustomerGenerationData = (customerId: string) => {
  return useQuery({
    queryKey: ["customer-generation", customerId],
    queryFn: async () => {
      // Buscar plantas do cliente
      const { data: plants, error: plantsError } = await supabase
        .from("plants")
        .select("id, name")
        .eq("customer_id", customerId);

      if (plantsError) throw plantsError;

      const plantIds = plants?.map(plant => plant.id) || [];
      
      if (plantIds.length === 0) {
        return { chartData: [], plants: [] };
      }

      // Buscar leituras agrupadas por mês
      const { data, error } = await supabase
        .from("readings")
        .select("plant_id, timestamp, energy_kwh")
        .in("plant_id", plantIds)
        .order("timestamp", { ascending: true });

      if (error) throw error;

      // Processar dados para agrupar por mês e planta
      const monthlyData: { [key: string]: { [plantId: string]: number } } = {};
      
      data?.forEach(reading => {
        const month = reading.timestamp.substring(0, 7); // YYYY-MM
        if (!monthlyData[month]) {
          monthlyData[month] = {};
        }
        if (!monthlyData[month][reading.plant_id]) {
          monthlyData[month][reading.plant_id] = 0;
        }
        monthlyData[month][reading.plant_id] += reading.energy_kwh;
      });

      // Converter para formato do gráfico
      const chartData = Object.entries(monthlyData).map(([month, plantData]) => ({
        month,
        ...plantData,
        total: Object.values(plantData).reduce((sum: number, value: number) => sum + value, 0)
      }));

      return { chartData, plants: plants || [] };
    },
    enabled: !!customerId,
  });
};

// Hook para buscar dados de consumo mensal por UC
export const useCustomerConsumptionData = (customerId: string) => {
  return useQuery({
    queryKey: ["customer-consumption", customerId],
    queryFn: async () => {
      // Buscar UCs do cliente
      const { data: units, error: unitsError } = await supabase
        .from("customer_units")
        .select("id, uc_code, unit_name")
        .eq("customer_id", customerId)
        .eq("is_active", true);

      if (unitsError) throw unitsError;

      const unitIds = units?.map(unit => unit.id) || [];
      
      if (unitIds.length === 0) {
        return { chartData: [], units: [] };
      }

      // Buscar faturas agrupadas por mês usando aliases para colunas com $
      const { data: invoiceData, error } = await supabase
        .from("invoices")
        .select("customer_unit_id, reference_month, energy_kwh, total_r$ as total_amount, taxes_r$ as taxes_amount")
        .in("customer_unit_id", unitIds)
        .eq("status", "processed")
        .order("reference_month", { ascending: true });

      if (error) throw error;

      // Processar dados para agrupar por mês
      const monthlyData: { [key: string]: { consumption: number, cost: number } } = {};
      
      // Usar a interface com aliases limpos
      const typedInvoiceData = invoiceData as ConsumptionData[];
      
      typedInvoiceData?.forEach((invoice) => {
        const month = invoice.reference_month;
        if (!monthlyData[month]) {
          monthlyData[month] = { consumption: 0, cost: 0 };
        }
        monthlyData[month].consumption += invoice.energy_kwh;
        monthlyData[month].cost += invoice.total_amount; // usando o alias
      });

      // Converter para formato do gráfico
      const chartData = Object.entries(monthlyData).map(([month, data]) => ({
        month,
        consumption: data.consumption,
        cost: data.cost
      }));

      return { chartData, units: units || [] };
    },
    enabled: !!customerId,
  });
};
