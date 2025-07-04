import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AlertCircle, CheckCircle, Loader2, Plus, MapPin, Zap, Download, Settings } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { getDetailedErrorMessage } from '@/utils/errorHandling';
import { logger } from '@/services/logger';
import type { SolarEdgeConfig } from '@/types/monitoring';
import type { SungrowConfig } from '@/types/sungrow';
import { SungrowConnectionTest } from './SungrowConnectionTest';

interface DiscoveredPlant {
  id: string;
  name: string;
  capacity?: number;
  location?: string;
  status?: string;
  installationDate?: string;
  latitude?: number;
  longitude?: number;
  ps_id?: string; // Plant Station ID específico do Sungrow
}

interface PlantDiscoveryProps {
  onPlantImported: () => void;
}

export const PlantDiscovery = ({ onPlantImported }: PlantDiscoveryProps) => {
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [testing, setTesting] = useState(false);
  const [discovering, setDiscovering] = useState(false);
  const [importing, setImporting] = useState(false);
  
  // Step 1: Sistema de monitoramento
  const [systemType, setSystemType] = useState<'solaredge' | 'sungrow'>('solaredge');
  
  // Step 2: Configurações
  const [solarEdgeConfig, setSolarEdgeConfig] = useState<SolarEdgeConfig>({
    apiKey: '',
    siteId: '',
    username: '',
    password: ''
  });
  
  const [sungrowConfig, setSungrowConfig] = useState<SungrowConfig>({
    authMode: 'direct',
    username: '',
    password: '',
    appkey: '',
    accessKey: '',
    plantId: '',
    baseUrl: 'https://gateway.isolarcloud.com.hk'
  });
  
  // Step 3: Plantas descobertas
  const [discoveredPlants, setDiscoveredPlants] = useState<DiscoveredPlant[]>([]);
  const [selectedPlants, setSelectedPlants] = useState<string[]>([]);

  const resetWizard = () => {
    setCurrentStep(1);
    setSystemType('solaredge');
    setSolarEdgeConfig({ apiKey: '', siteId: '', username: '', password: '' });
    setSungrowConfig({ authMode: 'direct', username: '', password: '', appkey: '', accessKey: '', plantId: '', baseUrl: 'https://gateway.isolarcloud.com.hk' });
    setDiscoveredPlants([]);
    setSelectedPlants([]);
  };

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
          description: "Credenciais válidas. Você pode prosseguir para descobrir plantas.",
        });
        setCurrentStep(3);
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

  const discoverPlants = async () => {
    setDiscovering(true);
    try {
      const config = systemType === 'solaredge' ? solarEdgeConfig : sungrowConfig;
      const functionName = systemType === 'solaredge' ? 'solaredge-connector' : 'sungrow-connector';
      
      logger.info('Discovering plants', {
        component: 'PlantDiscovery',
        systemType,
        username: config.username ? `${config.username.substring(0, 3)}***` : 'missing'
      });
      
      const { data, error } = await supabase.functions.invoke(functionName, {
        body: {
          action: 'discover_plants',
          config
        }
      });

      if (error) throw error;

      if (data.success) {
        // Para Sungrow, garantir que cada planta tenha o ps_id correto
        const plantsWithPsId = data.plants.map((plant: any) => ({
          ...plant,
          ps_id: plant.ps_id || plant.id // Garantir que ps_id seja preservado
        }));
        
        setDiscoveredPlants(plantsWithPsId);
        logger.info('Plants discovered successfully', {
          component: 'PlantDiscovery',
          systemType,
          plantsCount: plantsWithPsId.length,
          plants: plantsWithPsId.map(p => ({ name: p.name, id: p.id, ps_id: p.ps_id }))
        });
        
        toast({
          title: "Plantas descobertas!",
          description: `Encontradas ${plantsWithPsId.length} plantas disponíveis.`,
        });
      } else {
        throw new Error(data.message);
      }
    } catch (error: any) {
      toast({
        title: "Erro ao descobrir plantas",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setDiscovering(false);
    }
  };

  const importSelectedPlants = async () => {
    if (selectedPlants.length === 0) {
      toast({
        title: "Nenhuma planta selecionada",
        description: "Selecione pelo menos uma planta para importar.",
        variant: "destructive",
      });
      return;
    }

    setImporting(true);
    try {
      const config = systemType === 'solaredge' ? solarEdgeConfig : sungrowConfig;
      const plantsToImport = discoveredPlants.filter(plant => selectedPlants.includes(plant.id));
      
      logger.info('Starting plant import process', {
        component: 'PlantDiscovery',
        systemType,
        plantsToImport: plantsToImport.map(p => ({ name: p.name, id: p.id }))
      });
      
      for (const plant of plantsToImport) {
        // Verificar se a planta já existe
        const { data: existing } = await supabase
          .from('plants')
          .select('id')
          .eq('api_site_id', plant.ps_id || plant.id)
          .single();

        if (existing) {
          logger.warn('Plant already exists, skipping', {
            component: 'PlantDiscovery',
            plantName: plant.name,
            apiSiteId: plant.ps_id || plant.id
          });
          continue;
        }

        // Preparar configuração com plantId correto para Sungrow
        let finalConfig = config;
        if (systemType === 'sungrow') {
          finalConfig = {
            ...config,
            plantId: plant.ps_id || plant.id // Usar ps_id se disponível, senão usar id
          };
        }

        logger.debug('Final config for plant import', {
          component: 'PlantDiscovery',
          plantName: plant.name,
          plantId: finalConfig.plantId || 'not set',
          apiSiteId: plant.ps_id || plant.id,
          systemType
        });

        // Criar nova planta
        const { data: newPlant, error: insertError } = await supabase
          .from('plants')
          .insert({
            name: plant.name,
            capacity_kwp: plant.capacity || 0,
            lat: plant.latitude || -23.5505,
            lng: plant.longitude || -46.6333,
            concessionaria: 'A definir',
            start_date: plant.installationDate || new Date().toISOString().split('T')[0],
            status: 'active' as const,
            monitoring_system: systemType,
            api_site_id: plant.ps_id || plant.id, // Usar ps_id se disponível
            api_credentials: finalConfig as any,
            sync_enabled: true
          })
          .select()
          .single();

        if (insertError) {
          logger.error('Erro ao importar planta', insertError as Error, {
            component: 'PlantDiscovery',
            plantName: plant.name,
            systemType
          });
          continue;
        }

        logger.info('Plant imported successfully', {
          component: 'PlantDiscovery',
          plantName: plant.name,
          plantId: newPlant.id,
          systemType
        });

        // Após importar, fazer sincronização inicial automática
        if (newPlant && systemType === 'sungrow') {
          try {
            logger.info('Starting initial sync for imported plant', {
              component: 'PlantDiscovery',
              plantName: plant.name,
              plantId: newPlant.id,
              systemType: 'sungrow'
            });
            
            const { data: syncResult, error: syncError } = await supabase.functions.invoke('sungrow-connector', {
              body: {
                action: 'sync_data',
                plantId: newPlant.id
              }
            });

            if (syncError) {
              logger.error('Erro na sincronização inicial', syncError, {
                component: 'PlantDiscovery',
                plantName: plant.name,
                plantId: newPlant.id
              });
            } else if (syncResult?.success) {
              logger.info('Sincronização inicial bem-sucedida', {
                component: 'PlantDiscovery',
                plantName: plant.name,
                plantId: newPlant.id,
                dataPointsSynced: syncResult.dataPointsSynced || 0
              });
            } else {
              logger.warn('Sincronização inicial falhou', {
                component: 'PlantDiscovery',
                plantName: plant.name,
                plantId: newPlant.id,
                error: syncResult?.error
              });
            }
          } catch (syncError) {
            logger.error('Falha na sincronização inicial', syncError as Error, {
              component: 'PlantDiscovery',
              plantName: plant.name,
              plantId: newPlant.id
            });
          }
        }
      }

      toast({
        title: "Importação concluída!",
        description: `${selectedPlants.length} plantas foram importadas com sucesso e a sincronização inicial foi iniciada.`,
      });
      
      onPlantImported();
      setIsOpen(false);
      resetWizard();
    } catch (error: any) {
      toast({
        title: "Erro na importação",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setImporting(false);
    }
  };

  const togglePlantSelection = (plantId: string) => {
    setSelectedPlants(prev => 
      prev.includes(plantId) 
        ? prev.filter(id => id !== plantId)
        : [...prev, plantId]
    );
  };

  const handleSungrowConnectionSuccess = (config: SungrowConfig) => {
    setSungrowConfig(config);
    setCurrentStep(3);
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button onClick={() => setIsOpen(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Descobrir Plantas
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Descobrir e Importar Plantas</DialogTitle>
          <DialogDescription>
            Conecte-se ao seu portal de monitoramento para descobrir e importar suas plantas solares automaticamente
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Progress indicator */}
          <div className="flex items-center space-x-4">
            <div className={`flex items-center space-x-2 ${currentStep >= 1 ? 'text-primary' : 'text-muted-foreground'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 ${currentStep >= 1 ? 'border-primary bg-primary text-primary-foreground' : 'border-muted-foreground'}`}>
                1
              </div>
              <span className="text-sm font-medium">Portal</span>
            </div>
            <div className="flex-1 h-px bg-border" />
            <div className={`flex items-center space-x-2 ${currentStep >= 2 ? 'text-primary' : 'text-muted-foreground'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 ${currentStep >= 2 ? 'border-primary bg-primary text-primary-foreground' : 'border-muted-foreground'}`}>
                2
              </div>
              <span className="text-sm font-medium">Credenciais</span>
            </div>
            <div className="flex-1 h-px bg-border" />
            <div className={`flex items-center space-x-2 ${currentStep >= 3 ? 'text-primary' : 'text-muted-foreground'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 ${currentStep >= 3 ? 'border-primary bg-primary text-primary-foreground' : 'border-muted-foreground'}`}>
                3
              </div>
              <span className="text-sm font-medium">Descobrir</span>
            </div>
          </div>

          {/* Step 1: Escolher portal */}
          {currentStep === 1 && (
            <Card>
              <CardHeader>
                <CardTitle>Escolha o Portal de Monitoramento</CardTitle>
                <CardDescription>
                  Selecione o sistema de monitoramento da sua planta solar
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Sistema de Monitoramento</Label>
                  <Select value={systemType} onValueChange={(value: any) => setSystemType(value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="solaredge">SolarEdge</SelectItem>
                      <SelectItem value="sungrow">Sungrow</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="flex justify-end pt-4">
                  <Button onClick={() => setCurrentStep(2)}>
                    Próximo
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Step 2: Inserir credenciais */}
          {currentStep === 2 && (
            <Card>
              <CardHeader>
                <CardTitle>Configurar Credenciais</CardTitle>
                <CardDescription>
                  {systemType === 'sungrow' ? 'Configure suas credenciais do Sungrow com teste automático' : 'Insira suas credenciais do SolarEdge'}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {systemType === 'solaredge' ? (
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="se-username">Usuário</Label>
                        <Input
                          id="se-username"
                          value={solarEdgeConfig.username || ''}
                          onChange={(e) => setSolarEdgeConfig(prev => ({ ...prev, username: e.target.value }))}
                          placeholder="Seu usuário SolarEdge"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="se-password">Senha</Label>
                        <Input
                          id="se-password"
                          type="password"
                          value={solarEdgeConfig.password || ''}
                          onChange={(e) => setSolarEdgeConfig(prev => ({ ...prev, password: e.target.value }))}
                          placeholder="Sua senha SolarEdge"
                        />
                      </div>
                    </div>
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
                        <Label htmlFor="se-site-id">Site ID (opcional)</Label>
                        <Input
                          id="se-site-id"
                          value={solarEdgeConfig.siteId}
                          onChange={(e) => setSolarEdgeConfig(prev => ({ ...prev, siteId: e.target.value }))}
                          placeholder="ID específico do site (deixe vazio para descobrir todos)"
                        />
                      </div>
                    </div>
                    <div className="flex justify-between pt-4">
                      <Button variant="outline" onClick={() => setCurrentStep(1)}>
                        Voltar
                      </Button>
                      <Button onClick={testConnection} disabled={testing}>
                        {testing && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                        Testar e Continuar
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <SungrowConnectionTest onConnectionSuccess={handleSungrowConnectionSuccess} />
                    <div className="flex justify-between pt-4">
                      <Button variant="outline" onClick={() => setCurrentStep(1)}>
                        Voltar
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Step 3: Descobrir e importar plantas */}
          {currentStep === 3 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Download className="w-5 h-5" />
                  Descobrir e Importar Plantas
                </CardTitle>
                <CardDescription>
                  Conecte-se ao portal para descobrir suas plantas disponíveis
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {discoveredPlants.length === 0 ? (
                  <div className="text-center py-8">
                    <Button onClick={discoverPlants} disabled={discovering} size="lg">
                      {discovering && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                      <Download className="w-4 h-4 mr-2" />
                      Descobrir Plantas
                    </Button>
                    <p className="text-sm text-muted-foreground mt-2">
                      Clique para buscar plantas disponíveis no seu portal
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <h4 className="font-medium">
                        {discoveredPlants.length} plantas encontradas
                      </h4>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setSelectedPlants(discoveredPlants.map(p => p.id))}
                        >
                          Selecionar Todas
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setSelectedPlants([])}
                        >
                          Limpar Seleção
                        </Button>
                      </div>
                    </div>

                    <div className="grid gap-3 max-h-96 overflow-y-auto">
                      {discoveredPlants.map((plant) => (
                        <div
                          key={plant.id}
                          className={`flex items-center space-x-3 p-3 border rounded-lg cursor-pointer transition-colors ${
                            selectedPlants.includes(plant.id) ? 'bg-accent border-primary' : 'hover:bg-accent/50'
                          }`}
                          onClick={() => togglePlantSelection(plant.id)}
                        >
                          <Checkbox
                            checked={selectedPlants.includes(plant.id)}
                            onChange={() => togglePlantSelection(plant.id)}
                          />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <h5 className="font-medium truncate">{plant.name}</h5>
                              {plant.status && (
                                <Badge variant={plant.status === 'Active' ? 'default' : 'secondary'}>
                                  {plant.status}
                                </Badge>
                              )}
                            </div>
                            <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
                              <span className="text-xs bg-gray-100 px-2 py-1 rounded">
                                PS_ID: {plant.ps_id || plant.id}
                              </span>
                              {plant.capacity && (
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
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="flex justify-between pt-4">
                      <Button variant="outline" onClick={() => setCurrentStep(2)}>
                        Voltar
                      </Button>
                      <Button 
                        onClick={importSelectedPlants} 
                        disabled={importing || selectedPlants.length === 0}
                      >
                        {importing && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                        Importar {selectedPlants.length} Plantas
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
