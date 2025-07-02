import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Zap, Sun, Home, Battery, ArrowRight } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/services/logger';
import type { Plant } from '@/types';
import type { SolarEdgeConfig } from '@/types/monitoring';

interface PowerFlowDiagramProps {
  plant: Plant;
}

export const PowerFlowDiagram = ({ plant }: PowerFlowDiagramProps) => {
  const { data: powerFlow, isLoading } = useQuery({
    queryKey: ['power-flow', plant.id],
    queryFn: async () => {
      if (plant.monitoring_system !== 'solaredge' || !plant.api_credentials) {
        return null;
      }

      logger.info('Fetching power flow data', {
        component: 'PowerFlowDiagram',
        plantId: plant.id,
        plantName: plant.name,
        monitoringSystem: plant.monitoring_system,
        apiSiteId: plant.api_site_id,
        hasCredentials: !!plant.api_credentials
      });

      // Use api_site_id from plant if siteId is empty in credentials
      const config = {
        ...plant.api_credentials as SolarEdgeConfig,
        siteId: plant.api_site_id || (plant.api_credentials as SolarEdgeConfig)?.siteId
      };

      logger.debug('Using config for power flow request', {
        component: 'PowerFlowDiagram',
        hasApiKey: !!config.apiKey,
        siteId: config.siteId,
        plantId: plant.id
      });

      const { data, error } = await supabase.functions.invoke('solaredge-connector', {
        body: {
          action: 'get_power_flow',
          config: config
        }
      });

      if (error) {
        logger.error('Supabase function error on power flow', error as Error, {
          component: 'PowerFlowDiagram',
          plantId: plant.id,
          action: 'get_power_flow'
        });
        throw error;
      }

      logger.info('Power flow response received', {
        component: 'PowerFlowDiagram',
        plantId: plant.id,
        success: data?.success,
        hasData: !!data?.data
      });
      return data.success ? data.data : null;
    },
    enabled: plant.monitoring_system === 'solaredge' && !!plant.api_credentials && (!!plant.api_site_id || !!(plant.api_credentials as SolarEdgeConfig)?.siteId),
    refetchInterval: 30 * 1000 // Atualizar a cada 30 segundos
  });

  if (isLoading) {
    return (
      <Card className="animate-pulse">
        <CardHeader>
          <div className="h-6 bg-gray-200 rounded w-1/3"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2"></div>
        </CardHeader>
        <CardContent>
          <div className="h-96 bg-gray-200 rounded"></div>
        </CardContent>
      </Card>
    );
  }

  if (!powerFlow) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="w-5 h-5" />
            Fluxo de Energia
          </CardTitle>
          <CardDescription>
            Visualização em tempo real do fluxo de energia da planta
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-64 text-muted-foreground">
            <div className="text-center">
              <Zap className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>Dados de fluxo de energia não disponíveis</p>
              {plant.monitoring_system === 'manual' && (
                <p className="text-sm mt-2">Configure um sistema de monitoramento SolarEdge para visualizar o fluxo</p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const formatPower = (power: number) => {
    if (power >= 1000) {
      return `${(power / 1000).toFixed(1)} kW`;
    }
    return `${power.toFixed(0)} W`;
  };

  const getPowerColor = (power: number) => {
    if (power > 0) return 'text-green-600';
    if (power < 0) return 'text-red-600';
    return 'text-gray-500';
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Zap className="w-5 h-5" />
          Fluxo de Energia em Tempo Real
        </CardTitle>
        <CardDescription>
          Atualizado em: {new Date(powerFlow.updateRefreshRate).toLocaleString('pt-BR')}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-center">
          {/* Solar Production */}
          <div className="text-center space-y-4">
            <div className="mx-auto w-20 h-20 bg-yellow-100 rounded-full flex items-center justify-center">
              <Sun className="w-10 h-10 text-yellow-600" />
            </div>
            <div>
              <h3 className="font-semibold text-lg">Produção Solar</h3>
              <div className={`text-2xl font-bold ${getPowerColor(powerFlow.PV?.currentPower || 0)}`}>
                {formatPower(powerFlow.PV?.currentPower || 0)}
              </div>
              <Badge variant="outline" className="mt-2">
                {powerFlow.PV?.status || 'N/A'}
              </Badge>
            </div>
          </div>

          {/* Flow Arrows */}
          <div className="flex flex-col items-center space-y-4">
            <ArrowRight className="w-8 h-8 text-muted-foreground" />
            <div className="text-center">
              <div className="text-sm text-muted-foreground">Fluxo de Energia</div>
              <div className="text-lg font-medium">
                {powerFlow.unit || 'W'}
              </div>
            </div>
            <ArrowRight className="w-8 h-8 text-muted-foreground" />
          </div>

          {/* Grid/Load */}
          <div className="space-y-6">
            {/* Grid Connection */}
            <div className="text-center space-y-2">
              <div className="mx-auto w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center">
                <Zap className="w-8 h-8 text-blue-600" />
              </div>
              <div>
                <h4 className="font-medium">Rede Elétrica</h4>
                <div className={`text-xl font-bold ${getPowerColor(powerFlow.GRID?.currentPower || 0)}`}>
                  {formatPower(Math.abs(powerFlow.GRID?.currentPower || 0))}
                </div>
                <Badge 
                  variant={(powerFlow.GRID?.currentPower || 0) > 0 ? "destructive" : "default"}
                  className="text-xs"
                >
                  {(powerFlow.GRID?.currentPower || 0) > 0 ? 'Comprando' : 'Injetando'}
                </Badge>
              </div>
            </div>

            {/* Load */}
            <div className="text-center space-y-2">
              <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
                <Home className="w-8 h-8 text-green-600" />
              </div>
              <div>
                <h4 className="font-medium">Consumo</h4>
                <div className={`text-xl font-bold ${getPowerColor(powerFlow.LOAD?.currentPower || 0)}`}>
                  {formatPower(powerFlow.LOAD?.currentPower || 0)}
                </div>
                <Badge variant="outline" className="text-xs">
                  {powerFlow.LOAD?.status || 'N/A'}
                </Badge>
              </div>
            </div>
          </div>
        </div>

        {/* Battery (se disponível) */}
        {powerFlow.STORAGE && (
          <div className="mt-8 pt-6 border-t">
            <div className="text-center space-y-4">
              <div className="mx-auto w-20 h-20 bg-purple-100 rounded-full flex items-center justify-center">
                <Battery className="w-10 h-10 text-purple-600" />
              </div>
              <div>
                <h3 className="font-semibold text-lg">Bateria</h3>
                <div className={`text-2xl font-bold ${getPowerColor(powerFlow.STORAGE.currentPower || 0)}`}>
                  {formatPower(Math.abs(powerFlow.STORAGE.currentPower || 0))}
                </div>
                <div className="flex gap-2 justify-center mt-2">
                  <Badge variant="outline">
                    {(powerFlow.STORAGE.currentPower || 0) > 0 ? 'Descarregando' : 'Carregando'}
                  </Badge>
                  <Badge variant="secondary">
                    {powerFlow.STORAGE.chargeLevel || 0}% SoC
                  </Badge>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Additional Info */}
        <div className="mt-6 grid grid-cols-2 gap-4 pt-4 border-t">
          <div className="text-center">
            <div className="text-sm text-muted-foreground">Última Atualização</div>
            <div className="font-medium">
              {new Date().toLocaleTimeString('pt-BR')}
            </div>
          </div>
          <div className="text-center">
            <div className="text-sm text-muted-foreground">Status do Sistema</div>
            <Badge variant="default">
              Online
            </Badge>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
