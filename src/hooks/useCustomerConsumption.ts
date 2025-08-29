
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useEffect } from "react";

// Hook para buscar dados de consumo mensal por UC
export const useCustomerConsumption = (customerId: string) => {
  const queryClient = useQueryClient();

  // Realtime subscription for invoice updates
  useEffect(() => {
    if (!customerId) return;

    const channel = supabase
      .channel(`customer-invoices-${customerId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'invoices' },
        (payload) => {
          console.log('[Customer Consumption] Invoice updated:', payload);
          // Invalidate customer consumption data when invoices change
          queryClient.invalidateQueries({ queryKey: ["customer-consumption", customerId] });
        }
      )
      .on(
        'postgres_changes', 
        { event: '*', schema: 'public', table: 'customer_units' },
        (payload) => {
          console.log('[Customer Consumption] Customer units updated:', payload);
          // Invalidate when customer units change
          queryClient.invalidateQueries({ queryKey: ["customer-consumption", customerId] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [customerId, queryClient]);

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
      
      // Se não houver UCs cadastradas para o cliente, usar fallback pelas UCs das plantas
      if (unitIds.length === 0) {
        const { data: plants, error: plantsError } = await supabase
          .from("plants")
          .select("id, name, consumer_unit_code")
          .eq("customer_id", customerId);

        if (plantsError) throw plantsError;

        const ucCodes = (plants || [])
          .map((p: any) => p.consumer_unit_code)
          .filter((c: any): c is string => !!c);

        if (ucCodes.length === 0) {
          return { chartData: [], units: [] };
        }

        const { data: invoiceData, error: invByUcError } = await supabase
          .from("invoices")
          .select("uc_code, reference_month, energy_kwh, total_r$, taxes_r$")
          .in("uc_code", ucCodes)
          .eq("status", "processed")
          .order("reference_month", { ascending: true });

        if (invByUcError) throw invByUcError;

        const monthlyData: { [key: string]: { consumption: number, cost: number } } = {};

        invoiceData?.forEach((invoice: any) => {
          const month = invoice.reference_month;
          if (!monthlyData[month]) {
            monthlyData[month] = { consumption: 0, cost: 0 };
          }
          monthlyData[month].consumption += Number(invoice.energy_kwh) || 0;
          monthlyData[month].cost += Number(invoice.total_r$) || 0;
        });

        const chartData = Object.entries(monthlyData).map(([month, data]) => ({
          month,
          consumption: data.consumption,
          cost: data.cost,
        }));

        const unitsFallback = (plants || [])
          .filter((p: any) => p.consumer_unit_code)
          .map((p: any) => ({ id: p.id, uc_code: p.consumer_unit_code, unit_name: p.name }));

        return { chartData, units: unitsFallback };
      }

      // Buscar faturas por customer_unit_id
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
        monthlyData[month].consumption += Number(invoice.energy_kwh) || 0;
        monthlyData[month].cost += Number(invoice.total_r$) || 0;
      });

      const chartData = Object.entries(monthlyData).map(([month, data]) => ({
        month,
        consumption: data.consumption,
        cost: data.cost,
      }));

      return { chartData, units: units || [] };
    },
    enabled: !!customerId,
    refetchInterval: 30000, // Refetch every 30 seconds
    staleTime: 20000, // Consider data stale after 20 seconds
  });
};
