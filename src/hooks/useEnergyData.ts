
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Plant } from '@/types';
import type { SolarEdgeConfig } from '@/types/monitoring';
import logger from '@/lib/logger';

export const useEnergyData = (plant: Plant, period: 'DAY' | 'MONTH' | 'YEAR') => {
  return useQuery({
    queryKey: ['energy-details', plant.id, period],
    queryFn: async () => {
      if (plant.monitoring_system !== 'solaredge' || !plant.api_credentials) {
        return null;
      }

      logger.log('Fetching energy details for plant:', plant.id);
      logger.log('Plant config:', {
        monitoring_system: plant.monitoring_system,
        api_site_id: plant.api_site_id,
        has_credentials: !!plant.api_credentials
      });

      // Use api_site_id from plant if siteId is empty in credentials
      const config = {
        ...plant.api_credentials as SolarEdgeConfig,
        siteId: plant.api_site_id || (plant.api_credentials as SolarEdgeConfig)?.siteId
      };

      logger.log('Using config for energy details:', {
        hasApiKey: !!config.apiKey,
        siteId: config.siteId
      });

      const { data, error } = await supabase.functions.invoke('solaredge-connector', {
        body: {
          action: 'get_energy_details',
          config: config,
          period
        }
      });

      if (error) {
        logger.error('Supabase function error:', error);
        throw error;
      }

      logger.log('Energy details response from SolarEdge:', data);
      return data.success ? data.data : null;
    },
    enabled: plant.monitoring_system === 'solaredge' && !!plant.api_credentials && (!!plant.api_site_id || !!(plant.api_credentials as SolarEdgeConfig)?.siteId)
  });
};
