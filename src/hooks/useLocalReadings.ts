
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Plant } from '@/types';

export const useLocalReadings = (plant: Plant) => {
  return useQuery({
    queryKey: ['local-readings', plant.id],
    queryFn: async () => {
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 30);

      const { data, error } = await supabase
        .from('readings')
        .select('*')
        .eq('plant_id', plant.id)
        .gte('timestamp', startDate.toISOString())
        .lte('timestamp', endDate.toISOString())
        .order('timestamp', { ascending: true });

      if (error) throw error;
      return data;
    }
  });
};
