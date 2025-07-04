
import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CheckCircle, AlertTriangle, Zap, Wifi, Activity, Monitor, Square, Loader2, RefreshCw } from 'lucide-react';
import { SolarEdgeDigitalTwin } from './SolarEdgeDigitalTwin';
import { SolarEdgeEquipmentList } from './SolarEdgeEquipmentList';
import { useSolarEdgeEquipment, useSolarEdgeAlerts } from '@/hooks/useSolarEdgeData';
import { useLogger } from '@/services/logger';
import type { Plant } from '@/types';

interface SolarEdgeEquipmentStatusProps {
  plant: Plant;
}

export const SolarEdgeEquipmentStatus = ({ plant }: SolarEdgeEquipmentStatusProps) => {
  const logger = useLogger('SolarEdgeEquipmentStatus');
  const { data: equipmentData, isLoading, error, refetch } = useSolarEdgeEquipment(plant);
  const { data: alertsData } = useSolarEdgeAlerts(plant);

  // Normalizar dados da API SolarEdge para o formato esperado
  const normalizeEquipment = (apiData: any) => {
    if (!apiData) {
      logger.warn('Dados de equipamentos não encontrados', { plantId: plant.id });
      return [];
    }

    const equipment = [];
    
    // Adicionar inversores - usar dados reais
    if (apiData.inverters && Array.isArray(apiData.inverters)) {
      apiData.inverters.forEach((inverter: any, index: number) => {
        // Verificar se há alertas para este inversor
        const inverterAlerts = alertsData?.filter((alert: any) => 
          alert.equipmentId === inverter.serialNumber
        ) || [];
        
        equipment.push({
          id: inverter.serialNumber || `inv-${index}`,
          name: inverter.name || `Inversor ${index + 1}`,
          type: 'Inversor',
          status: inverterAlerts.length > 0 ? 'warning' : 'online',
          serialNumber: inverter.serialNumber,
          manufacturer: inverter.manufacturer || 'SolarEdge',
          model: inverter.model,
          communicationMethod: inverter.communicationMethod,
          connectedOptimizers: inverter.connectedOptimizers || 0,
          alerts: inverterAlerts,
          lastUpdate: new Date()
        });
      });
    }

    // Adicionar otimizadores reais se disponíveis
    if (apiData.optimizers && Array.isArray(apiData.optimizers)) {
      apiData.optimizers.forEach((optimizer: any, index: number) => {
        const optimizerAlerts = alertsData?.filter((alert: any) => 
          alert.equipmentId === optimizer.serialNumber
        ) || [];
        
        equipment.push({
          id: optimizer.serialNumber || `opt-${index}`,
          name: optimizer.name || `Otimizador ${index + 1}`,
          type: 'Otimizador',
          status: optimizerAlerts.length > 0 ? 'warning' : 'online',
          serialNumber: optimizer.serialNumber,
          manufacturer: optimizer.manufacturer || 'SolarEdge',
          model: optimizer.model,
          alerts: optimizerAlerts,
          lastUpdate: new Date()
        });
      });
    }

    // Adicionar gateway de monitoramento
    if (apiData.gateways && Array.isArray(apiData.gateways)) {
      apiData.gateways.forEach((gateway: any, index: number) => {
        const gatewayAlerts = alertsData?.filter((alert: any) => 
          alert.equipmentId === gateway.serialNumber
        ) || [];
        
        equipment.push({
          id: gateway.serialNumber || `gw-${index}`,
          name: gateway.name || 'Gateway SolarEdge',
          type: 'Gateway',
          status: gatewayAlerts.length > 0 ? 'warning' : 'online',
          connection: gateway.connectionType || 'Ethernet',
          serialNumber: gateway.serialNumber,
          alerts: gatewayAlerts,
          lastUpdate: new Date()
        });
      });
    } else {
      // Fallback para gateway padrão se não existir na API
      equipment.push({
        id: 'gw-default',
        name: 'Gateway SolarEdge',
        type: 'Gateway',
        status: 'online',
        connection: 'Ethernet',
        serialNumber: 'SE-GW-001',
        alerts: [],
        lastUpdate: new Date()
      });
    }

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
            <SolarEdgeEquipmentList equipmentList={equipmentList} />
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
