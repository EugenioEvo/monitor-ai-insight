import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Plant } from "@/types";

export const usePlantConsumption = (plant: Plant) => {
  return useQuery({
    queryKey: ["plant-consumption", plant.id],
    queryFn: async () => {
      // Buscar faturas usando o consumer_unit_code da planta
      if (!plant.consumer_unit_code) {
        return { chartData: [], totalConsumption: 0, totalCost: 0 };
      }

      const { data: invoices, error } = await supabase
        .from("invoices")
        .select("reference_month, energy_kwh, \"total_r$\", \"taxes_r$\", uc_code")
        .eq("uc_code", plant.consumer_unit_code)
        .eq("status", "processed")
        .order("reference_month", { ascending: false });

      if (error) throw error;

      // Agrupar dados por mês
      const monthlyData: { [key: string]: { consumption: number, cost: number } } = {};

      invoices?.forEach((invoice: any) => {
        const month = invoice.reference_month;
        if (!monthlyData[month]) {
          monthlyData[month] = { consumption: 0, cost: 0 };
        }
        monthlyData[month].consumption += Number(invoice.energy_kwh) || 0;
        monthlyData[month].cost += Number(invoice.total_r$) || 0;
      });

      // Converter para array de chart data
      const chartData = Object.entries(monthlyData)
        .map(([month, data]) => ({
          month,
          consumption: data.consumption,
          cost: data.cost,
        }))
        .slice(-12); // Últimos 12 meses

      const totalConsumption = chartData.reduce((sum, data) => sum + data.consumption, 0);
      const totalCost = chartData.reduce((sum, data) => sum + data.cost, 0);

      return {
        chartData,
        totalConsumption,
        totalCost,
        ucCode: plant.consumer_unit_code
      };
    },
    enabled: !!plant.consumer_unit_code,
  });
};