
import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, CheckCircle, Wifi, WifiOff } from 'lucide-react';
import { SungrowEquipmentStatus } from './SungrowEquipmentStatus';
import { SolarEdgeEquipmentStatus } from './SolarEdgeEquipmentStatus';
import { ContextualErrorBoundary } from '@/components/ui/contextual-error-boundary';
import { useLogger } from '@/services/logger';
import type { Plant } from '@/types';

interface EquipmentStatusProps {
  plant: Plant;
}

export const EquipmentStatus = ({ plant }: EquipmentStatusProps) => {
  const logger = useLogger('EquipmentStatus');

  // Log da renderização
  React.useEffect(() => {
    logger.info('EquipmentStatus renderizado', {
      plantId: plant.id,
      plantName: plant.name,
      monitoringSystem: plant.monitoring_system
    });
  }, [plant.id, plant.monitoring_system, logger]);

  // Se for planta Sungrow, usar componente específico
  if (plant.monitoring_system === 'sungrow') {
    return <SungrowEquipmentStatus plant={plant} />;
  }

  // Se for planta SolarEdge, usar componente específico
  if (plant.monitoring_system === 'solaredge') {
    return <SolarEdgeEquipmentStatus plant={plant} />;
  }

  // Fallback para plantas manuais ou outros sistemas
  const mockEquipment = React.useMemo(() => {
    logger.debug('Gerando mock data para equipamentos', {
      plantId: plant.id,
      monitoringSystem: plant.monitoring_system
    });

    return [
      {
        id: 1,
        name: 'Inversor Principal',
        type: 'Inversor',
        status: 'online',
        power: 5.2,
        temperature: 45,
        efficiency: 98.5,
        lastUpdate: new Date()
      },
      {
        id: 2,
        name: 'String Box 1',
        type: 'String Box',
        status: 'online',
        current: 8.5,
        voltage: 380,
        lastUpdate: new Date()
      },
      {
        id: 3,
        name: 'Monitoramento',
        type: 'Monitor',
        status: 'online',
        connection: 'WiFi',
        signal: 85,
        lastUpdate: new Date()
      }
    ];
  }, [plant.id, plant.monitoring_system, logger]);

  const getStatusIcon = (status: string) => {
    return status === 'online' ? 
      <CheckCircle className="w-4 h-4 text-green-500" /> : 
      <AlertTriangle className="w-4 h-4 text-red-500" />;
  };

  const getStatusBadge = (status: string) => {
    return status === 'online' ? 
      <Badge variant="default">Online</Badge> : 
      <Badge variant="destructive">Offline</Badge>;
  };

  return (
    <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Status dos Equipamentos</CardTitle>
            <CardDescription>
              Monitoramento dos dispositivos da planta solar
            </CardDescription>
          </CardHeader>
        </Card>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {mockEquipment.map((equipment) => (
            <Card key={equipment.id}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg flex items-center gap-2">
                    {getStatusIcon(equipment.status)}
                    {equipment.name}
                  </CardTitle>
                  {getStatusBadge(equipment.status)}
                </div>
                <CardDescription>{equipment.type}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {equipment.type === 'Inversor' && (
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <div className="text-sm text-muted-foreground">Potência</div>
                      <div className="font-medium">{equipment.power} kW</div>
                    </div>
                    <div>
                      <div className="text-sm text-muted-foreground">Temperatura</div>
                      <div className="font-medium">{equipment.temperature}°C</div>
                    </div>
                    <div className="col-span-2">
                      <div className="text-sm text-muted-foreground">Eficiência</div>
                      <div className="font-medium">{equipment.efficiency}%</div>
                    </div>
                  </div>
                )}

                {equipment.type === 'String Box' && (
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <div className="text-sm text-muted-foreground">Corrente</div>
                      <div className="font-medium">{equipment.current} A</div>
                    </div>
                    <div>
                      <div className="text-sm text-muted-foreground">Tensão</div>
                      <div className="font-medium">{equipment.voltage} V</div>
                    </div>
                  </div>
                )}

                {equipment.type === 'Monitor' && (
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <div className="text-sm text-muted-foreground flex items-center gap-1">
                        <Wifi className="w-3 h-3" />
                        Conexão
                      </div>
                      <div className="font-medium">{equipment.connection}</div>
                    </div>
                    <div>
                      <div className="text-sm text-muted-foreground">Sinal</div>
                      <div className="font-medium">{equipment.signal}%</div>
                    </div>
                  </div>
                )}

                <div className="text-xs text-muted-foreground">
                  Última atualização: {equipment.lastUpdate.toLocaleString('pt-BR')}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {plant.monitoring_system === 'manual' && (
          <Card className="border-yellow-200 bg-yellow-50">
            <CardHeader>
              <CardTitle className="text-yellow-700">Sistema Manual</CardTitle>
              <CardDescription className="text-yellow-600">
                Configure um sistema de monitoramento automático para obter dados reais dos equipamentos.
              </CardDescription>
            </CardHeader>
          </Card>
        )}
    </div>
  );
};
