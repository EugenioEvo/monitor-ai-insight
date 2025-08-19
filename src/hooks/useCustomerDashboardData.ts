import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Customer, Plant, CustomerUnit, CustomerMetrics } from "@/types";

// Hook otimizado que cruza todos os dados necessários para o dashboard do cliente
export const useCustomerDashboardData = (customerId: string, selectedPeriod: string) => {
  return useQuery({
    queryKey: ["customer-dashboard-complete", customerId, selectedPeriod],
    queryFn: async () => {
      // 1. Buscar dados do cliente
      const { data: customer, error: customerError } = await supabase
        .from("customers")
        .select("*")
        .eq("id", customerId)
        .single();

      if (customerError) throw customerError;

      // 2. Buscar plantas do cliente (UCs de geração)
      const { data: plants, error: plantsError } = await supabase
        .from("plants")
        .select("*")
        .eq("customer_id", customerId);

      if (plantsError) throw plantsError;

      // 3. Buscar unidades consumidoras
      const { data: units, error: unitsError } = await supabase
        .from("customer_units")
        .select("*")
        .eq("customer_id", customerId)
        .eq("is_active", true);

      if (unitsError) throw unitsError;

      // 4. Buscar métricas consolidadas por mês
      const { data: metrics, error: metricsError } = await supabase
        .from("customer_metrics")
        .select("*")
        .eq("customer_id", customerId)
        .order("month", { ascending: false })
        .limit(parseInt(selectedPeriod));

      if (metricsError) throw metricsError;

      // 5. Buscar dados detalhados de faturas (consumo)
      const unitIds = units?.map(unit => unit.id) || [];
      let monthlyConsumption: { [key: string]: { consumption: number, cost: number } } = {};
      
      if (unitIds.length > 0) {
        const { data: invoices, error: invoicesError } = await supabase
          .from("invoices")
          .select("reference_month, energy_kwh, \"total_r$\"")
          .in("customer_unit_id", unitIds)
          .eq("status", "processed")
          .order("reference_month", { ascending: false });

        if (invoicesError) throw invoicesError;

        invoices?.forEach((invoice: any) => {
          const month = invoice.reference_month;
          if (!monthlyConsumption[month]) {
            monthlyConsumption[month] = { consumption: 0, cost: 0 };
          }
          monthlyConsumption[month].consumption += Number(invoice.energy_kwh) || 0;
          monthlyConsumption[month].cost += Number(invoice["total_r$"]) || 0;
        });
      } else {
        // Fallback: se não houver UCs cadastradas, buscar pelas UCs das plantas do cliente
        const ucCodes = (plants || [])
          .map((p: any) => p.consumer_unit_code)
          .filter((c: any): c is string => !!c);

        if (ucCodes.length > 0) {
          const { data: invoicesByUc, error: invUcErr } = await supabase
            .from("invoices")
            .select("reference_month, energy_kwh, \"total_r$\", uc_code")
            .in("uc_code", ucCodes)
            .eq("status", "processed")
            .order("reference_month", { ascending: false });

          if (invUcErr) throw invUcErr;

          invoicesByUc?.forEach((invoice: any) => {
            const month = invoice.reference_month;
            if (!monthlyConsumption[month]) {
              monthlyConsumption[month] = { consumption: 0, cost: 0 };
            }
            monthlyConsumption[month].consumption += Number(invoice.energy_kwh) || 0;
            monthlyConsumption[month].cost += Number(invoice["total_r$"]) || 0;
          });
        }
      }

      // 6. Buscar dados de geração
      const plantIds = plants?.map(plant => plant.id) || [];
      let monthlyGeneration: { [key: string]: number } = {};
      
      if (plantIds.length > 0) {
        const { data: readings, error: readingsError } = await supabase
          .from("readings")
          .select("timestamp, energy_kwh")
          .in("plant_id", plantIds)
          .order("timestamp", { ascending: false });

        if (readingsError) throw readingsError;

        readings?.forEach(reading => {
          const month = reading.timestamp.substring(0, 7); // YYYY-MM
          if (!monthlyGeneration[month]) {
            monthlyGeneration[month] = 0;
          }
          monthlyGeneration[month] += reading.energy_kwh;
        });
      }

      // 7. Cruzar dados de geração e consumo por mês
      const allMonths = new Set([
        ...Object.keys(monthlyGeneration),
        ...Object.keys(monthlyConsumption),
        ...(metrics?.map(m => m.month) || [])
      ]);

      const chartData = Array.from(allMonths)
        .sort()
        .slice(-parseInt(selectedPeriod))
        .map(month => {
          const generation = monthlyGeneration[month] || 0;
          const consumption = monthlyConsumption[month]?.consumption || 0;
          const cost = monthlyConsumption[month]?.cost || 0;
          const balance = generation - consumption;
          
          return {
            month,
            generation,
            consumption,
            cost,
            balance,
            selfSufficiency: consumption > 0 ? (generation / consumption) * 100 : 0
          };
        });

      // 8. Calcular métricas consolidadas
      const totalGeneration = chartData.reduce((sum, data) => sum + data.generation, 0);
      const totalConsumption = chartData.reduce((sum, data) => sum + data.consumption, 0);
      const totalCost = chartData.reduce((sum, data) => sum + data.cost, 0);
      const totalSavings = metrics?.reduce((sum, metric) => sum + metric.total_savings_r$, 0) || 0;
      const energyBalance = totalGeneration - totalConsumption;
      const avgSelfSufficiency = totalConsumption > 0 ? (totalGeneration / totalConsumption) * 100 : 0;

      return {
        customer: customer as Customer,
        plants: plants as Plant[] || [],
        units: units as CustomerUnit[] || [],
        metrics: metrics as CustomerMetrics[] || [],
        chartData,
        summary: {
          totalGeneration,
          totalConsumption,
          totalCost,
          totalSavings,
          energyBalance,
          avgSelfSufficiency,
          activePlants: plants?.filter(p => p.status === 'active').length || 0,
          totalCapacity: plants?.reduce((sum, plant) => sum + plant.capacity_kwp, 0) || 0,
          activeUnits: units?.length || 0
        }
      };
    },
    enabled: !!customerId,
  });
};