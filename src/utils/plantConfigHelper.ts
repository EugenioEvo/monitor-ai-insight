import type { Plant } from '@/types';
import type { SungrowConfig } from '@/types/monitoring';

/**
 * Utilitário para padronizar o uso de Plant IDs
 * Centraliza a lógica de onde buscar o ID da planta
 */
export const plantConfigHelper = {
  /**
   * Obtém o Plant ID usando api_site_id como source of truth
   * Fallback para config.plantId se api_site_id não existir
   */
  getPlantId(plant: Plant): string | null {
    // api_site_id é a fonte de verdade
    if (plant.api_site_id) {
      return plant.api_site_id;
    }
    
    // Fallback para plantId nas credenciais (para compatibilidade)
    if (plant.api_credentials && typeof plant.api_credentials === 'object') {
      const config = plant.api_credentials as SungrowConfig;
      return config.plantId || null;
    }
    
    return null;
  },

  /**
   * Valida se a planta tem configuração mínima para funcionar
   */
  validatePlantConfig(plant: Plant): { valid: boolean; error?: string } {
    if (!plant.api_credentials) {
      return { valid: false, error: 'Credenciais não configuradas' };
    }

    const plantId = this.getPlantId(plant);
    if (!plantId) {
      return { valid: false, error: 'Plant ID não encontrado (api_site_id ou config.plantId)' };
    }

    return { valid: true };
  },

  /**
   * Prepara a configuração Sungrow com Plant ID correto
   */
  prepareSungrowConfig(plant: Plant): SungrowConfig | null {
    if (!plant.api_credentials) return null;
    
    const baseConfig = plant.api_credentials as SungrowConfig;
    const plantId = this.getPlantId(plant);
    
    if (!plantId) return null;
    
    return {
      ...baseConfig,
      plantId
    };
  },

  /**
   * Atualiza o api_site_id da planta quando necessário
   * Usado após descoberta de plantas para salvar o ID correto
   */
  async updatePlantId(plantDatabaseId: string, newPlantId: string): Promise<void> {
    // Esta função seria implementada quando tivermos acesso ao supabase
    // Por enquanto é apenas uma interface
    console.log(`Atualizando Plant ID: ${plantDatabaseId} -> ${newPlantId}`);
  }
};