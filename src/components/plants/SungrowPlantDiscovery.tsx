
import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { AlertCircle, CheckCircle, Loader2, Search, MapPin, Zap } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import type { SungrowConfig } from '@/types/sungrow';
import { useLogger } from '@/services/logger';
import { useErrorHandler } from '@/services/errorHandler';
import { useDebouncedCallback } from '@/hooks/useDebounce';
import { LoadingSpinner } from '@/components/ui/loading-states';

interface DiscoveredPlant {
  id: string;
  name: string;
  capacity?: number;
  location?: string;
  status?: string;
  installationDate?: string;
  latitude?: number;
  longitude?: number;
}

interface SungrowPlantDiscoveryProps {
  config: SungrowConfig;
  onPlantsSelected?: (plants: DiscoveredPlant[]) => void;
}

export const SungrowPlantDiscovery = ({ config, onPlantsSelected }: SungrowPlantDiscoveryProps) => {
  const { toast } = useToast();
  const logger = useLogger('SungrowPlantDiscovery');
  const errorHandler = useErrorHandler('SungrowPlantDiscovery');
  
  const [loading, setLoading] = useState(false);
  const [discovering, setDiscovering] = useState(false);
  const [discoveredPlants, setDiscoveredPlants] = useState<DiscoveredPlant[]>([]);
  const [selectedPlants, setSelectedPlants] = useState<string[]>([]);

  // Debounce da seleção de plantas para otimizar performance
  const debouncedOnPlantsSelected = useDebouncedCallback((plants: DiscoveredPlant[]) => {
    onPlantsSelected?.(plants);
  }, 300);

  const discoverPlants = async () => {
    const context = logger.createContext({ action: 'discover_plants' });
    
    await errorHandler.executeWithRetry(
      async () => {
        setDiscovering(true);
        
        logger.info('Iniciando descoberta de plantas Sungrow', {
          ...context,
          hasCredentials: !!(config.appkey && config.accessKey)
        });
        
        // Remover plantId da config para descoberta
        const discoveryConfig = { ...config };
        delete discoveryConfig.plantId;
        
        const { data, error } = await supabase.functions.invoke('sungrow-connector', {
          body: {
            action: 'discover_plants',
            config: discoveryConfig
          }
        });

        if (error) {
          logger.error('Erro na função Supabase', error, context);
          throw new Error(`Erro na descoberta: ${error.message}`);
        }

        logger.info('Resposta da descoberta recebida', {
          ...context,
          success: data?.success,
          plantsCount: data?.plants?.length || 0
        });

        if (data.success && data.plants) {
          setDiscoveredPlants(data.plants);
          toast({
            title: "Plantas descobertas!",
            description: `Encontradas ${data.plants.length} plantas disponíveis.`,
          });
          logger.info(`Descoberta concluída: ${data.plants.length} plantas`, context);
        } else {
          throw new Error(data.error || 'Nenhuma planta encontrada');
        }
      },
      'discover_plants',
      {
        maxAttempts: 2,
        baseDelay: 2000
      }
    ).catch((error) => {
      errorHandler.handleError(error, 'discover_plants');
    }).finally(() => {
      setDiscovering(false);
    });
  };

  const togglePlantSelection = (plantId: string) => {
    setSelectedPlants(prev => 
      prev.includes(plantId) 
        ? prev.filter(id => id !== plantId)
        : [...prev, plantId]
    );
  };

  const selectAllPlants = () => {
    setSelectedPlants(discoveredPlants.map(p => p.id));
  };

  const clearSelection = () => {
    setSelectedPlants([]);
  };

  const handlePlantsSelected = () => {
    const selected = discoveredPlants.filter(plant => selectedPlants.includes(plant.id));
    logger.info('Plantas selecionadas para uso', { 
      action: 'plants_selected',
      count: selected.length,
      plantIds: selected.map(p => p.id)
    });
    debouncedOnPlantsSelected(selected);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Search className="w-5 h-5" />
          Descoberta de Plantas
        </CardTitle>
        <CardDescription>
          Descubra automaticamente as plantas disponíveis em sua conta Sungrow
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {discoveredPlants.length === 0 ? (
          <div className="text-center py-8">
            <Button onClick={discoverPlants} disabled={discovering} size="lg">
              {discovering ? (
                <LoadingSpinner size="sm" message="Descobrindo..." />
              ) : (
                <>
                  <Search className="w-4 h-4 mr-2" />
                  Descobrir Plantas
                </>
              )}
            </Button>
            <p className="text-sm text-muted-foreground mt-2">
              Clique para buscar plantas disponíveis em sua conta
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h4 className="font-medium">
                {discoveredPlants.length} plantas encontradas
                {selectedPlants.length > 0 && (
                  <span className="text-sm text-muted-foreground ml-2">
                    ({selectedPlants.length} selecionadas)
                  </span>
                )}
              </h4>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={selectAllPlants}
                  disabled={selectedPlants.length === discoveredPlants.length}
                >
                  Todas
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={clearSelection}
                  disabled={selectedPlants.length === 0}
                >
                  Limpar
                </Button>
              </div>
            </div>

            <div className="grid gap-3 max-h-96 overflow-y-auto">
              {discoveredPlants.map((plant) => (
                <div
                  key={plant.id}
                  className={`flex items-center space-x-3 p-3 border rounded-lg cursor-pointer transition-colors ${
                    selectedPlants.includes(plant.id) ? 'bg-accent border-primary' : 'hover:bg-accent/50'
                  }`}
                  onClick={() => togglePlantSelection(plant.id)}
                >
                  <Checkbox
                    checked={selectedPlants.includes(plant.id)}
                    onChange={() => togglePlantSelection(plant.id)}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h5 className="font-medium truncate">{plant.name}</h5>
                      {plant.status && (
                        <Badge variant={plant.status === 'Active' ? 'default' : 'secondary'}>
                          {plant.status}
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
                      <span className="text-xs bg-gray-100 px-2 py-1 rounded">
                        ID: {plant.id}
                      </span>
                      {plant.capacity && (
                        <span className="flex items-center gap-1">
                          <Zap className="w-3 h-3" />
                          {plant.capacity} kW
                        </span>
                      )}
                      {plant.location && (
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3 h-3" />
                          {plant.location}
                        </span>
                      )}
                    </div>
                    {plant.installationDate && (
                      <p className="text-xs text-muted-foreground mt-1">
                        Instalada em: {new Date(plant.installationDate).toLocaleDateString('pt-BR')}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <div className="flex gap-2 pt-4">
              <Button 
                onClick={handlePlantsSelected} 
                disabled={selectedPlants.length === 0}
                className="flex-1"
              >
                Usar {selectedPlants.length} Plantas Selecionadas
              </Button>
              <Button 
                variant="outline" 
                onClick={discoverPlants}
                disabled={discovering}
              >
                {discovering ? (
                  <LoadingSpinner size="sm" />
                ) : (
                  <Search className="w-4 h-4 mr-2" />
                )}
                Atualizar
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
