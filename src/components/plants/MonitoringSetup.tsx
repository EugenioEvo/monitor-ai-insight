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
import { SungrowPlantDiscovery } from './SungrowDiscovery';
import { SungrowProfileSelector } from './SungrowProfileSelector';
import { SungrowProfileService, type SungrowCredentialProfile } from '@/services/sungrowProfileService';
import { PlantConfigurationValidator } from './PlantConfigurationValidator';
import { getDetailedErrorMessage } from '@/utils/errorHandling';
import { upsertSungrowCredentials } from '@/services/plantCredentials';

interface MonitoringSetupProps {
  plant: Plant;
  onUpdate: () => void;
}

export const MonitoringSetup = ({ plant, onUpdate }: MonitoringSetupProps) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [testing, setTesting] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  
  const [systemType, setSystemType] = useState<'manual' | 'solaredge' | 'sungrow'>(
    plant.monitoring_system || 'manual'
  );
  const [syncEnabled, setSyncEnabled] = useState(plant.sync_enabled || false);
  
  // SolarEdge config
  const [solarEdgeConfig, setSolarEdgeConfig] = useState<SolarEdgeConfig>({
    apiKey: '',
    siteId: '',
    ...(systemType === 'solaredge' && plant.api_credentials ? plant.api_credentials as SolarEdgeConfig : {})
  });

  // Profile system for Sungrow
  const [selectedProfile, setSelectedProfile] = useState<SungrowCredentialProfile | null>(null);
  const [configMode, setConfigMode] = useState<'profile' | 'manual'>('profile');
  const [sungrowConfig, setSungrowConfig] = useState<SungrowConfig>({
    username: '',
    password: '',
    appkey: '',
    accessKey: '',
    plantId: '',
    baseUrl: 'https://gateway.isolarcloud.com.hk',
    authMode: 'direct'
  });

  const getEffectiveConfig = (): SungrowConfig => {
    if (configMode === 'profile' && selectedProfile) {
      return SungrowProfileService.profileToConfig(selectedProfile);
    }
    return sungrowConfig;
  };

  const testConnection = async () => {
    try {
      setTesting(true);
      setTestResult(null);

      const config = getEffectiveConfig();

      const { data, error } = await supabase.functions.invoke('sungrow-connector', {
        body: {
          action: 'test_connection',
          config
        }
      });

      if (error) {
        throw new Error(`Erro na conexão: ${error.message}`);
      }

      if (data.success) {
        setTestResult({ success: true, message: data.message || 'Conexão bem-sucedida!' });
      } else {
        setTestResult({ 
          success: false, 
          message: data.error || 'Falha na conexão'
        });
      }
    } catch (error) {
      setTestResult({ 
        success: false, 
        message: error instanceof Error ? error.message : 'Erro desconhecido'
      });
    } finally {
      setTesting(false);
    }
  };

  const syncNow = async () => {
    try {
      setSyncing(true);

      const config = getEffectiveConfig();

      const { data, error } = await supabase.functions.invoke('sungrow-connector', {
        body: {
          action: 'sync_now',
          config,
          plantId: plant.id
        }
      });

      if (error) {
        throw new Error(`Erro na sincronização: ${error.message}`);
      }

      toast({
        title: "Sincronização iniciada",
        description: data.message || "Sincronização em andamento...",
      });

      onUpdate();
    } catch (error) {
      toast({
        title: "Erro na sincronização",
        description: error instanceof Error ? error.message : 'Erro desconhecido',
        variant: "destructive",
      });
    } finally {
      setSyncing(false);
    }
  };

  const saveConfiguration = async () => {
    setLoading(true);
    try {
      const plantId = systemType === 'sungrow' ? getEffectiveConfig().plantId : 
                     systemType === 'solaredge' ? solarEdgeConfig.siteId : '';
      
      const effectiveConfig = getEffectiveConfig();
      
      const updatedConfig = {
        ...plant.api_credentials,
        ...effectiveConfig,
        plantId: plantId
      };

      // Save Sungrow credentials separately
      if (systemType === 'sungrow') {
        await upsertSungrowCredentials(plant.id, {
          username: effectiveConfig.username,
          password: effectiveConfig.password,
          appkey: effectiveConfig.appkey,
          accessKey: effectiveConfig.accessKey,
          baseUrl: effectiveConfig.baseUrl
        });
      }

      const { error } = await supabase
        .from('plants')
        .update({
          monitoring_system: systemType,
          api_credentials: systemType === 'manual' ? null : updatedConfig,
          sync_enabled: syncEnabled,
          api_site_id: plantId
        })
        .eq('id', plant.id);

      if (error) throw error;

      toast({
        title: "Configuração salva!",
        description: "Sistema de monitoramento configurado com sucesso.",
      });
      
      onUpdate();
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

        {/* Configuração Sungrow com Sistema de Perfis */}
        {systemType === 'sungrow' && (
          <>
            <SungrowProfileSelector
              onProfileSelect={setSelectedProfile}
              selectedProfile={selectedProfile}
            />
            
            <div className="flex items-center gap-4 p-4 border rounded-lg">
              <div className="flex items-center space-x-2">
                <input
                  type="radio"
                  id="profile-mode"
                  name="config-mode"
                  checked={configMode === 'profile'}
                  onChange={() => setConfigMode('profile')}
                  className="h-4 w-4"
                />
                <label htmlFor="profile-mode" className="text-sm font-medium">
                  Usar perfil selecionado
                </label>
              </div>
              <div className="flex items-center space-x-2">
                <input
                  type="radio"
                  id="manual-mode"
                  name="config-mode"
                  checked={configMode === 'manual'}
                  onChange={() => setConfigMode('manual')}
                  className="h-4 w-4"
                />
                <label htmlFor="manual-mode" className="text-sm font-medium">
                  Configuração manual
                </label>
              </div>
            </div>

            {configMode === 'manual' && (
              <SungrowConnectionTest 
                onConnectionSuccess={(config) => {
                  setSungrowConfig(config);
                  setTestResult({ success: true, message: 'Conexão configurada com sucesso!' });
                }}
              />
            )}
            
            <SungrowPlantDiscovery 
              onPlantsSelected={(plants) => {
                if (configMode === 'manual' && plants.length > 0) {
                  setSungrowConfig(prev => ({ ...prev, plantId: plants[0].id }));
                }
              }}
            />
          </>
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

        {/* Status de teste */}
        {testResult && (
          <div className={`p-4 rounded-lg border ${testResult.success ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
            <div className="flex items-center gap-2">
              {testResult.success ? (
                <CheckCircle className="h-4 w-4 text-green-600" />
              ) : (
                <AlertCircle className="h-4 w-4 text-red-600" />
              )}
              <span className={testResult.success ? 'text-green-800' : 'text-red-800'}>
                {testResult.message}
              </span>
            </div>
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
            <Button variant="outline" onClick={syncNow} disabled={syncing}>
              {syncing && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Sincronizar Agora
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
};