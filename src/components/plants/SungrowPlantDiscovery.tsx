
import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { AlertCircle, CheckCircle, Loader2, Search, MapPin, Zap } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import type { SungrowConfig } from '@/types/monitoring';

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
  const [loading, setLoading] = useState(false);
  const [discovering, setDiscovering] = useState(false);
  const [discoveredPlants, setDiscoveredPlants] = useState<DiscoveredPlant[]>([]);
  const [selectedPlants, setSelectedPlants] = useState<string[]>([]);

  const discoverPlants = async () => {
    setDiscovering(true);
    try {
      console.log('Discovering Sungrow plants...');
      
      const { data, error } = await supabase.functions.invoke('sungrow-connector', {
        body: {
          action: 'discover_plants',
          config: config
        }
      });

      if (error) {
        console.error('Plant discovery error:', error);
        throw new Error(`Erro na descoberta: ${error.message}`);
      }

      console.log('Plant discovery response:', data);

      if (data.success && data.plants) {
        setDiscoveredPlants(data.plants);
        toast({
          title: "Plantas descobertas!",
          description: `Encontradas ${data.plants.length} plantas disponíveis.`,
        });
      } else {
        throw new Error(data.error || 'Nenhuma planta encontrada');
      }
    } catch (error: any) {
      console.error('Plant discovery failed:', error);
      toast({
        title: "Erro na descoberta de plantas",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setDiscovering(false);
    }
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
    onPlantsSelected?.(selected);
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
              {discovering && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              <Search className="w-4 h-4 mr-2" />
              Descobrir Plantas
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
                {discovering && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Atualizar
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
