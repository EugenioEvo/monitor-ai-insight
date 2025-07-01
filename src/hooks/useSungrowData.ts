
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Plant } from '@/types';
import type { SungrowConfig } from '@/types/monitoring';

export const useSungrowOverview = (plant: Plant) => {
  return useQuery({
    queryKey: ['sungrow-overview', plant.id],
    queryFn: async () => {
      if (plant.monitoring_system !== 'sungrow' || !plant.api_credentials) {
        return null;
      }

      console.log('Fetching Sungrow overview for plant:', plant.id);

      let config = plant.api_credentials as SungrowConfig;
      
      // Ensure plantId is set from plant configuration
      if (!config.plantId) {
        if (plant.api_site_id) {
          config = { ...config, plantId: plant.api_site_id };
        } else {
          console.error('Plant missing both plantId and api_site_id');
          throw new Error('Configuração incompleta: Plant ID não encontrado');
        }
      }

      console.log('Using config for overview:', {
        username: config.username ? `${config.username.substring(0, 3)}***` : 'missing',
        plantId: config.plantId || 'missing',
        has_credentials: !!(config.appkey && config.accessKey)
      });

      const { data, error } = await supabase.functions.invoke('sungrow-connector', {
        body: {
          action: 'get_station_real_kpi',
          config: config
        }
      });

      if (error) {
        console.error('Supabase function error:', error);
        throw error;
      }

      console.log('Sungrow overview response:', data);
      return data.success ? data.data : null;
    },
    enabled: plant.monitoring_system === 'sungrow' && !!plant.api_credentials,
    refetchInterval: 5 * 60 * 1000, // Atualizar a cada 5 minutos
    retry: 3,
    retryDelay: attemptIndex => Math.min(1000 * 2 ** attemptIndex, 30000)
  });
};

export const useSungrowEnergyData = (plant: Plant, period: 'day' | 'month' | 'year') => {
  return useQuery({
    queryKey: ['sungrow-energy', plant.id, period],
    queryFn: async () => {
      if (plant.monitoring_system !== 'sungrow' || !plant.api_credentials) {
        return null;
      }

      console.log('Fetching Sungrow energy data for plant:', plant.id, 'period:', period);

      let config = plant.api_credentials as SungrowConfig;
      
      // Ensure plantId is set from plant configuration
      if (!config.plantId) {
        if (plant.api_site_id) {
          config = { ...config, plantId: plant.api_site_id };
        } else {
          console.error('Plant missing both plantId and api_site_id');
          throw new Error('Configuração incompleta: Plant ID não encontrado');
        }
      }

      console.log('Using config for energy:', {
        username: config.username ? `${config.username.substring(0, 3)}***` : 'missing',
        plantId: config.plantId || 'missing',
        period: period
      });

      const { data, error } = await supabase.functions.invoke('sungrow-connector', {
        body: {
          action: 'get_station_energy',
          config: config,
          period: period
        }
      });

      if (error) {
        console.error('Supabase function error:', error);
        throw error;
      }

      console.log('Sungrow energy response:', data);
      return data.success ? data.data : null;
    },
    enabled: plant.monitoring_system === 'sungrow' && !!plant.api_credentials,
    refetchInterval: period === 'day' ? 10 * 60 * 1000 : 30 * 60 * 1000, // 10min para daily, 30min para outros
    retry: 2
  });
};

export const useSungrowDevices = (plant: Plant) => {
  return useQuery({
    queryKey: ['sungrow-devices', plant.id],
    queryFn: async () => {
      if (plant.monitoring_system !== 'sungrow' || !plant.api_credentials) {
        return null;
      }

      console.log('Fetching Sungrow devices for plant:', plant.id);

      let config = plant.api_credentials as SungrowConfig;
      
      // Ensure plantId is set from plant configuration
      if (!config.plantId) {
        if (plant.api_site_id) {
          config = { ...config, plantId: plant.api_site_id };
        } else {
          console.error('Plant missing both plantId and api_site_id');
          throw new Error('Configuração incompleta: Plant ID não encontrado');
        }
      }

      console.log('Using config for devices:', {
        username: config.username ? `${config.username.substring(0, 3)}***` : 'missing',
        plantId: config.plantId || 'missing'
      });

      const { data, error } = await supabase.functions.invoke('sungrow-connector', {
        body: {
          action: 'get_device_list',
          config: config
        }
      });

      if (error) {
        console.error('Supabase function error:', error);
        throw error;
      }

      console.log('Sungrow devices response:', data);
      return data.success ? data.data : null;
    },
    enabled: plant.monitoring_system === 'sungrow' && !!plant.api_credentials,
    refetchInterval: 15 * 60 * 1000, // Atualizar a cada 15 minutos
    retry: 2
  });
};

export const useSungrowRealtimeData = (plant: Plant, deviceType: string = '1') => {
  return useQuery({
    queryKey: ['sungrow-realtime', plant.id, deviceType],
    queryFn: async () => {
      if (plant.monitoring_system !== 'sungrow' || !plant.api_credentials) {
        return null;
      }

      console.log('Fetching Sungrow realtime data for plant:', plant.id, 'deviceType:', deviceType);

      let config = plant.api_credentials as SungrowConfig;
      
      // Ensure plantId is set from plant configuration
      if (!config.plantId) {
        if (plant.api_site_id) {
          config = { ...config, plantId: plant.api_site_id };
        } else {
          console.error('Plant missing both plantId and api_site_id');
          throw new Error('Configuração incompleta: Plant ID não encontrado');
        }
      }

      console.log('Using config for realtime:', {
        username: config.username ? `${config.username.substring(0, 3)}***` : 'missing',
        plantId: config.plantId || 'missing',
        deviceType: deviceType
      });

      const { data, error } = await supabase.functions.invoke('sungrow-connector', {
        body: {
          action: 'get_device_real_time_data',
          config: config,
          deviceType: deviceType
        }
      });

      if (error) {
        console.error('Supabase function error:', error);
        throw error;
      }

      console.log('Sungrow realtime response:', data);
      return data.success ? data.data : null;
    },
    enabled: plant.monitoring_system === 'sungrow' && !!plant.api_credentials,
    refetchInterval: 2 * 60 * 1000, // Atualizar a cada 2 minutos para dados em tempo real
    retry: 2
  });
};
