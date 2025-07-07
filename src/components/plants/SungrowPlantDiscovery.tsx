
import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Progress } from '@/components/ui/progress';
import { AlertCircle, CheckCircle, Loader2, Search, MapPin, Zap, Wifi, WifiOff, Activity } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import type { SungrowConfig } from '@/types/sungrow';
import { useLogger } from '@/services/logger';
import { useErrorHandler } from '@/services/errorHandler';
import { useDebouncedCallback } from '@/hooks/useDebounce';
import { LoadingSpinner } from '@/components/ui/loading-states';

interface EnrichedPlant {
  id: string;
  name: string;
  capacity?: number;
  location?: string;
  status?: string;
  installationDate?: string;
  latitude?: number;
  longitude?: number;
  // Enhanced fields
  currentPower?: number;
  dailyEnergy?: number;
  connectivity?: 'online' | 'offline' | 'testing';
  lastUpdate?: string;
  validationStatus?: 'validated' | 'pending' | 'failed';
}

interface DiscoveryStatistics {
  total: number;
  online: number;
  offline: number;
  totalCapacity: number;
  averageCapacity: number;
}

interface SungrowPlantDiscoveryProps {
  config: SungrowConfig;
  onPlantsSelected?: (plants: EnrichedPlant[]) => void;
}

export const SungrowPlantDiscovery = ({ config, onPlantsSelected }: SungrowPlantDiscoveryProps) => {
  const { toast } = useToast();
  const logger = useLogger('SungrowPlantDiscovery');
  const errorHandler = useErrorHandler('SungrowPlantDiscovery');
  
  const [loading, setLoading] = useState(false);
  const [discovering, setDiscovering] = useState(false);
  const [discoveredPlants, setDiscoveredPlants] = useState<EnrichedPlant[]>([]);
  const [selectedPlants, setSelectedPlants] = useState<string[]>([]);
  const [statistics, setStatistics] = useState<DiscoveryStatistics | null>(null);
  const [discoveryProgress, setDiscoveryProgress] = useState(0);

  const debouncedOnPlantsSelected = useDebouncedCallback((plants: EnrichedPlant[]) => {
    onPlantsSelected?.(plants);
  }, 300);

  const discoverPlants = async () => {
    const context = logger.createContext({ action: 'discover_plants_enhanced' });
    
    await errorHandler.executeWithRetry(
      async () => {
        setDiscovering(true);
        setDiscoveryProgress(0);
        
        logger.info('Iniciando descoberta aprimorada de plantas Sungrow', {
          ...context,
          hasCredentials: !!(config.appkey && config.accessKey)
        });
        
        // Remover plantId da config para descoberta
        const discoveryConfig = { ...config };
        delete discoveryConfig.plantId;
        
        // Simulate progress updates
        const progressInterval = setInterval(() => {
          setDiscoveryProgress(prev => {
            if (prev < 80) return prev + 10;
            return prev;
          });
        }, 1000);
        
        const { data, error } = await supabase.functions.invoke('sungrow-connector', {
          body: {
            action: 'discover_plants',
            config: discoveryConfig
          }
        });

        clearInterval(progressInterval);
        setDiscoveryProgress(100);

        if (error) {
          logger.error('Erro na função Supabase', error, context);
          throw new Error(`Erro na descoberta: ${error.message}`);
        }

        logger.info('Resposta da descoberta recebida', {
          ...context,
          success: data?.success,
          plantsCount: data?.plants?.length || 0,
          statistics: data?.statistics
        });

        if (data.success && data.plants) {
          setDiscoveredPlants(data.plants);
          setStatistics(data.statistics || null);
          
          const onlinePlants = data.plants.filter((p: EnrichedPlant) => p.connectivity === 'online').length;
          const totalPlants = data.plants.length;
          
          toast({
            title: "Plantas descobertas!",
            description: `Encontradas ${totalPlants} plantas (${onlinePlants} online, ${totalPlants - onlinePlants} offline).`,
          });
          
          logger.info(`Descoberta concluída: ${totalPlants} plantas (${onlinePlants} online)`, context);
        } else {
          throw new Error(data.error || 'Nenhuma planta encontrada');
        }
      },
      'discover_plants_enhanced',
      {
        maxAttempts: 2,
        baseDelay: 2000
      }
    ).catch((error) => {
      errorHandler.handleError(error, 'discover_plants_enhanced');
    }).finally(() => {
      setDiscovering(false);
      setDiscoveryProgress(0);
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

  const selectOnlyOnlinePlants = () => {
    setSelectedPlants(discoveredPlants.filter(p => p.connectivity === 'online').map(p => p.id));
  };

  const clearSelection = () => {
    setSelectedPlants([]);
  };

  const handlePlantsSelected = () => {
    const selected = discoveredPlants.filter(plant => selectedPlants.includes(plant.id));
    logger.info('Plantas selecionadas para uso', { 
      action: 'plants_selected',
      count: selected.length,
      plantIds: selected.map(p => p.id),
      onlineCount: selected.filter(p => p.connectivity === 'online').length
    });
    debouncedOnPlantsSelected(selected);
  };

  const getConnectivityIcon = (connectivity?: string) => {
    switch (connectivity) {
      case 'online':
        return <Wifi className="w-4 h-4 text-green-500" />;
      case 'offline':
        return <WifiOff className="w-4 h-4 text-red-500" />;
      case 'testing':
        return <Activity className="w-4 h-4 text-yellow-500 animate-pulse" />;
      default:
        return <AlertCircle className="w-4 h-4 text-gray-400" />;
    }
  };

  const getConnectivityBadge = (connectivity?: string, validationStatus?: string) => {
    if (connectivity === 'online' && validationStatus === 'validated') {
      return <Badge variant="default" className="bg-green-500">Online</Badge>;
    } else if (connectivity === 'offline') {
      return <Badge variant="destructive">Offline</Badge>;
    } else if (connectivity === 'testing') {
      return <Badge variant="outline" className="border-yellow-500 text-yellow-600">Testando</Badge>;
    }
    return <Badge variant="secondary">Desconhecido</Badge>;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Search className="w-5 h-5" />
          Descoberta Avançada de Plantas
        </CardTitle>
        <CardDescription>
          Descubra automaticamente as plantas disponíveis com validação de conectividade e dados em tempo real
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Statistics Summary */}
        {statistics && (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 p-4 bg-gray-50 rounded-lg">
            <div className="text-center">
              <p className="text-2xl font-bold text-blue-600">{statistics.total}</p>
              <p className="text-xs text-muted-foreground">Total</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-green-600">{statistics.online}</p>
              <p className="text-xs text-muted-foreground">Online</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-red-600">{statistics.offline}</p>
              <p className="text-xs text-muted-foreground">Offline</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-purple-600">{statistics.totalCapacity}kW</p>
              <p className="text-xs text-muted-foreground">Capacidade</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-orange-600">{statistics.averageCapacity}kW</p>
              <p className="text-xs text-muted-foreground">Média</p>
            </div>
          </div>
        )}

        {discoveredPlants.length === 0 ? (
          <div className="text-center py-8">
            <Button onClick={discoverPlants} disabled={discovering} size="lg">
              {discovering ? (
                <div className="flex flex-col items-center gap-2">
                  <LoadingSpinner size="sm" message="Descobrindo plantas..." />
                  {discoveryProgress > 0 && (
                    <div className="w-32">
                      <Progress value={discoveryProgress} className="h-2" />
                      <p className="text-xs text-muted-foreground mt-1">{discoveryProgress}%</p>
                    </div>
                  )}
                </div>
              ) : (
                <>
                  <Search className="w-4 h-4 mr-2" />
                  Descobrir Plantas
                </>
              )}
            </Button>
            <p className="text-sm text-muted-foreground mt-2">
              Clique para buscar plantas com validação completa de conectividade
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
                  onClick={selectOnlyOnlinePlants}
                  disabled={!discoveredPlants.some(p => p.connectivity === 'online')}
                >
                  Apenas Online
                </Button>
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
                  } ${
                    plant.connectivity === 'offline' ? 'opacity-75' : ''
                  }`}
                  onClick={() => togglePlantSelection(plant.id)}
                >
                  <Checkbox
                    checked={selectedPlants.includes(plant.id)}
                    onChange={() => togglePlantSelection(plant.id)}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      {getConnectivityIcon(plant.connectivity)}
                      <h5 className="font-medium truncate">{plant.name}</h5>
                      {getConnectivityBadge(plant.connectivity, plant.validationStatus)}
                    </div>
                    
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <span className="text-xs bg-gray-100 px-2 py-1 rounded">
                        ID: {plant.id}
                      </span>
                      {plant.capacity && plant.capacity > 0 && (
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

                    {/* Real-time data for online plants */}
                    {plant.connectivity === 'online' && (plant.currentPower !== undefined || plant.dailyEnergy !== undefined) && (
                      <div className="flex items-center gap-4 text-xs text-green-600 mt-1">
                        {plant.currentPower !== undefined && (
                          <span>Potência: {plant.currentPower} kW</span>
                        )}
                        {plant.dailyEnergy !== undefined && (
                          <span>Energia hoje: {plant.dailyEnergy} kWh</span>
                        )}
                      </div>
                    )}

                    {plant.installationDate && (
                      <p className="text-xs text-muted-foreground mt-1">
                        Instalada em: {new Date(plant.installationDate).toLocaleDateString('pt-BR')}
                      </p>
                    )}

                    {plant.lastUpdate && (
                      <p className="text-xs text-muted-foreground">
                        Atualizado: {new Date(plant.lastUpdate).toLocaleString('pt-BR')}
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
