import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  Layout, 
  Zap, 
  Settings, 
  CloudSun, 
  TrendingUp, 
  Plus,
  Trash2,
  Save,
  CheckCircle
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { Plant } from '@/types';
import type { DigitalTwinConfig, StringConfig, InverterConfig } from '@/types/digital-twin';

interface DigitalTwinBuilderProps {
  plant: Plant;
  existingConfig?: DigitalTwinConfig;
  onSave: (config: DigitalTwinConfig) => Promise<void>;
}

export const DigitalTwinBuilder = ({ plant, existingConfig, onSave }: DigitalTwinBuilderProps) => {
  const { toast } = useToast();
  const [currentStep, setCurrentStep] = useState(0);
  const [isSaving, setIsSaving] = useState(false);

  // Layout config
  const [layout, setLayout] = useState({
    total_area_m2: existingConfig?.layout.total_area_m2 || 0,
    module_count: existingConfig?.layout.module_count || 0,
    module_wp: existingConfig?.layout.module_wp || 550,
    tilt_angle: existingConfig?.layout.tilt_angle || 15,
    azimuth: existingConfig?.layout.azimuth || 0,
    ground_coverage_ratio: existingConfig?.layout.ground_coverage_ratio || 0.3,
    tracker_type: existingConfig?.layout.tracker_type || 'fixed' as const,
  });

  // Inverters
  const [inverters, setInverters] = useState<InverterConfig[]>(
    existingConfig?.inverters || []
  );

  // Strings
  const [strings, setStrings] = useState<StringConfig[]>(
    existingConfig?.strings || []
  );

  // Losses
  const [losses, setLosses] = useState({
    soiling: existingConfig?.losses.soiling || 2,
    shading: existingConfig?.losses.shading || 1,
    mismatch: existingConfig?.losses.mismatch || 2,
    wiring: existingConfig?.losses.wiring || 1.5,
    connections: existingConfig?.losses.connections || 0.5,
    lid: existingConfig?.losses.lid || 1.5,
    temperature_coefficient: existingConfig?.losses.temperature_coefficient || -0.4,
    irradiance_threshold: existingConfig?.losses.irradiance_threshold || 100,
    annual_degradation: existingConfig?.losses.annual_degradation || 0.5,
    grid_availability: existingConfig?.losses.grid_availability || 98,
    system_availability: existingConfig?.losses.system_availability || 99,
  });

  const [targetPR, setTargetPR] = useState(existingConfig?.performance_ratio_target || 80);

  const addInverter = () => {
    const newInverter: InverterConfig = {
      id: `inv_${Date.now()}`,
      name: `Inversor ${inverters.length + 1}`,
      manufacturer: '',
      model: '',
      rated_power_kw: 0,
      mppt_count: 2,
      connection_type: 'grid',
      efficiency_curve: {
        points: [
          { dc_power_ratio: 0.1, efficiency: 0.92 },
          { dc_power_ratio: 0.2, efficiency: 0.96 },
          { dc_power_ratio: 0.5, efficiency: 0.98 },
          { dc_power_ratio: 1.0, efficiency: 0.97 },
        ]
      }
    };
    setInverters([...inverters, newInverter]);
  };

  const addString = () => {
    if (inverters.length === 0) {
      toast({
        title: "Adicione inversores primeiro",
        description: "É necessário ter pelo menos um inversor antes de adicionar strings",
        variant: "destructive"
      });
      return;
    }

    const newString: StringConfig = {
      id: `str_${Date.now()}`,
      name: `String ${strings.length + 1}`,
      inverter_id: inverters[0].id,
      mppt_input: 1,
      module_count: 20,
      configuration: '20x1',
      orientation: {
        tilt: layout.tilt_angle,
        azimuth: layout.azimuth,
      }
    };
    setStrings([...strings, newString]);
  };

  const handleSave = async () => {
    // Validação básica
    if (layout.module_count === 0) {
      toast({
        title: "Configuração incompleta",
        description: "Configure o layout da planta primeiro",
        variant: "destructive"
      });
      return;
    }

    if (inverters.length === 0) {
      toast({
        title: "Configuração incompleta",
        description: "Adicione pelo menos um inversor",
        variant: "destructive"
      });
      return;
    }

    setIsSaving(true);
    try {
      const config: DigitalTwinConfig = {
        id: existingConfig?.id || `twin_${Date.now()}`,
        plant_id: plant.id,
        version: existingConfig ? `${parseInt(existingConfig.version) + 1}` : '1',
        created_at: existingConfig?.created_at || new Date().toISOString(),
        updated_at: new Date().toISOString(),
        
        layout,
        strings,
        inverters,
        losses,
        performance_ratio_target: targetPR,
        
        environmental_context: {
          altitude_m: 0,
          albedo: 0.2,
          soiling_seasonal: Array.from({ length: 12 }, (_, i) => ({
            month: i + 1,
            factor: 0.95 // Default: 5% de perda por soiling
          }))
        },
        
        baseline_model: {
          model_type: 'pvlib',
          parameters: {}
        }
      };

      await onSave(config);
      
      toast({
        title: "Digital Twin salvo!",
        description: "Configuração salva com sucesso. O baseline será calculado automaticamente.",
      });
    } catch (error) {
      toast({
        title: "Erro ao salvar",
        description: error instanceof Error ? error.message : "Erro desconhecido",
        variant: "destructive"
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="w-5 h-5" />
            Construtor de Digital Twin
          </CardTitle>
          <CardDescription>
            Configure o modelo executável da planta {plant.name} para baseline dinâmico e análise de performance
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={currentStep.toString()} onValueChange={(v) => setCurrentStep(parseInt(v))}>
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="0">
                <Layout className="w-4 h-4 mr-2" />
                Layout
              </TabsTrigger>
              <TabsTrigger value="1">
                <Zap className="w-4 h-4 mr-2" />
                Equipamentos
              </TabsTrigger>
              <TabsTrigger value="2">
                <CloudSun className="w-4 h-4 mr-2" />
                Perdas
              </TabsTrigger>
              <TabsTrigger value="3">
                <TrendingUp className="w-4 h-4 mr-2" />
                Performance
              </TabsTrigger>
            </TabsList>

            {/* Step 1: Layout */}
            <TabsContent value="0" className="space-y-4 mt-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Número de Módulos</Label>
                  <Input
                    type="number"
                    value={layout.module_count}
                    onChange={(e) => setLayout({ ...layout, module_count: parseInt(e.target.value) || 0 })}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label>Potência do Módulo (Wp)</Label>
                  <Input
                    type="number"
                    value={layout.module_wp}
                    onChange={(e) => setLayout({ ...layout, module_wp: parseInt(e.target.value) || 0 })}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Inclinação (graus)</Label>
                  <Input
                    type="number"
                    value={layout.tilt_angle}
                    onChange={(e) => setLayout({ ...layout, tilt_angle: parseFloat(e.target.value) || 0 })}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Azimute (graus)</Label>
                  <Input
                    type="number"
                    value={layout.azimuth}
                    onChange={(e) => setLayout({ ...layout, azimuth: parseFloat(e.target.value) || 0 })}
                    placeholder="0=Norte, 90=Leste, 180=Sul"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Área Total (m²)</Label>
                  <Input
                    type="number"
                    value={layout.total_area_m2}
                    onChange={(e) => setLayout({ ...layout, total_area_m2: parseFloat(e.target.value) || 0 })}
                  />
                </div>

                <div className="space-y-2">
                  <Label>GCR (Ground Coverage Ratio)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={layout.ground_coverage_ratio}
                    onChange={(e) => setLayout({ ...layout, ground_coverage_ratio: parseFloat(e.target.value) || 0 })}
                  />
                </div>
              </div>

              <div className="pt-4">
                <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
                  <div>
                    <p className="text-sm font-medium">Potência Total Calculada</p>
                    <p className="text-2xl font-bold">{(layout.module_count * layout.module_wp / 1000).toFixed(2)} kWp</p>
                  </div>
                  <CheckCircle className="w-8 h-8 text-green-500" />
                </div>
              </div>
            </TabsContent>

            {/* Step 2: Equipment */}
            <TabsContent value="1" className="space-y-6 mt-6">
              {/* Inversores */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold">Inversores</h3>
                  <Button onClick={addInverter} size="sm">
                    <Plus className="w-4 h-4 mr-2" />
                    Adicionar Inversor
                  </Button>
                </div>

                {inverters.map((inv, idx) => (
                  <Card key={inv.id}>
                    <CardContent className="pt-6">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Nome</Label>
                          <Input
                            value={inv.name}
                            onChange={(e) => {
                              const updated = [...inverters];
                              updated[idx].name = e.target.value;
                              setInverters(updated);
                            }}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Potência Nominal (kW)</Label>
                          <Input
                            type="number"
                            value={inv.rated_power_kw}
                            onChange={(e) => {
                              const updated = [...inverters];
                              updated[idx].rated_power_kw = parseFloat(e.target.value) || 0;
                              setInverters(updated);
                            }}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Fabricante</Label>
                          <Input
                            value={inv.manufacturer}
                            onChange={(e) => {
                              const updated = [...inverters];
                              updated[idx].manufacturer = e.target.value;
                              setInverters(updated);
                            }}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Modelo</Label>
                          <Input
                            value={inv.model}
                            onChange={(e) => {
                              const updated = [...inverters];
                              updated[idx].model = e.target.value;
                              setInverters(updated);
                            }}
                          />
                        </div>
                      </div>
                      <div className="flex justify-end mt-4">
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => setInverters(inverters.filter((_, i) => i !== idx))}
                        >
                          <Trash2 className="w-4 h-4 mr-2" />
                          Remover
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              <Separator />

              {/* Strings */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold">Strings</h3>
                  <Button onClick={addString} size="sm">
                    <Plus className="w-4 h-4 mr-2" />
                    Adicionar String
                  </Button>
                </div>

                {strings.map((str, idx) => (
                  <Card key={str.id}>
                    <CardContent className="pt-6">
                      <div className="grid grid-cols-3 gap-4">
                        <div className="space-y-2">
                          <Label>Nome</Label>
                          <Input
                            value={str.name}
                            onChange={(e) => {
                              const updated = [...strings];
                              updated[idx].name = e.target.value;
                              setStrings(updated);
                            }}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Inversor</Label>
                          <select
                            className="w-full h-10 px-3 py-2 text-sm bg-background border rounded-md"
                            value={str.inverter_id}
                            onChange={(e) => {
                              const updated = [...strings];
                              updated[idx].inverter_id = e.target.value;
                              setStrings(updated);
                            }}
                          >
                            {inverters.map(inv => (
                              <option key={inv.id} value={inv.id}>{inv.name}</option>
                            ))}
                          </select>
                        </div>
                        <div className="space-y-2">
                          <Label>Módulos</Label>
                          <Input
                            type="number"
                            value={str.module_count}
                            onChange={(e) => {
                              const updated = [...strings];
                              updated[idx].module_count = parseInt(e.target.value) || 0;
                              setStrings(updated);
                            }}
                          />
                        </div>
                      </div>
                      <div className="flex justify-end mt-4">
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => setStrings(strings.filter((_, i) => i !== idx))}
                        >
                          <Trash2 className="w-4 h-4 mr-2" />
                          Remover
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>

            {/* Step 3: Losses */}
            <TabsContent value="2" className="space-y-4 mt-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Soiling - Sujidade (%)</Label>
                  <Input
                    type="number"
                    step="0.1"
                    value={losses.soiling}
                    onChange={(e) => setLosses({ ...losses, soiling: parseFloat(e.target.value) || 0 })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Shading - Sombreamento (%)</Label>
                  <Input
                    type="number"
                    step="0.1"
                    value={losses.shading}
                    onChange={(e) => setLosses({ ...losses, shading: parseFloat(e.target.value) || 0 })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Mismatch - Descasamento (%)</Label>
                  <Input
                    type="number"
                    step="0.1"
                    value={losses.mismatch}
                    onChange={(e) => setLosses({ ...losses, mismatch: parseFloat(e.target.value) || 0 })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Cabeamento (%)</Label>
                  <Input
                    type="number"
                    step="0.1"
                    value={losses.wiring}
                    onChange={(e) => setLosses({ ...losses, wiring: parseFloat(e.target.value) || 0 })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>LID - Degradação por Luz (%)</Label>
                  <Input
                    type="number"
                    step="0.1"
                    value={losses.lid}
                    onChange={(e) => setLosses({ ...losses, lid: parseFloat(e.target.value) || 0 })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Degradação Anual (%/ano)</Label>
                  <Input
                    type="number"
                    step="0.1"
                    value={losses.annual_degradation}
                    onChange={(e) => setLosses({ ...losses, annual_degradation: parseFloat(e.target.value) || 0 })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Coef. Temperatura (%/°C)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={losses.temperature_coefficient}
                    onChange={(e) => setLosses({ ...losses, temperature_coefficient: parseFloat(e.target.value) || 0 })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Disponibilidade Sistema (%)</Label>
                  <Input
                    type="number"
                    step="0.1"
                    value={losses.system_availability}
                    onChange={(e) => setLosses({ ...losses, system_availability: parseFloat(e.target.value) || 0 })}
                  />
                </div>
              </div>

              <div className="p-4 bg-muted rounded-lg">
                <p className="text-sm font-medium mb-2">Total de Perdas Estimadas</p>
                <p className="text-3xl font-bold">
                  {(losses.soiling + losses.shading + losses.mismatch + losses.wiring + losses.connections + losses.lid).toFixed(1)}%
                </p>
              </div>
            </TabsContent>

            {/* Step 4: Performance */}
            <TabsContent value="3" className="space-y-4 mt-6">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Performance Ratio (PR) Alvo (%)</Label>
                  <Input
                    type="number"
                    step="0.1"
                    value={targetPR}
                    onChange={(e) => setTargetPR(parseFloat(e.target.value) || 80)}
                  />
                  <p className="text-sm text-muted-foreground">
                    PR típico: 75-85%. Sistemas bem otimizados: 80-90%
                  </p>
                </div>

                <Separator />

                <div className="space-y-3">
                  <h4 className="font-semibold">Resumo da Configuração</h4>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-3 border rounded-lg">
                      <p className="text-sm text-muted-foreground">Módulos Totais</p>
                      <p className="text-xl font-semibold">{layout.module_count}</p>
                    </div>
                    <div className="p-3 border rounded-lg">
                      <p className="text-sm text-muted-foreground">Potência Instalada</p>
                      <p className="text-xl font-semibold">{(layout.module_count * layout.module_wp / 1000).toFixed(2)} kWp</p>
                    </div>
                    <div className="p-3 border rounded-lg">
                      <p className="text-sm text-muted-foreground">Inversores</p>
                      <p className="text-xl font-semibold">{inverters.length}</p>
                    </div>
                    <div className="p-3 border rounded-lg">
                      <p className="text-sm text-muted-foreground">Strings</p>
                      <p className="text-xl font-semibold">{strings.length}</p>
                    </div>
                  </div>

                  <div className="p-4 bg-primary/10 border border-primary/20 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <CheckCircle className="w-5 h-5 text-primary" />
                      <h5 className="font-semibold">Próximos Passos</h5>
                    </div>
                    <ul className="space-y-1 text-sm">
                      <li>• O baseline dinâmico será calculado automaticamente</li>
                      <li>• Análise de performance hora-a-hora estará disponível</li>
                      <li>• Alertas inteligentes serão configurados com base no Digital Twin</li>
                    </ul>
                  </div>
                </div>
              </div>
            </TabsContent>
          </Tabs>

          <div className="flex justify-between mt-6 pt-6 border-t">
            <Button
              variant="outline"
              onClick={() => setCurrentStep(Math.max(0, currentStep - 1))}
              disabled={currentStep === 0}
            >
              Anterior
            </Button>
            
            {currentStep < 3 ? (
              <Button onClick={() => setCurrentStep(currentStep + 1)}>
                Próximo
              </Button>
            ) : (
              <Button onClick={handleSave} disabled={isSaving}>
                <Save className="w-4 h-4 mr-2" />
                {isSaving ? 'Salvando...' : 'Salvar Digital Twin'}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
