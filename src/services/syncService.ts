
import { supabase } from '@/integrations/supabase/client';
import type { Plant } from '@/types';

export interface SyncResult {
  success: boolean;
  message?: string;
  error?: string;
  dataPointsSynced?: number;
  syncDuration?: number;
}

export const syncService = {
  async performSync(plant: Plant): Promise<SyncResult> {
    try {
      console.log(`Executando sincronização para planta ${plant.name} (ID: ${plant.id})`);
      
      let functionName = '';
      if (plant.monitoring_system === 'sungrow') {
        functionName = 'sungrow-connector';
      } else if (plant.monitoring_system === 'solaredge') {
        functionName = 'solaredge-connector';
      } else {
        console.log(`Sistema de monitoramento não suportado: ${plant.monitoring_system}`);
        return { success: false, error: 'Sistema de monitoramento não suportado' };
      }

      const { data, error } = await supabase.functions.invoke(functionName, {
        body: {
          action: 'sync_data',
          plantId: plant.id
        }
      });

      if (error) {
        console.error(`Erro na sincronização da planta ${plant.name}:`, error);
        return { success: false, error: error.message };
      }

      if (data?.success) {
        console.log(`Sincronização bem-sucedida para ${plant.name}: ${data.dataPointsSynced || 0} pontos`);
        return {
          success: true,
          message: data.message,
          dataPointsSynced: data.dataPointsSynced || 0,
          syncDuration: data.syncDuration || null
        };
      } else {
        console.error(`Resposta inválida da sincronização: ${data?.error || 'Erro desconhecido'}`);
        return { success: false, error: data?.error || 'Erro desconhecido' };
      }
    } catch (error: any) {
      console.error(`Falha na sincronização da planta ${plant.name}:`, error);
      return { success: false, error: error.message };
    }
  },

  async logSyncResult(plant: Plant, result: SyncResult): Promise<void> {
    try {
      const status = result.success ? 'success' : 'error';
      const message = result.success 
        ? `Sincronização bem-sucedida: ${result.dataPointsSynced || 0} pontos de dados`
        : `Sincronização falhou: ${result.error}`;

      await supabase.from('sync_logs').insert({
        plant_id: plant.id,
        system_type: plant.monitoring_system,
        status,
        message,
        data_points_synced: result.dataPointsSynced || 0,
        sync_duration_ms: result.syncDuration || null
      });
    } catch (error) {
      console.error(`Erro ao registrar log de sincronização:`, error);
    }
  },

  async updateLastSyncTimestamp(plant: Plant): Promise<void> {
    try {
      await supabase
        .from('plants')
        .update({ last_sync: new Date().toISOString() })
        .eq('id', plant.id);
    } catch (error) {
      console.error(`Erro ao atualizar timestamp da última sincronização:`, error);
    }
  }
};
