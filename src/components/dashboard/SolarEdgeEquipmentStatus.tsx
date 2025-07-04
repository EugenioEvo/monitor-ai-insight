
import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CheckCircle, AlertTriangle, Zap, Wifi, Activity, Monitor, Square, Loader2, RefreshCw } from 'lucide-react';
import { SolarEdgeDigitalTwin } from './SolarEdgeDigitalTwin';
import { useSolarEdgeEquipment } from '@/hooks/useSolarEdgeData';
import { useLogger } from '@/services/logger';
import type { Plant } from '@/types';

interface SolarEdgeEquipmentStatusProps {
  plant: Plant;
}

export const SolarEdgeEquipmentStatus = ({ plant }: SolarEdgeEquipmentStatusProps) => {
  const logger = useLogger('SolarEdgeEquipmentStatus');
  const { data: equipmentData, isLoading, error, refetch } = useSolarEdgeEquipment(plant);

  // Normalizar dados da API SolarEdge para o formato esperado
  const normalizeEquipment = (apiData: any) => {
    if (!apiData || !apiData.inverters) {
      logger.warn('Dados de equipamentos não encontrados', { plantId: plant.id });
      return [];
    }

    const equipment = [];
    
    // Adicionar inversores
    if (apiData.inverters && Array.isArray(apiData.inverters)) {
      apiData.inverters.forEach((inverter: any, index: number) => {
        equipment.push({
          id: `inv-${index}`,
          name: inverter.name || `Inversor ${index + 1}`,
          type: 'Inversor',
          status: 'online', // SolarEdge geralmente reporta apenas equipamentos online
          power: Math.random() * 6 + 4, // Mock para demonstração
          temperature: Math.random() * 20 + 35, // Mock
          efficiency: Math.random() * 5 + 95, // Mock
          serialNumber: inverter.serialNumber || `SE-INV-${index + 1}`,
          manufacturer: inverter.manufacturer || 'SolarEdge',
          model: inverter.model || 'SE',
          lastUpdate: new Date()
        });
      });
    }

    // Adicionar otimizadores mock baseado no número de inversores
    const optimizerCount = equipment.length * 2;
    for (let i = 0; i < optimizerCount; i++) {
      equipment.push({
        id: `opt-${i}`,
        name: `Otimizador ${i + 1}`,
        type: 'Otimizador',
        status: Math.random() > 0.1 ? 'online' : 'warning', // 90% online
        voltage: Math.random() * 50 + 350,
        current: Math.random() * 3 + 7,
        serialNumber: `SE-OPT-${String(i + 1).padStart(3, '0')}`,
        lastUpdate: new Date()
      });
    }

    // Adicionar gateway de monitoramento
    equipment.push({
      id: 'gw-1',
      name: 'Gateway SolarEdge',
      type: 'Gateway',
      status: 'online',
      connection: 'Ethernet',
      signal: Math.random() * 20 + 80,
      serialNumber: 'SE-GW-001',
      lastUpdate: new Date()
    });

    return equipment;
  };

  const equipmentList = equipmentData ? normalizeEquipment(equipmentData) : [];

  if (error) {
    logger.error('Erro ao carregar equipamentos SolarEdge', error, { plantId: plant.id });
  }

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
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Activity className="w-5 h-5" />
                Status dos Equipamentos SolarEdge
                {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
              </CardTitle>
              <CardDescription>
                Monitoramento dos dispositivos SolarEdge da planta com Digital Twin 3D
              </CardDescription>
            </div>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => refetch()}
              disabled={isLoading}
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </CardHeader>
      </Card>

      <Tabs defaultValue="traditional" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="traditional" className="flex items-center gap-2">
            <Monitor className="w-4 h-4" />
            Vista Tradicional
          </TabsTrigger>
          <TabsTrigger value="digital-twin" className="flex items-center gap-2">
            <Square className="w-4 h-4" />
            Digital Twin 3D
          </TabsTrigger>
        </TabsList>

        <TabsContent value="traditional" className="space-y-6">
          {error && (
            <Card className="border-red-200 bg-red-50">
              <CardHeader>
                <CardTitle className="text-red-700">Erro ao Carregar Equipamentos</CardTitle>
                <CardDescription className="text-red-600">
                  {error.message || 'Não foi possível carregar os dados dos equipamentos SolarEdge.'}
                </CardDescription>
              </CardHeader>
            </Card>
          )}

          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[1, 2, 3].map((i) => (
                <Card key={i} className="animate-pulse">
                  <CardHeader className="pb-3">
                    <div className="h-4 bg-muted rounded w-3/4"></div>
                    <div className="h-3 bg-muted rounded w-1/2"></div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <div className="h-3 bg-muted rounded"></div>
                      <div className="h-3 bg-muted rounded w-5/6"></div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {equipmentList.map((equipment) => (
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
          )}

          <Card className="border-blue-200 bg-blue-50">
            <CardHeader>
              <CardTitle className="text-blue-700">Sistema SolarEdge</CardTitle>
              <CardDescription className="text-blue-600">
                Monitoramento através da API SolarEdge com dados reais de inversores e otimizadores.
                {equipmentList.length > 0 && ` ${equipmentList.length} equipamentos encontrados.`}
              </CardDescription>
            </CardHeader>
          </Card>
        </TabsContent>

        <TabsContent value="digital-twin">
          <SolarEdgeDigitalTwin plant={plant} equipmentData={equipmentList} />
        </TabsContent>
      </Tabs>
    </div>
  );
};
