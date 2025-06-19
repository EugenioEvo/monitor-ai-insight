
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

// Hook para buscar dados de consumo mensal por UC
export const useCustomerConsumption = (customerId: string) => {
  return useQuery({
    queryKey: ["customer-consumption", customerId],
    queryFn: async () => {
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

      // Buscar faturas com consulta simples
      const { data: invoiceData, error } = await supabase
        .from("invoices")
        .select("customer_unit_id, reference_month, energy_kwh, total_r$, taxes_r$")
        .in("customer_unit_id", unitIds)
        .eq("status", "processed")
        .order("reference_month", { ascending: true });

      if (error) throw error;

      const monthlyData: { [key: string]: { consumption: number, cost: number } } = {};
      
      invoiceData?.forEach((invoice: any) => {
        const month = invoice.reference_month;
        if (!monthlyData[month]) {
          monthlyData[month] = { consumption: 0, cost: 0 };
        }
        monthlyData[month].consumption += invoice.energy_kwh;
        monthlyData[month].cost += invoice.total_r$;
      });

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
