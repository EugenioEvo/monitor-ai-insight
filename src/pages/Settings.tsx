
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Brain, Zap, Settings2, Save, RefreshCw } from "lucide-react";

interface AppConfig {
  key: string;
  value: string;
  created_at: string;
  updated_at: string;
}

export default function Settings() {
  const [configs, setConfigs] = useState<AppConfig[]>([]);
  const [ocrEngine, setOcrEngine] = useState<string>('openai');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  const loadConfigs = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('app_config')
        .select('*')
        .order('key');

      if (error) throw error;

      setConfigs(data || []);
      
      // Set current OCR engine from config
      const ocrConfig = data?.find(config => config.key === 'ocr_engine');
      if (ocrConfig) {
        setOcrEngine(ocrConfig.value);
      }
    } catch (error) {
      console.error('Error loading configurations:', error);
      toast({
        title: "Erro ao carregar configurações",
        description: "Não foi possível carregar as configurações do sistema.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const saveOcrEngine = async () => {
    try {
      setSaving(true);
      
      const { error } = await supabase
        .from('app_config')
        .upsert({ 
          key: 'ocr_engine', 
          value: ocrEngine 
        }, {
          onConflict: 'key'
        });

      if (error) throw error;

      toast({
        title: "Configuração salva!",
        description: `Engine OCR alterado para ${ocrEngine.toUpperCase()}`,
      });

      // Reload configs to get updated timestamp
      await loadConfigs();
    } catch (error) {
      console.error('Error saving OCR engine:', error);
      toast({
        title: "Erro ao salvar",
        description: "Não foi possível salvar a configuração.",
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  };

  useEffect(() => {
    loadConfigs();
  }, []);

  const getEngineIcon = (engine: string) => {
    switch (engine) {
      case 'openai':
        return <Brain className="w-4 h-4" />;
      case 'google':
        return <Zap className="w-4 h-4" />;
      default:
        return <Settings2 className="w-4 h-4" />;
    }
  };

  const getEngineColor = (engine: string) => {
    switch (engine) {
      case 'openai':
        return 'bg-green-100 text-green-800';
      case 'google':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <RefreshCw className="w-8 h-8 animate-spin text-blue-500" />
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center gap-3 mb-6">
        <Settings2 className="w-8 h-8 text-blue-600" />
        <div>
          <h1 className="text-3xl font-bold">Configurações do Sistema</h1>
          <p className="text-gray-600">Gerencie as configurações globais da aplicação</p>
        </div>
      </div>

      {/* OCR Engine Configuration */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="w-5 h-5 text-purple-500" />
            Engine de OCR
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Engine Principal</p>
              <p className="text-sm text-gray-600">
                Selecione o engine padrão para processamento de faturas
              </p>
            </div>
            <Badge className={getEngineColor(ocrEngine)}>
              {getEngineIcon(ocrEngine)}
              <span className="ml-1 capitalize">{ocrEngine}</span>
            </Badge>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-3">
              <label className="text-sm font-medium">Engine OCR:</label>
              <Select value={ocrEngine} onValueChange={setOcrEngine}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="openai">
                    <div className="flex items-center gap-2">
                      <Brain className="w-4 h-4" />
                      OpenAI Vision
                    </div>
                  </SelectItem>
                  <SelectItem value="google">
                    <div className="flex items-center gap-2">
                      <Zap className="w-4 h-4" />
                      Google Vision
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-end">
              <Button 
                onClick={saveOcrEngine} 
                disabled={saving}
                className="w-full"
              >
                {saving ? (
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Save className="w-4 h-4 mr-2" />
                )}
                Salvar Configuração
              </Button>
            </div>
          </div>

          {/* Engine Comparison */}
          <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card className="border-green-200 bg-green-50">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Brain className="w-5 h-5 text-green-600" />
                  <h4 className="font-semibold text-green-800">OpenAI Vision</h4>
                </div>
                <ul className="text-sm text-green-700 space-y-1">
                  <li>• Alta precisão para documentos brasileiros</li>
                  <li>• Excelente para textos complexos</li>
                  <li>• Custo: ~$0.015 por fatura</li>
                  <li>• Tempo: 2-4 segundos</li>
                </ul>
              </CardContent>
            </Card>

            <Card className="border-blue-200 bg-blue-50">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Zap className="w-5 h-5 text-blue-600" />
                  <h4 className="font-semibold text-blue-800">Google Vision</h4>
                </div>
                <ul className="text-sm text-blue-700 space-y-1">
                  <li>• Boa performance geral</li>
                  <li>• Processamento rápido</li>
                  <li>• Custo: ~$0.005 por fatura</li>
                  <li>• Tempo: 1-2 segundos</li>
                </ul>
              </CardContent>
            </Card>
          </div>
        </CardContent>
      </Card>

      {/* Current Configurations Display */}
      <Card>
        <CardHeader>
          <CardTitle>Configurações Atuais</CardTitle>
        </CardHeader>
        <CardContent>
          {configs.length > 0 ? (
            <div className="space-y-3">
              {configs.map((config) => (
                <div key={config.key} className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <p className="font-medium capitalize">{config.key.replace('_', ' ')}</p>
                    <p className="text-sm text-gray-600">
                      Atualizado em: {new Date(config.updated_at).toLocaleString('pt-BR')}
                    </p>
                  </div>
                  <Badge variant="outline" className="capitalize">
                    {config.value}
                  </Badge>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 text-center py-4">
              Nenhuma configuração encontrada
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
