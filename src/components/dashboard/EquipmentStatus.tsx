
import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, CheckCircle, Settings, Cpu } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import type { Plant } from '@/types';
import type { SolarEdgeConfig } from '@/types/monitoring';

interface EquipmentStatusProps {
  plant: Plant;
}

export const EquipmentStatus = ({ plant }: EquipmentStatusProps) => {
  const { data: equipment, isLoading } = useQuery({
    queryKey: ['equipment', plant.id],
    queryFn: async () => {
      if (plant.monitoring_system !== 'solaredge' || !plant.api_credentials) {
        return null;
      }

      const { data, error } = await supabase.functions.invoke('solaredge-connector', {
        body: {
          action: 'get_equipment_list',
          config: plant.api_credentials as SolarEdgeConfig
        }
      });

      if (error) throw error;
      return data.success ? data.data : null;
    },
    enabled: plant.monitoring_system === 'solaredge' && !!plant.api_credentials
  });

  const getStatusIcon = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'active':
      case 'ok':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'alert':
      case 'warning':
        return <AlertTriangle className="w-4 h-4 text-yellow-500" />;
      case 'error':
      case 'fault':
        return <AlertTriangle className="w-4 h-4 text-red-500" />;
      default:
        return <Settings className="w-4 h-4 text-gray-500" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'active':
      case 'ok':
        return <Badge variant="default">Ativo</Badge>;
      case 'alert':
      case 'warning':
        return <Badge variant="outline">Alerta</Badge>;
      case 'error':
      case 'fault':
        return <Badge variant="destructive">Erro</Badge>;
      default:
        return <Badge variant="secondary">Desconhecido</Badge>;
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <Card key={i} className="animate-pulse">
            <CardHeader>
              <div className="h-6 bg-gray-200 rounded w-1/3"></div>
              <div className="h-4 bg-gray-200 rounded w-1/2"></div>
            </CardHeader>
            <CardContent>
              <div className="h-20 bg-gray-200 rounded"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (!equipment) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="w-5 h-5" />
            Status dos Equipamentos
          </CardTitle>
          <CardDescription>
            Monitoramento em tempo real dos equipamentos da planta
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-32 text-muted-foreground">
            <div className="text-center">
              <Cpu className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>Informações de equipamentos não disponíveis</p>
              {plant.monitoring_system === 'manual' && (
                <p className="text-sm mt-2">Configure um sistema de monitoramento para visualizar equipamentos</p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Inverters */}
      {equipment.inverters && equipment.inverters.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Cpu className="w-5 h-5" />
              Inversores ({equipment.inverters.length})
            </CardTitle>
            <CardDescription>
              Status e informações dos inversores instalados
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {equipment.inverters.map((inverter: any, index: number) => (
                <div key={inverter.serialNumber || index} className="border rounded-lg p-4">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <h4 className="font-medium flex items-center gap-2">
                        {getStatusIcon(inverter.status)}
                        {inverter.name || `Inversor ${index + 1}`}
                      </h4>
                      <p className="text-sm text-muted-foreground">
                        S/N: {inverter.serialNumber || 'N/A'}
                      </p>
                    </div>
                    {getStatusBadge(inverter.status)}
                  </div>
                  
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <div className="text-muted-foreground">Modelo</div>
                      <div className="font-medium">{inverter.model || 'N/A'}</div>
                    </div>
                    <div>
                      <div className="text-muted-foreground">Fabricante</div>
                      <div className="font-medium">{inverter.manufacturer || 'N/A'}</div>
                    </div>
                    <div>
                      <div className="text-muted-foreground">Potência Nominal</div>
                      <div className="font-medium">{inverter.ratedPower || 'N/A'} W</div>
                    </div>
                    <div>
                      <div className="text-muted-foreground">Comunicação</div>
                      <div className="font-medium">
                        {inverter.communicationMethod || 'N/A'}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Optimizers */}
      {equipment.optimizers && equipment.optimizers.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="w-5 h-5" />
              Otimizadores ({equipment.optimizers.length})
            </CardTitle>
            <CardDescription>
              Status dos otimizadores de potência por painel
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {equipment.optimizers.slice(0, 12).map((optimizer: any, index: number) => (
                <div key={optimizer.serialNumber || index} className="border rounded-lg p-3">
                  <div className="flex justify-between items-center mb-2">
                    <div className="font-medium flex items-center gap-2">
                      {getStatusIcon(optimizer.status)}
                      Opt. {index + 1}
                    </div>
                    {getStatusBadge(optimizer.status)}
                  </div>
                  <div className="text-sm space-y-1">
                    <div>S/N: {optimizer.serialNumber || 'N/A'}</div>
                    <div>Modelo: {optimizer.model || 'N/A'}</div>
                  </div>
                </div>
              ))}
            </div>
            {equipment.optimizers.length > 12 && (
              <div className="text-center mt-4 text-muted-foreground">
                E mais {equipment.optimizers.length - 12} otimizadores...
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Meters */}
      {equipment.meters && equipment.meters.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5" />
              Medidores ({equipment.meters.length})
            </CardTitle>
            <CardDescription>
              Medidores de energia e monitoramento
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {equipment.meters.map((meter: any, index: number) => (
                <div key={meter.serialNumber || index} className="border rounded-lg p-4">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <h4 className="font-medium flex items-center gap-2">
                        {getStatusIcon(meter.status)}
                        {meter.name || `Medidor ${index + 1}`}
                      </h4>
                      <p className="text-sm text-muted-foreground">
                        S/N: {meter.serialNumber || 'N/A'}
                      </p>
                    </div>
                    {getStatusBadge(meter.status)}
                  </div>
                  
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                    <div>
                      <div className="text-muted-foreground">Tipo</div>
                      <div className="font-medium">{meter.type || 'N/A'}</div>
                    </div>
                    <div>
                      <div className="text-muted-foreground">Modelo</div>
                      <div className="font-medium">{meter.model || 'N/A'}</div>
                    </div>
                    <div>
                      <div className="text-muted-foreground">Localização</div>
                      <div className="font-medium">{meter.location || 'N/A'}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
