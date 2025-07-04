
import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AlertCircle, CheckCircle, Loader2, Zap, Settings } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import type { Plant } from '@/types';
import type { SolarEdgeConfig } from '@/types/monitoring';
import type { SungrowConfig } from '@/types/sungrow';
import { SungrowConnectionTest } from './SungrowConnectionTest';
import { SungrowPlantDiscovery } from './SungrowPlantDiscovery';
import { PlantConfigurationValidator } from './PlantConfigurationValidator';
import { getDetailedErrorMessage } from '@/utils/errorHandling';

interface MonitoringSetupProps {
  plant: Plant;
  onUpdate: () => void;
}

export const MonitoringSetup = ({ plant, onUpdate }: MonitoringSetupProps) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [testing, setTesting] = useState(false);
  const [systemType, setSystemType] = useState<'manual' | 'solaredge' | 'sungrow'>(
    plant.monitoring_system || 'manual'
  );
  const [syncEnabled, setSyncEnabled] = useState(plant.sync_enabled || false);
  const [activeTab, setActiveTab] = useState('config');
  
  // SolarEdge config
  const [solarEdgeConfig, setSolarEdgeConfig] = useState<SolarEdgeConfig>({
    apiKey: '',
    siteId: '',
    ...(systemType === 'solaredge' && plant.api_credentials ? plant.api_credentials as SolarEdgeConfig : {})
  });

  // Sungrow config
  const [sungrowConfig, setSungrowConfig] = useState<SungrowConfig>({
    username: '',
    password: '',
    appkey: '',
    accessKey: '',
    plantId: '',
    baseUrl: 'https://gateway.isolarcloud.com.hk',
    ...(systemType === 'sungrow' && plant.api_credentials ? plant.api_credentials as SungrowConfig : {})
  });

  const testConnection = async () => {
    setTesting(true);
    try {
      const config = systemType === 'solaredge' ? solarEdgeConfig : sungrowConfig;
      const functionName = systemType === 'solaredge' ? 'solaredge-connector' : 'sungrow-connector';
      
      const { data, error } = await supabase.functions.invoke(functionName, {
        body: {
          action: 'test_connection',
          config
        }
      });

      if (error) throw error;

      if (data.success) {
        toast({
          title: "Conexão bem-sucedida!",
          description: data.message,
        });
      } else {
        throw new Error(data.message);
      }
    } catch (error: any) {
      toast({
        title: "Erro na conexão",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setTesting(false);
    }
  };

  const saveConfiguration = async () => {
    setLoading(true);
    try {
      const config = systemType === 'solaredge' ? solarEdgeConfig : sungrowConfig;
      
      const { error } = await supabase
        .from('plants')
        .update({
          monitoring_system: systemType,
          api_credentials: systemType === 'manual' ? null : config as any,
          sync_enabled: syncEnabled,
          api_site_id: systemType === 'solaredge' ? solarEdgeConfig.siteId : 
                      systemType === 'sungrow' ? sungrowConfig.plantId : null
        })
        .eq('id', plant.id);

      if (error) throw error;

      toast({
        title: "Configuração salva!",
        description: "Sistema de monitoramento configurado com sucesso.",
      });
      
      onUpdate();
      setActiveTab('config');
    } catch (error: any) {
      toast({
        title: "Erro ao salvar",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const syncNow = async () => {
    if (systemType === 'manual') return;
    
    setLoading(true);
    try {
      const functionName = systemType === 'solaredge' ? 'solaredge-connector' : 'sungrow-connector';
      
      const { data, error } = await supabase.functions.invoke(functionName, {
        body: {
          action: 'sync_data',
          plantId: plant.id
        }
      });

      if (error) throw error;

      if (data.success) {
        toast({
          title: "Sincronização concluída!",
          description: data.message,
        });
        onUpdate();
      } else {
        throw new Error(data.message);
      }
    } catch (error: any) {
      toast({
        title: "Erro na sincronização",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSungrowConnectionSuccess = (config: SungrowConfig) => {
    setSungrowConfig(config);
    setActiveTab('discovery');
  };

  const handleSungrowPlantsSelected = (plants: any[]) => {
    if (plants.length > 0) {
      const selectedPlant = plants[0]; // Use primeira planta selecionada
      setSungrowConfig(prev => ({
        ...prev,
        plantId: selectedPlant.id
      }));
      setActiveTab('config');
      toast({
        title: "Planta selecionada!",
        description: `Planta "${selectedPlant.name}" configurada para sincronização.`,
      });
    }
  };

  const getStatusBadge = () => {
    const lastSync = plant.last_sync;
    const isConnected = systemType !== 'manual' && plant.api_credentials;
    
    if (systemType === 'manual') {
      return <Badge variant="secondary">Manual</Badge>;
    }
    
    if (!isConnected) {
      return <Badge variant="destructive"><AlertCircle className="w-3 h-3 mr-1" />Não configurado</Badge>;
    }
    
    if (syncEnabled && lastSync) {
      const lastSyncDate = new Date(lastSync);
      const hoursSinceSync = (Date.now() - lastSyncDate.getTime()) / (1000 * 60 * 60);
      
      if (hoursSinceSync < 2) {
        return <Badge variant="default"><CheckCircle className="w-3 h-3 mr-1" />Sincronizado</Badge>;
      } else {
        return <Badge variant="outline"><AlertCircle className="w-3 h-3 mr-1" />Atrasado</Badge>;
      }
    }
    
    return <Badge variant="outline">Configurado</Badge>;
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Zap className="w-5 h-5" />
              Sistema de Monitoramento
            </CardTitle>
            <CardDescription>
              Configure a integração com portais de monitoramento
            </CardDescription>
          </div>
          {getStatusBadge()}
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Validador de configuração */}
        <PlantConfigurationValidator plant={plant} />
        
        {/* Sistema de monitoramento */}
        <div className="space-y-2">
          <Label htmlFor="monitoring-system">Sistema de Monitoramento</Label>
          <Select value={systemType} onValueChange={(value: any) => setSystemType(value)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="manual">Manual</SelectItem>
              <SelectItem value="solaredge">SolarEdge</SelectItem>
              <SelectItem value="sungrow">Sungrow</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Configuração SolarEdge */}
        {systemType === 'solaredge' && (
          <div className="space-y-4 p-4 border rounded-lg">
            <h4 className="font-medium">Configuração SolarEdge</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="se-api-key">API Key</Label>
                <Input
                  id="se-api-key"
                  type="password"
                  value={solarEdgeConfig.apiKey}
                  onChange={(e) => setSolarEdgeConfig(prev => ({ ...prev, apiKey: e.target.value }))}
                  placeholder="Sua chave de API SolarEdge"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="se-site-id">Site ID</Label>
                <Input
                  id="se-site-id"
                  value={solarEdgeConfig.siteId}
                  onChange={(e) => setSolarEdgeConfig(prev => ({ ...prev, siteId: e.target.value }))}
                  placeholder="ID do site no SolarEdge"
                />
              </div>
            </div>
          </div>
        )}

        {/* Configuração Sungrow Melhorada */}
        {systemType === 'sungrow' && (
          <div className="space-y-4">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="config" className="flex items-center gap-2">
                  <Settings className="w-4 h-4" />
                  Configuração
                </TabsTrigger>
                <TabsTrigger value="test">Teste</TabsTrigger>
                <TabsTrigger value="discovery">Descoberta</TabsTrigger>
              </TabsList>
              
              <TabsContent value="config" className="space-y-4">
                <div className="p-4 border rounded-lg">
                  <h4 className="font-medium mb-4">Configuração Manual Sungrow</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="sg-username">Usuário</Label>
                      <Input
                        id="sg-username"
                        value={sungrowConfig.username}
                        onChange={(e) => setSungrowConfig(prev => ({ ...prev, username: e.target.value }))}
                        placeholder="Seu usuário Sungrow"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="sg-password">Senha</Label>
                      <Input
                        id="sg-password"
                        type="password"
                        value={sungrowConfig.password}
                        onChange={(e) => setSungrowConfig(prev => ({ ...prev, password: e.target.value }))}
                        placeholder="Sua senha Sungrow"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="sg-appkey">App Key</Label>
                      <Input
                        id="sg-appkey"
                        value={sungrowConfig.appkey}
                        onChange={(e) => setSungrowConfig(prev => ({ ...prev, appkey: e.target.value }))}
                        placeholder="Chave da aplicação"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="sg-accesskey">Access Key Value</Label>
                      <Input
                        id="sg-accesskey"
                        type="password"
                        value={sungrowConfig.accessKey}
                        onChange={(e) => setSungrowConfig(prev => ({ ...prev, accessKey: e.target.value }))}
                        placeholder="Valor da chave de acesso"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="sg-plant-id">Plant ID</Label>
                      <Input
                        id="sg-plant-id"
                        value={sungrowConfig.plantId}
                        onChange={(e) => setSungrowConfig(prev => ({ ...prev, plantId: e.target.value }))}
                        placeholder="ID da planta"
                      />
                    </div>
                  </div>
                </div>
              </TabsContent>
              
              <TabsContent value="test">
                <SungrowConnectionTest onConnectionSuccess={handleSungrowConnectionSuccess} />
              </TabsContent>
              
              <TabsContent value="discovery">
                {sungrowConfig.username && sungrowConfig.appkey && sungrowConfig.accessKey ? (
                  <SungrowPlantDiscovery 
                    config={sungrowConfig} 
                    onPlantsSelected={handleSungrowPlantsSelected}
                  />
                ) : (
                  <Card>
                    <CardContent className="pt-6">
                      <div className="text-center">
                        <AlertCircle className="w-12 h-12 text-yellow-500 mx-auto mb-4" />
                        <h3 className="font-medium mb-2">Credenciais necessárias</h3>
                        <p className="text-sm text-muted-foreground mb-4">
                          Configure e teste suas credenciais primeiro para descobrir plantas automaticamente.
                        </p>
                        <Button 
                          variant="outline" 
                          onClick={() => setActiveTab('test')}
                        >
                          Ir para Teste de Conexão
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>
            </Tabs>
          </div>
        )}

        {/* Sincronização automática */}
        {systemType !== 'manual' && (
          <div className="flex items-center space-x-2">
            <Switch
              id="sync-enabled"
              checked={syncEnabled}
              onCheckedChange={setSyncEnabled}
            />
            <Label htmlFor="sync-enabled">Habilitar sincronização automática</Label>
          </div>
        )}

        {/* Informações de sincronização */}
        {systemType !== 'manual' && plant.last_sync && (
          <div className="text-sm text-muted-foreground">
            Última sincronização: {new Date(plant.last_sync).toLocaleString('pt-BR')}
          </div>
        )}

        {/* Botões */}
        <div className="flex gap-2 pt-4">
          {systemType !== 'manual' && (
            <Button
              variant="outline"
              onClick={testConnection}
              disabled={testing || loading}
            >
              {testing && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Testar Conexão
            </Button>
          )}
          
          <Button onClick={saveConfiguration} disabled={loading}>
            {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Salvar Configuração
          </Button>

          {systemType !== 'manual' && syncEnabled && (
            <Button variant="outline" onClick={syncNow} disabled={loading}>
              {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Sincronizar Agora
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
