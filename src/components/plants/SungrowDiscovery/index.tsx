import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Search, RefreshCw } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { LoadingSpinner } from '@/components/ui/loading-states';
import { useDebouncedCallback } from '@/hooks/useDebounce';
import { useSungrowProfiles } from '@/hooks/useSungrowProfiles';
import { 
  SungrowDiscoveryService, 
  type EnrichedPlant, 
  type DiscoveryStatistics 
} from '@/services/sungrowDiscoveryService';
import { ProfileSelector } from './ProfileSelector';
import { ErrorDisplay } from './ErrorDisplay';
import { StatisticsCard } from './StatisticsCard';
import { PlantList } from './PlantList';

interface SungrowPlantDiscoveryProps {
  onPlantsSelected?: (plants: EnrichedPlant[]) => void;
}

export const SungrowPlantDiscovery: React.FC<SungrowPlantDiscoveryProps> = ({
  onPlantsSelected
}) => {
  const { toast } = useToast();
  
  // Profile management
  const {
    profiles,
    selectedProfile,
    loading: loadingProfiles,
    selectProfile,
    getEffectiveConfig,
    hasProfiles
  } = useSungrowProfiles();
  
  // Discovery state
  const [discovering, setDiscovering] = useState(false);
  const [discoveredPlants, setDiscoveredPlants] = useState<EnrichedPlant[]>([]);
  const [selectedPlants, setSelectedPlants] = useState<string[]>([]);
  const [statistics, setStatistics] = useState<DiscoveryStatistics | null>(null);
  const [discoveryProgress, setDiscoveryProgress] = useState(0);
  
  // Error handling
  const [lastError, setLastError] = useState<string | null>(null);
  const [errorCount, setErrorCount] = useState(0);
  const [errorCooldown, setErrorCooldown] = useState(false);
  const [hasAttemptedDiscovery, setHasAttemptedDiscovery] = useState(false);

  const debouncedOnPlantsSelected = useDebouncedCallback((plants: EnrichedPlant[]) => {
    onPlantsSelected?.(plants);
  }, 300);

  // Reset error state after cooldown
  useEffect(() => {
    if (errorCooldown) {
      const timer = setTimeout(() => {
        setErrorCooldown(false);
        setErrorCount(0);
      }, 30000); // 30 second cooldown
      return () => clearTimeout(timer);
    }
  }, [errorCooldown]);

  const resetErrorState = () => {
    setLastError(null);
    setErrorCount(0);
    setErrorCooldown(false);
    setHasAttemptedDiscovery(false);
  };

  const discoverPlants = async () => {
    if (errorCooldown) {
      toast({
        title: 'Aguarde antes de tentar novamente',
        description: 'Muitas tentativas falharam. Tente novamente em alguns instantes.',
        variant: 'destructive',
      });
      return;
    }

    try {
      setDiscovering(true);
      setDiscoveryProgress(0);
      setLastError(null);
      setHasAttemptedDiscovery(true);
      
      const effectiveConfig = getEffectiveConfig();
      
      // Progress simulation
      const progressInterval = setInterval(() => {
        setDiscoveryProgress(prev => {
          if (prev < 80) return prev + 10;
          return prev;
        });
      }, 1000);
      
      const result = await SungrowDiscoveryService.discoverPlants(effectiveConfig, true);

      clearInterval(progressInterval);
      setDiscoveryProgress(100);

      if (result.success && result.plants) {
        setDiscoveredPlants(result.plants);
        setStatistics(result.statistics);
        setErrorCount(0); // Reset error count on success
        
        const onlinePlants = result.plants.filter(p => p.connectivity === 'online').length;
        const totalPlants = result.plants.length;
        
        toast({
          title: "Plantas descobertas!",
          description: `Encontradas ${totalPlants} plantas (${onlinePlants} online, ${totalPlants - onlinePlants} offline).`,
        });
      } else {
        throw new Error(result.error || 'Nenhuma planta encontrada');
      }
    } catch (error: any) {
      const errorMessage = error.message || 'Erro desconhecido na descoberta';
      setLastError(errorMessage);
      setErrorCount(prev => prev + 1);
      
      // Trigger cooldown after 3 failed attempts
      if (errorCount >= 2) {
        setErrorCooldown(true);
      }
      
      toast({
        title: "Erro na descoberta",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setDiscovering(false);
      setDiscoveryProgress(0);
    }
  };

  const handlePlantToggle = (plantId: string) => {
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
    debouncedOnPlantsSelected(selected);
  };

  const canDiscover = !loadingProfiles && hasProfiles && selectedProfile && !discovering && !errorCooldown;

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
        {/* Profile Selection */}
        <ProfileSelector
          profiles={profiles}
          selectedProfile={selectedProfile}
          loading={loadingProfiles}
          onProfileSelect={selectProfile}
          onResetError={resetErrorState}
        />

        {/* Error Display */}
        <ErrorDisplay
          error={lastError}
          errorCooldown={errorCooldown}
          onReset={resetErrorState}
        />

        {/* Statistics Summary */}
        {statistics && <StatisticsCard statistics={statistics} />}

        {discoveredPlants.length === 0 ? (
          <div className="text-center py-8">
            {!hasAttemptedDiscovery && (
              <p className="text-sm text-muted-foreground mb-4">
                {selectedProfile ? 
                  `Pronto para descobrir plantas usando o perfil "${selectedProfile.name}"` :
                  'Selecione um perfil para descobrir plantas'
                }
              </p>
            )}
            <Button 
              onClick={discoverPlants} 
              disabled={!canDiscover} 
              size="lg"
            >
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
                  {hasAttemptedDiscovery ? 'Tentar Novamente' : 'Descobrir Plantas'}
                </>
              )}
            </Button>
            <p className="text-sm text-muted-foreground mt-2">
              {errorCooldown ? 
                'Aguarde antes de tentar novamente' : 
                'Clique para buscar plantas com validação completa de conectividade'
              }
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

            <PlantList
              plants={discoveredPlants}
              selectedPlants={selectedPlants}
              onPlantToggle={handlePlantToggle}
            />

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
                disabled={!canDiscover}
              >
                {discovering ? (
                  <LoadingSpinner size="sm" />
                ) : (
                  <RefreshCw className="w-4 h-4 mr-2" />
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