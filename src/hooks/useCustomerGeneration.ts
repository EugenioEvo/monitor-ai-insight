
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

// Hook para buscar dados de geração mensal por planta
export const useCustomerGeneration = (customerId: string) => {
  return useQuery({
    queryKey: ["customer-generation", customerId],
    queryFn: async () => {
      const { data: plants, error: plantsError } = await supabase
        .from("plants")
        .select("id, name")
        .eq("customer_id", customerId);

      if (plantsError) throw plantsError;

      const plantIds = plants?.map(plant => plant.id) || [];
      
      if (plantIds.length === 0) {
        return { chartData: [], plants: [] };
      }

      const { data, error } = await supabase
        .from("readings")
        .select("plant_id, timestamp, energy_kwh")
        .in("plant_id", plantIds)
        .order("timestamp", { ascending: true });

      if (error) throw error;

      const monthlyData: { [key: string]: { [plantId: string]: number } } = {};
      
      data?.forEach(reading => {
        const month = reading.timestamp.substring(0, 7);
        if (!monthlyData[month]) {
          monthlyData[month] = {};
        }
        if (!monthlyData[month][reading.plant_id]) {
          monthlyData[month][reading.plant_id] = 0;
        }
        monthlyData[month][reading.plant_id] += reading.energy_kwh;
      });

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
