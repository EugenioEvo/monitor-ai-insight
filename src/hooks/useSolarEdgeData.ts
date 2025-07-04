import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Plant } from '@/types';
import { useLogger } from '@/services/logger';

interface SolarEdgeConfig {
  apiKey: string;
  siteId: string;
  username?: string;
  password?: string;
}

export const useSolarEdgeOverview = (plant: Plant) => {
  const logger = useLogger('useSolarEdgeOverview');

  return useQuery({
    queryKey: ['solaredge-overview', plant.id],
    queryFn: async () => {
      if (plant.monitoring_system !== 'solaredge' || !plant.api_credentials) {
        return null;
      }

      logger.info('Fetching SolarEdge overview for plant:', {
        plantId: plant.id,
        siteId: plant.api_site_id
      });

      const config = plant.api_credentials as SolarEdgeConfig;
      const siteId = plant.api_site_id || config.siteId;

      if (!config.apiKey || !siteId) {
        throw new Error('Configuração incompleta: API Key ou Site ID não encontrado');
      }

      const { data, error } = await supabase.functions.invoke('solaredge-connector', {
        body: {
          action: 'get_overview',
          config: {
            ...config,
            siteId: siteId
          }
        }
      });

      if (error) {
        logger.error('Supabase function error:', error);
        throw error;
      }

      logger.info('SolarEdge overview response:', data);
      return data.success ? data.data : null;
    },
    enabled: plant.monitoring_system === 'solaredge' && !!plant.api_credentials,
    refetchInterval: 5 * 60 * 1000, // Atualizar a cada 5 minutos
    retry: 3,
    retryDelay: attemptIndex => Math.min(1000 * 2 ** attemptIndex, 30000)
  });
};

export const useSolarEdgeEquipment = (plant: Plant) => {
  const logger = useLogger('useSolarEdgeEquipment');

  return useQuery({
    queryKey: ['solaredge-equipment', plant.id],
    queryFn: async () => {
      if (plant.monitoring_system !== 'solaredge' || !plant.api_credentials) {
        return null;
      }

      logger.info('Fetching SolarEdge equipment for plant:', {
        plantId: plant.id,
        siteId: plant.api_site_id
      });

      const config = plant.api_credentials as SolarEdgeConfig;
      const siteId = plant.api_site_id || config.siteId;

      if (!config.apiKey || !siteId) {
        throw new Error('Configuração incompleta: API Key ou Site ID não encontrado');
      }

      const { data, error } = await supabase.functions.invoke('solaredge-connector', {
        body: {
          action: 'get_equipment_list',
          config: {
            ...config,
            siteId: siteId
          }
        }
      });

      if (error) {
        logger.error('Supabase function error:', error);
        throw error;
      }

      logger.info('SolarEdge equipment response:', data);
      return data.success ? data.data : null;
    },
    enabled: plant.monitoring_system === 'solaredge' && !!plant.api_credentials,
    refetchInterval: 15 * 60 * 1000, // Atualizar a cada 15 minutos
    retry: 2
  });
};

export const useSolarEdgeEnergyData = (plant: Plant, period: 'DAY' | 'MONTH' | 'YEAR') => {
  const logger = useLogger('useSolarEdgeEnergyData');

  return useQuery({
    queryKey: ['solaredge-energy', plant.id, period],
    queryFn: async () => {
      if (plant.monitoring_system !== 'solaredge' || !plant.api_credentials) {
        return null;
      }

      logger.info('Fetching SolarEdge energy data for plant:', {
        plantId: plant.id,
        siteId: plant.api_site_id,
        period: period
      });

      const config = plant.api_credentials as SolarEdgeConfig;
      const siteId = plant.api_site_id || config.siteId;

      if (!config.apiKey || !siteId) {
        throw new Error('Configuração incompleta: API Key ou Site ID não encontrado');
      }

      const { data, error } = await supabase.functions.invoke('solaredge-connector', {
        body: {
          action: 'get_energy_details',
          config: {
            ...config,
            siteId: siteId
          },
          period: period
        }
      });

      if (error) {
        logger.error('Supabase function error:', error);
        throw error;
      }

      logger.info('SolarEdge energy response:', data);
      return data.success ? data.data : null;
    },
    enabled: plant.monitoring_system === 'solaredge' && !!plant.api_credentials,
    refetchInterval: period === 'DAY' ? 10 * 60 * 1000 : 30 * 60 * 1000, // 10min para daily, 30min para outros
    retry: 2
  });
};

export const useSolarEdgePowerFlow = (plant: Plant) => {
  const logger = useLogger('useSolarEdgePowerFlow');

  return useQuery({
    queryKey: ['solaredge-powerflow', plant.id],
    queryFn: async () => {
      if (plant.monitoring_system !== 'solaredge' || !plant.api_credentials) {
        return null;
      }

      logger.info('Fetching SolarEdge power flow for plant:', {
        plantId: plant.id,
        siteId: plant.api_site_id
      });

      const config = plant.api_credentials as SolarEdgeConfig;
      const siteId = plant.api_site_id || config.siteId;

      if (!config.apiKey || !siteId) {
        throw new Error('Configuração incompleta: API Key ou Site ID não encontrado');
      }

      const { data, error } = await supabase.functions.invoke('solaredge-connector', {
        body: {
          action: 'get_power_flow',
          config: {
            ...config,
            siteId: siteId
          }
        }
      });

      if (error) {
        logger.error('Supabase function error:', error);
        throw error;
      }

      logger.info('SolarEdge power flow response:', data);
      return data.success ? data.data : null;
    },
    enabled: plant.monitoring_system === 'solaredge' && !!plant.api_credentials,
    refetchInterval: 2 * 60 * 1000, // Atualizar a cada 2 minutos para dados em tempo real
    retry: 2
  });
};