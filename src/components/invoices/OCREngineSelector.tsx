
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Brain, Zap, DollarSign, Clock, TrendingUp } from "lucide-react";
import { OCR_ENGINES, DEFAULT_OCR_CONFIG, MultiEngineOCRConfig, OCREngine } from "@/types/ocr-engines";

interface OCREngineSelectorProps {
  config: MultiEngineOCRConfig;
  onConfigChange: (config: MultiEngineOCRConfig) => void;
}

export function OCREngineSelector({ config, onConfigChange }: OCREngineSelectorProps) {
  const [localConfig, setLocalConfig] = useState(config);

  const handleConfigUpdate = (updates: Partial<MultiEngineOCRConfig>) => {
    const newConfig = { ...localConfig, ...updates };
    setLocalConfig(newConfig);
    onConfigChange(newConfig);
  };

  const getEngineIcon = (engineName: string) => {
    switch (engineName) {
      case 'openai': return <Brain className="w-4 h-4" />;
      case 'google_vision': return <Zap className="w-4 h-4" />;
      case 'tesseract': return <TrendingUp className="w-4 h-4" />;
      default: return <Brain className="w-4 h-4" />;
    }
  };

  const getEngineColor = (engineName: string) => {
    switch (engineName) {
      case 'openai': return 'bg-purple-100 text-purple-800';
      case 'google_vision': return 'bg-blue-100 text-blue-800';
      case 'tesseract': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="w-5 h-5 text-purple-500" />
            Configuração Multi-Engine OCR
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Engine Selection */}
          <div className="space-y-4">
            <h4 className="font-semibold">Engine Principal</h4>
            <Select
              value={localConfig.primary_engine}
              onValueChange={(value) => handleConfigUpdate({ 
                primary_engine: value as 'openai' | 'google_vision' | 'tesseract'
              })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {OCR_ENGINES.filter(e => e.enabled).map(engine => (
                  <SelectItem key={engine.name} value={engine.name}>
                    <div className="flex items-center gap-2">
                      {getEngineIcon(engine.name)}
                      <span className="capitalize">{engine.name.replace('_', ' ')}</span>
                      <Badge className={getEngineColor(engine.name)}>
                        {(engine.avg_accuracy * 100).toFixed(1)}%
                      </Badge>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* A/B Testing Configuration */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label htmlFor="ab-testing">A/B Testing</Label>
              <Switch
                id="ab-testing"
                checked={localConfig.ab_testing_enabled}
                onCheckedChange={(checked) => handleConfigUpdate({ ab_testing_enabled: checked })}
              />
            </div>
            
            {localConfig.ab_testing_enabled && (
              <div className="space-y-3">
                <Label>Split de Teste: {localConfig.ab_test_split}%</Label>
                <Slider
                  value={[localConfig.ab_test_split]}
                  onValueChange={([value]) => handleConfigUpdate({ ab_test_split: value })}
                  max={50}
                  min={5}
                  step={5}
                  className="w-full"
                />
                <p className="text-sm text-gray-600">
                  {localConfig.ab_test_split}% das faturas serão processadas com engine alternativo para comparação
                </p>
              </div>
            )}
          </div>

          {/* Confidence Threshold */}
          <div className="space-y-3">
            <Label>Limite de Confiança: {(localConfig.confidence_threshold * 100).toFixed(0)}%</Label>
            <Slider
              value={[localConfig.confidence_threshold * 100]}
              onValueChange={([value]) => handleConfigUpdate({ confidence_threshold: value / 100 })}
              max={99}
              min={70}
              step={1}
              className="w-full"
            />
            <p className="text-sm text-gray-600">
              Extrações abaixo deste limite serão encaminhadas para revisão manual
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Engine Performance Overview */}
      <Card>
        <CardHeader>
          <CardTitle>Performance dos Engines</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4">
            {OCR_ENGINES.map(engine => (
              <div key={engine.name} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center gap-3">
                  {getEngineIcon(engine.name)}
                  <div>
                    <p className="font-medium capitalize">{engine.name.replace('_', ' ')}</p>
                    <Badge 
                      className={getEngineColor(engine.name)}
                      variant={engine.name === localConfig.primary_engine ? "default" : "secondary"}
                    >
                      {engine.name === localConfig.primary_engine ? 'Principal' : `Prioridade ${engine.priority}`}
                    </Badge>
                  </div>
                </div>
                
                <div className="flex gap-4 text-sm">
                  <div className="flex items-center gap-1">
                    <TrendingUp className="w-3 h-3 text-green-600" />
                    <span>{(engine.avg_accuracy * 100).toFixed(1)}%</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Clock className="w-3 h-3 text-blue-600" />
                    <span>{(engine.avg_processing_time_ms / 1000).toFixed(1)}s</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <DollarSign className="w-3 h-3 text-orange-600" />
                    <span>${engine.cost_per_page.toFixed(3)}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
