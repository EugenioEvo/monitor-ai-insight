
import { useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { syncService } from '@/services/syncService';
import { alertsService } from '@/services/alertsService';
import { RetryHandler } from '@/services/retryService';
import type { Plant } from '@/types';

export const useAutoSync = (plant: Plant) => {
  const { toast } = useToast();
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const retryHandlerRef = useRef<RetryHandler | null>(null);

  // Initialize retry handler
  if (!retryHandlerRef.current) {
    retryHandlerRef.current = new RetryHandler(toast);
  }

  // Query para verificar se a sincronização automática está habilitada
  const { data: syncEnabled } = useQuery({
    queryKey: ['auto-sync-enabled', plant.id],
    queryFn: () => plant.sync_enabled && plant.monitoring_system !== 'manual',
    refetchInterval: false,
  });

  const performAutoSync = async () => {
    if (!plant.sync_enabled || plant.monitoring_system === 'manual') {
      console.log(`Auto-sync skipped for ${plant.name}: ${!plant.sync_enabled ? 'disabled' : 'manual system'}`);
      return;
    }

    // Validar configurações mínimas antes de tentar sincronizar
    if (!plant.api_credentials) {
      console.error(`Auto-sync failed for ${plant.name}: no API credentials configured`);
      return;
    }

    console.log(`Starting auto-sync for plant ${plant.name} (${plant.monitoring_system})`);
    
    try {
      const result = await syncService.performSync(plant);
      
      // Log do resultado
      await syncService.logSyncResult(plant, result);

      if (result.success) {
        console.log(`Auto-sync successful for ${plant.name}: ${result.dataPointsSynced || 0} data points synced`);
        
        // Reset contador de retry em caso de sucesso
        retryHandlerRef.current?.handleSyncSuccess();
        
        // Atualizar timestamp da última sincronização
        await syncService.updateLastSyncTimestamp(plant);
        
        // Verificar se existem alertas críticos que precisam ser criados
        await alertsService.checkAndCreateAlerts(plant);
      } else {
        console.error(`Auto-sync failed for ${plant.name}:`, result.error);
        
        // Incrementar contador de retry e mostrar toast se necessário
        retryHandlerRef.current?.handleSyncError(plant, result.error || 'Unknown error during auto-sync');
      }
    } catch (error) {
      console.error(`Critical error during auto-sync for ${plant.name}:`, error);
      
      // Log erro crítico
      await syncService.logSyncResult(plant, {
        success: false,
        error: `Critical sync error: ${error instanceof Error ? error.message : String(error)}`
      });
    }
  };

  useEffect(() => {
    if (!syncEnabled) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }

    // Configurar intervalo de sincronização (15 minutos)
    const syncInterval = 15 * 60 * 1000; // 15 minutos em ms
    
    // Executar sincronização inicial após 30 segundos para dar tempo do componente carregar
    const initialTimeout = setTimeout(() => {
      console.log(`Iniciando primeira sincronização automática para planta ${plant.name}`);
      performAutoSync();
    }, 30000);
    
    // Configurar sincronização periódica
    intervalRef.current = setInterval(() => {
      console.log(`Executando sincronização periódica para planta ${plant.name}`);
      performAutoSync();
    }, syncInterval);

    console.log(`Sincronização automática configurada para planta ${plant.name} a cada 15 minutos`);

    return () => {
      clearTimeout(initialTimeout);
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [syncEnabled, plant.id, plant.sync_enabled, plant.name]);

  return {
    performAutoSync,
    syncEnabled
  };
};
