
import { useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import type { Plant } from '@/types';

export const useAutoSync = (plant: Plant) => {
  const { toast } = useToast();
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // Query para verificar se a sincronização automática está habilitada
  const { data: syncEnabled } = useQuery({
    queryKey: ['auto-sync-enabled', plant.id],
    queryFn: () => plant.sync_enabled && plant.monitoring_system !== 'manual',
    refetchInterval: false,
  });

  const performAutoSync = async () => {
    if (!plant.sync_enabled || plant.monitoring_system === 'manual') {
      return;
    }

    try {
      console.log(`Executando sincronização automática para planta ${plant.name}`);
      
      let functionName = '';
      if (plant.monitoring_system === 'sungrow') {
        functionName = 'sungrow-connector';
      } else if (plant.monitoring_system === 'solaredge') {
        functionName = 'solaredge-connector';
      } else {
        return;
      }

      const { data, error } = await supabase.functions.invoke(functionName, {
        body: {
          action: 'sync_data',
          plantId: plant.id
        }
      });

      if (error) {
        console.error(`Erro na sincronização automática da planta ${plant.name}:`, error);
        
        // Log do erro no banco
        await supabase.from('sync_logs').insert({
          plant_id: plant.id,
          system_type: plant.monitoring_system,
          status: 'error',
          message: `Sincronização automática falhou: ${error.message}`,
          data_points_synced: 0
        });
      } else if (data?.success) {
        console.log(`Sincronização automática bem-sucedida para ${plant.name}: ${data.dataPointsSynced || 0} pontos`);
        
        // Verificar se existem alertas críticos que precisam ser criados
        await checkAndCreateAlerts(plant);
      }
    } catch (error: any) {
      console.error(`Falha na sincronização automática da planta ${plant.name}:`, error);
    }
  };

  const checkAndCreateAlerts = async (plant: Plant) => {
    try {
      // Buscar últimas leituras para verificar se há problemas
      const { data: latestReading } = await supabase
        .from('readings')
        .select('*')
        .eq('plant_id', plant.id)
        .order('timestamp', { ascending: false })
        .limit(1)
        .single();

      if (!latestReading) return;

      const now = new Date();
      const readingTime = new Date(latestReading.timestamp);
      const hoursSinceReading = (now.getTime() - readingTime.getTime()) / (1000 * 60 * 60);

      // Criar alerta se não há leituras há mais de 2 horas
      if (hoursSinceReading > 2) {
        const { data: existingAlert } = await supabase
          .from('alerts')
          .select('id')
          .eq('plant_id', plant.id)
          .eq('type', 'communication')
          .eq('severity', 'warning')
          .gte('created_at', new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString())
          .single();

        if (!existingAlert) {
          await supabase.from('alerts').insert({
            plant_id: plant.id,
            type: 'communication',
            severity: 'warning',
            message: `Planta ${plant.name} sem dados há ${Math.round(hoursSinceReading)} horas`,
            timestamp: now.toISOString()
          });
        }
      }

      // Verificar se a potência está muito baixa durante o dia (entre 8h e 17h)
      const currentHour = now.getHours();
      if (currentHour >= 8 && currentHour <= 17 && latestReading.power_w < (plant.capacity_kwp * 100)) {
        const expectedMinPower = plant.capacity_kwp * 100; // 10% da capacidade como mínimo esperado
        
        if (latestReading.power_w < expectedMinPower) {
          const { data: existingAlert } = await supabase
            .from('alerts')
            .select('id')
            .eq('plant_id', plant.id)
            .eq('type', 'performance')
            .eq('severity', 'warning')
            .gte('created_at', new Date(now.getTime() - 60 * 60 * 1000).toISOString())
            .single();

          if (!existingAlert) {
            await supabase.from('alerts').insert({
              plant_id: plant.id,
              type: 'performance',
              severity: 'warning',
              message: `Planta ${plant.name} com baixa geração: ${(latestReading.power_w / 1000).toFixed(2)} kW (esperado mínimo: ${(expectedMinPower / 1000).toFixed(2)} kW)`,
              timestamp: now.toISOString()
            });
          }
        }
      }
    } catch (error) {
      console.error(`Erro ao verificar alertas para planta ${plant.name}:`, error);
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
    
    // Executar sincronização inicial após 30 segundos
    const initialTimeout = setTimeout(performAutoSync, 30000);
    
    // Configurar sincronização periódica
    intervalRef.current = setInterval(performAutoSync, syncInterval);

    console.log(`Sincronização automática configurada para planta ${plant.name} a cada 15 minutos`);

    return () => {
      clearTimeout(initialTimeout);
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [syncEnabled, plant.id, plant.sync_enabled]);

  return {
    performAutoSync,
    syncEnabled
  };
};
