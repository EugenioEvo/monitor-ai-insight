
import { supabase } from '@/integrations/supabase/client';
import type { Plant } from '@/types';

export const alertsService = {
  async checkAndCreateAlerts(plant: Plant): Promise<void> {
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

      await this.checkCommunicationAlerts(plant, latestReading);
      await this.checkPerformanceAlerts(plant, latestReading);
    } catch (error) {
      console.error(`Erro ao verificar alertas para planta ${plant.name}:`, error);
    }
  },

  async checkCommunicationAlerts(plant: Plant, latestReading: any): Promise<void> {
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
  },

  async checkPerformanceAlerts(plant: Plant, latestReading: any): Promise<void> {
    const now = new Date();
    const currentHour = now.getHours();

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
  }
};
