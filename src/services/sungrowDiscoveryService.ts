import { supabase } from '@/integrations/supabase/client';
import type { SungrowConfig } from '@/types/sungrow';

export interface EnrichedPlant {
  id: string;
  name: string;
  capacity?: number;
  location?: string;
  status?: string;
  installationDate?: string;
  latitude?: number;
  longitude?: number;
  currentPower?: number;
  dailyEnergy?: number;
  connectivity?: 'online' | 'offline' | 'testing';
  lastUpdate?: string;
  validationStatus?: 'validated' | 'pending' | 'failed';
}

export interface DiscoveryStatistics {
  total: number;
  online: number;
  offline: number;
  totalCapacity: number;
  averageCapacity: number;
}

export interface DiscoveryResult {
  success: boolean;
  plants: EnrichedPlant[];
  statistics: DiscoveryStatistics | null;
  error?: string;
  message?: string;
}

export class SungrowDiscoveryService {
  static async discoverPlants(config: SungrowConfig, useSaved: boolean = true): Promise<DiscoveryResult> {
    try {
      // Remove plantId from config for discovery
      const discoveryConfig = { ...config };
      delete discoveryConfig.plantId;
      
      const { data, error } = await supabase.functions.invoke('sungrow-connector', {
        body: {
          action: 'discover_plants',
          config: discoveryConfig,
          use_saved: useSaved
        }
      });

      if (error) {
        throw new Error(`Erro na descoberta: ${error.message}`);
      }

      if (data.success && data.plants) {
        return {
          success: true,
          plants: data.plants,
          statistics: data.statistics || null
        };
      } else {
        return {
          success: false,
          plants: [],
          statistics: null,
          error: data.error || data.message || 'Nenhuma planta encontrada'
        };
      }
    } catch (error: any) {
      return {
        success: false,
        plants: [],
        statistics: null,
        error: error.message || 'Erro desconhecido na descoberta'
      };
    }
  }

  static async testConnection(config: SungrowConfig): Promise<{ success: boolean; message: string }> {
    try {
      const { data, error } = await supabase.functions.invoke('sungrow-connector', {
        body: {
          action: 'test_connection',
          config
        }
      });

      if (error) {
        throw new Error(error.message);
      }

      return {
        success: data.success,
        message: data.message || (data.success ? 'Conexão bem-sucedida' : 'Falha na conexão')
      };
    } catch (error: any) {
      return {
        success: false,
        message: error.message || 'Erro ao testar conexão'
      };
    }
  }

  static getConnectivityStatus(connectivity?: string) {
    switch (connectivity) {
      case 'online':
        return { color: 'text-green-500', label: 'Online', variant: 'default' as const };
      case 'offline':
        return { color: 'text-red-500', label: 'Offline', variant: 'destructive' as const };
      case 'testing':
        return { color: 'text-yellow-500', label: 'Testando', variant: 'outline' as const };
      default:
        return { color: 'text-muted-foreground', label: 'Desconhecido', variant: 'secondary' as const };
    }
  }

  static validatePlantSelection(plants: EnrichedPlant[], selectedIds: string[]): boolean {
    return selectedIds.length > 0 && selectedIds.every(id => plants.some(p => p.id === id));
  }
}