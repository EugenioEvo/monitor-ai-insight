
import { useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import type { Plant } from '@/types';

export const useAutoSync = (plant: Plant) => {
  const { toast } = useToast();
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const retryCountRef = useRef<number>(0);
  const maxRetries = 3;

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
      console.log(`Executando sincronização automática para planta ${plant.name} (ID: ${plant.id})`);
      
      let functionName = '';
      if (plant.monitoring_system === 'sungrow') {
        functionName = 'sungrow-connector';
      } else if (plant.monitoring_system === 'solaredge') {
        functionName = 'solaredge-connector';
      } else {
        console.log(`Sistema de monitoramento não suportado: ${plant.monitoring_system}`);
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
        
        // Incrementar contador de retry
        retryCountRef.current += 1;
        
        // Log do erro no banco
        await supabase.from('sync_logs').insert({
          plant_id: plant.id,
          system_type: plant.monitoring_system,
          status: 'error',
          message: `Sincronização automática falhou (tentativa ${retryCountRef.current}/${maxRetries}): ${error.message}`,
          data_points_synced: 0
        });

        // Se excedeu o número máximo de tentativas, mostrar toast de erro
        if (retryCountRef.current >= maxRetries) {
          toast({
            title: "Erro na sincronização automática",
            description: `Planta ${plant.name}: ${error.message}`,
            variant: "destructive",
          });
          retryCountRef.current = 0; // Reset contador
        }
      } else if (data?.success) {
        console.log(`Sincronização automática bem-sucedida para ${plant.name}: ${data.dataPointsSynced || 0} pontos`);
        
        // Reset contador de retry em caso de sucesso
        retryCountRef.current = 0;
        
        // Log de sucesso no banco
        await supabase.from('sync_logs').insert({
          plant_id: plant.id,
          system_type: plant.monitoring_system,
          status: 'success',
          message: `Sincronização automática bem-sucedida: ${data.dataPointsSynced || 0} pontos de dados`,
          data_points_synced: data.dataPointsSynced || 0,
          sync_duration_ms: data.syncDuration || null
        });
        
        // Atualizar timestamp da última sincronização
        await supabase
          .from('plants')
          .update({ last_sync: new Date().toISOString() })
          .eq('id', plant.id);
        
        // Verificar se existem alertas críticos que precisam ser criados
        await checkAndCreateAlerts(plant);
      } else {
        console.error(`Resposta inválida da sincronização: ${data?.error || 'Erro desconhecido'}`);
        
        // Log de erro no banco
        await supabase.from('sync_logs').insert({
          plant_id: plant.id,
          system_type: plant.monitoring_system,
          status: 'error',
          message: `Sincronização automática falhou: ${data?.error || 'Erro desconhecido'}`,
          data_points_synced: 0
        });
      }
    } catch (error: any) {
      console.error(`Falha na sincronização automática da planta ${plant.name}:`, error);
      
      // Log de erro no banco
      await supabase.from('sync_logs').insert({
        plant_id: plant.id,
        system_type: plant.monitoring_system,
        status: 'error',
        message: `Falha na sincronização automática: ${error.message}`,
        data_points_synced: 0
      });
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

      if (!latestReading) {
        console.log(`Nenhuma leitura encontrada para planta ${plant.name}`);
        return;
      }

      const now = new Date();
      const readingTime = new Date(latestReading.timestamp);
      const hoursSinceReading = (now.getTime() - readingTime.getTime()) / (1000 * 60 * 60);

      // Criar alerta se não há leituras há mais de 2 horas durante o dia
      const currentHour = now.getHours();
      if (hoursSinceReading > 2 && currentHour >= 6 && currentHour <= 20) {
        const { data: existingAlert } = await supabase
          .from('alerts')
          .select('id')
          .eq('plant_id', plant.id)
          .eq('type', 'communication')
          .eq('severity', 'warning')
          .gte('created_at', new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString())
          .maybeSingle();

        if (!existingAlert) {
          await supabase.from('alerts').insert({
            plant_id: plant.id,
            type: 'communication',
            severity: 'warning',
            message: `Planta ${plant.name} sem dados há ${Math.round(hoursSinceReading)} horas`,
            timestamp: now.toISOString()
          });
          
          console.log(`Alerta de comunicação criado para planta ${plant.name}`);
        }
      }

      // Verificar se a potência está muito baixa durante o dia (entre 8h e 17h)
      if (currentHour >= 8 && currentHour <= 17) {
        const expectedMinPower = plant.capacity_kwp * 100; // 10% da capacidade como mínimo esperado
        
        if (latestReading.power_w < expectedMinPower) {
          const { data: existingAlert } = await supabase
            .from('alerts')
            .select('id')
            .eq('plant_id', plant.id)
            .eq('type', 'performance')
            .eq('severity', 'warning')
            .gte('created_at', new Date(now.getTime() - 60 * 60 * 1000).toISOString())
            .maybeSingle();

          if (!existingAlert) {
            await supabase.from('alerts').insert({
              plant_id: plant.id,
              type: 'performance',
              severity: 'warning',
              message: `Planta ${plant.name} com baixa geração: ${(latestReading.power_w / 1000).toFixed(2)} kW (esperado mínimo: ${(expectedMinPower / 1000).toFixed(2)} kW)`,
              timestamp: now.toISOString()
            });
            
            console.log(`Alerta de performance criado para planta ${plant.name}`);
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
