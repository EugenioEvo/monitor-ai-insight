
import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { MapPin, Zap, Calendar, Settings, Activity, AlertCircle, BarChart3, User, KeyRound } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { MonitoringSetup } from '@/components/plants/MonitoringSetup';
import { PlantDiscovery } from '@/components/plants/PlantDiscovery';
import { SungrowDebugPanel } from '@/components/plants/SungrowDebugPanel';
import { SungrowOAuthCallbackHandler } from '@/components/plants/SungrowOAuthCallbackHandler';
import { SungrowProfileManager } from '@/components/plants/SungrowProfileManager';
import type { Plant } from '@/types';

export default function Plants() {
  const [selectedPlant, setSelectedPlant] = useState<Plant | null>(null);
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  
  // Handle tab from URL params
  const currentTab = searchParams.get('tab') || 'plants';
  
  const handleTabChange = (value: string) => {
    const newParams = new URLSearchParams(searchParams);
    if (value === 'plants') {
      newParams.delete('tab');
    } else {
      newParams.set('tab', value);
    }
    setSearchParams(newParams);
  };

  const { data: plants, isLoading, refetch } = useQuery({
    queryKey: ['plants'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('plants')
        .select('*')
        .order('name');
      
      if (error) throw error;
      return data as Plant[];
    }
  });

  const { data: syncLogs } = useQuery({
    queryKey: ['sync_logs', selectedPlant?.id],
    queryFn: async () => {
      if (!selectedPlant) return [];
      
      const { data, error } = await supabase
        .from('sync_logs')
        .select('*')
        .eq('plant_id', selectedPlant.id)
        .order('created_at', { ascending: false })
        .limit(10);
      
      if (error) throw error;
      return data;
    },
    enabled: !!selectedPlant
  });

  const getStatusBadge = (plant: Plant) => {
    const status = plant.status;
    
    if (status === 'active') {
      return <Badge variant="default">Ativa</Badge>;
    } else if (status === 'maintenance') {
      return <Badge variant="outline">Manutenção</Badge>;
    } else {
      return <Badge variant="destructive">Pendente</Badge>;
    }
  };

  const getMonitoringBadge = (plant: Plant) => {
    const system = plant.monitoring_system || 'manual';
    const isConnected = system !== 'manual' && plant.api_credentials;
    
    if (system === 'manual') {
      return <Badge variant="secondary">Manual</Badge>;
    } else if (system === 'solaredge') {
      return <Badge variant={isConnected ? "default" : "outline"}>SolarEdge</Badge>;
    } else if (system === 'sungrow') {
      return <Badge variant={isConnected ? "default" : "outline"}>Sungrow</Badge>;
    }
    
    return <Badge variant="secondary">Manual</Badge>;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <SungrowOAuthCallbackHandler />
      
      {/* Main Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Gerenciamento Solar</h1>
          <p className="text-muted-foreground">
            Gerencie suas plantas, credenciais e configurações de monitoramento
          </p>
        </div>
        {currentTab === 'plants' && <PlantDiscovery onPlantImported={refetch} />}
      </div>

      {/* Main Tabs */}
      <Tabs value={currentTab} onValueChange={handleTabChange} className="space-y-6">
        <TabsList className="grid w-full grid-cols-2 lg:w-[400px]">
          <TabsTrigger value="plants" className="flex items-center gap-2">
            <Zap className="w-4 h-4" />
            Plantas Solares
          </TabsTrigger>
          <TabsTrigger value="profiles" className="flex items-center gap-2">
            <KeyRound className="w-4 h-4" />
            Perfis de Credenciais
          </TabsTrigger>
        </TabsList>

        <TabsContent value="plants" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Lista de plantas */}
            <div className="lg:col-span-1 space-y-4">
              <h2 className="text-xl font-semibold">Suas Plantas</h2>
              <div className="space-y-3">
                {plants?.map((plant) => (
                  <Card 
                    key={plant.id} 
                    className={`cursor-pointer transition-colors hover:bg-accent ${
                      selectedPlant?.id === plant.id ? 'ring-2 ring-primary' : ''
                    }`}
                    onClick={() => setSelectedPlant(plant)}
                  >
                    <CardHeader className="pb-3">
                      <div className="flex justify-between items-start">
                        <CardTitle className="text-lg">{plant.name}</CardTitle>
                        {getStatusBadge(plant)}
                      </div>
                      <div className="flex gap-2 flex-wrap">
                        {getMonitoringBadge(plant)}
                        <Badge variant="outline">
                          <Zap className="w-3 h-3 mr-1" />
                          {plant.capacity_kwp} kWp
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <div className="flex items-center text-sm text-muted-foreground">
                        <MapPin className="w-4 h-4 mr-1" />
                        {plant.concessionaria}
                      </div>
                      <div className="flex items-center text-sm text-muted-foreground mt-1">
                        <Calendar className="w-4 h-4 mr-1" />
                        Desde {new Date(plant.start_date).toLocaleDateString('pt-BR')}
                      </div>
                      <div className="mt-3 pt-3 border-t">
                        <Button 
                          size="sm" 
                          variant="outline" 
                          className="w-full"
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/plants/${plant.id}/dashboard`);
                          }}
                        >
                          <BarChart3 className="w-4 h-4 mr-2" />
                          Abrir Dashboard
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>

            {/* Detalhes da planta selecionada */}
            <div className="lg:col-span-2">
              {selectedPlant ? (
                <Tabs defaultValue="monitoring" className="space-y-6">
                  <TabsList>
                    <TabsTrigger value="monitoring">
                      <Settings className="w-4 h-4 mr-2" />
                      Monitoramento
                    </TabsTrigger>
                    <TabsTrigger value="logs">
                      <Activity className="w-4 h-4 mr-2" />
                      Logs de Sincronização
                    </TabsTrigger>
                    <TabsTrigger value="debug">
                      <AlertCircle className="w-4 h-4 mr-2" />
                      Debug Sungrow
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="monitoring">
                    <MonitoringSetup 
                      plant={selectedPlant} 
                      onUpdate={() => {
                        refetch();
                        // Atualizar a planta selecionada
                        if (plants) {
                          const updated = plants.find(p => p.id === selectedPlant.id);
                          if (updated) setSelectedPlant(updated);
                        }
                      }}
                    />
                  </TabsContent>

                  <TabsContent value="logs">
                    <Card>
                      <CardHeader>
                        <CardTitle>Logs de Sincronização</CardTitle>
                        <CardDescription>
                          Histórico das últimas sincronizações com o sistema de monitoramento
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-3">
                          {syncLogs?.map((log) => (
                            <div key={log.id} className="flex items-center justify-between p-3 border rounded-lg">
                              <div className="flex items-center gap-3">
                                {log.status === 'success' ? (
                                  <div className="w-2 h-2 bg-green-500 rounded-full" />
                                ) : (
                                  <AlertCircle className="w-4 h-4 text-red-500" />
                                )}
                                <div>
                                  <div className="font-medium capitalize">{log.system_type}</div>
                                  <div className="text-sm text-muted-foreground">{log.message}</div>
                                </div>
                              </div>
                              <div className="text-right">
                                <div className="text-sm font-medium">
                                  {log.data_points_synced} pontos
                                </div>
                                <div className="text-xs text-muted-foreground">
                                  {new Date(log.created_at).toLocaleString('pt-BR')}
                                </div>
                              </div>
                            </div>
                          ))}
                          {!syncLogs?.length && (
                            <div className="text-center py-8 text-muted-foreground">
                              Nenhum log de sincronização encontrado
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  </TabsContent>

                  <TabsContent value="debug">
                    <SungrowDebugPanel />
                  </TabsContent>
                </Tabs>
              ) : (
                <Card>
                  <CardContent className="flex items-center justify-center h-64">
                    <div className="text-center">
                      <Settings className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                      <h3 className="text-lg font-medium mb-2">Selecione uma planta</h3>
                      <p className="text-muted-foreground">
                        Escolha uma planta na lista ao lado para configurar o monitoramento ou abrir o dashboard completo
                      </p>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="profiles" className="space-y-6">
          <SungrowProfileManager 
            showSelector={false}
            className="max-w-none"
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
