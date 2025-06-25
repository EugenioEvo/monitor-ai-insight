
import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, AlertTriangle, Zap, Wifi, Activity } from 'lucide-react';
import type { Plant } from '@/types';

interface SolarEdgeEquipmentStatusProps {
  plant: Plant;
}

export const SolarEdgeEquipmentStatus = ({ plant }: SolarEdgeEquipmentStatusProps) => {
  // Mock data for SolarEdge equipment - in real implementation, this would come from SolarEdge API
  const mockEquipment = [
    {
      id: 1,
      name: 'Inversor SolarEdge',
      type: 'Inversor',
      status: 'online',
      power: 5.2,
      temperature: 45,
      efficiency: 98.5,
      serialNumber: 'SE-INV-001',
      lastUpdate: new Date()
    },
    {
      id: 2,
      name: 'Otimizador String 1',
      type: 'Otimizador',
      status: 'online',
      voltage: 380,
      current: 8.5,
      serialNumber: 'SE-OPT-001',
      lastUpdate: new Date()
    },
    {
      id: 3,
      name: 'Gateway de Monitoramento',
      type: 'Gateway',
      status: 'online',
      connection: 'Ethernet',
      signal: 95,
      serialNumber: 'SE-GW-001',
      lastUpdate: new Date()
    }
  ];

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
          <CardTitle className="flex items-center gap-2">
            <Activity className="w-5 h-5" />
            Status dos Equipamentos SolarEdge
          </CardTitle>
          <CardDescription>
            Monitoramento dos dispositivos SolarEdge da planta
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
              <CardDescription>
                {equipment.type} | SN: {equipment.serialNumber}
              </CardDescription>
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

              {equipment.type === 'Otimizador' && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="text-sm text-muted-foreground">Tensão</div>
                    <div className="font-medium">{equipment.voltage} V</div>
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground">Corrente</div>
                    <div className="font-medium">{equipment.current} A</div>
                  </div>
                </div>
              )}

              {equipment.type === 'Gateway' && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="flex items-center text-sm text-muted-foreground mb-1">
                      <Wifi className="w-3 h-3 mr-1" />
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

      <Card className="border-blue-200 bg-blue-50">
        <CardHeader>
          <CardTitle className="text-blue-700">Sistema SolarEdge</CardTitle>
          <CardDescription className="text-blue-600">
            Monitoramento através da API SolarEdge com dados de inversores e otimizadores.
          </CardDescription>
        </CardHeader>
      </Card>
    </div>
  );
};
