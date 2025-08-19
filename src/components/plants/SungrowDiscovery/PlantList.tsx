import React from 'react';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Wifi, WifiOff, Activity, AlertCircle, MapPin, Zap } from 'lucide-react';
import { SungrowDiscoveryService, type EnrichedPlant } from '@/services/sungrowDiscoveryService';

interface PlantListProps {
  plants: EnrichedPlant[];
  selectedPlants: string[];
  onPlantToggle: (plantId: string) => void;
}

export const PlantList: React.FC<PlantListProps> = ({
  plants,
  selectedPlants,
  onPlantToggle
}) => {
  const getConnectivityIcon = (connectivity?: string) => {
    const status = SungrowDiscoveryService.getConnectivityStatus(connectivity);
    const IconComponent = connectivity === 'online' ? Wifi : 
                         connectivity === 'offline' ? WifiOff :
                         connectivity === 'testing' ? Activity : AlertCircle;
    
    return <IconComponent className={`w-4 h-4 ${status.color}`} />;
  };

  const getConnectivityBadge = (connectivity?: string, validationStatus?: string) => {
    const status = SungrowDiscoveryService.getConnectivityStatus(connectivity);
    
    if (connectivity === 'online' && validationStatus === 'validated') {
      return <Badge variant="default" className="bg-green-500">Online</Badge>;
    } else if (connectivity === 'testing') {
      return <Badge variant="outline" className="border-yellow-500 text-yellow-600">Testando</Badge>;
    }
    
    return <Badge variant={status.variant}>{status.label}</Badge>;
  };

  return (
    <div className="grid gap-3 max-h-96 overflow-y-auto">
      {plants.map((plant) => (
        <div
          key={plant.id}
          className={`flex items-center space-x-3 p-3 border rounded-lg cursor-pointer transition-colors ${
            selectedPlants.includes(plant.id) ? 'bg-accent border-primary' : 'hover:bg-accent/50'
          } ${
            plant.connectivity === 'offline' ? 'opacity-75' : ''
          }`}
          onClick={() => onPlantToggle(plant.id)}
        >
          <Checkbox
            checked={selectedPlants.includes(plant.id)}
            onChange={() => onPlantToggle(plant.id)}
          />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              {getConnectivityIcon(plant.connectivity)}
              <h5 className="font-medium truncate">{plant.name}</h5>
              {getConnectivityBadge(plant.connectivity, plant.validationStatus)}
            </div>
            
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <span className="text-xs bg-muted px-2 py-1 rounded">
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
  );
};