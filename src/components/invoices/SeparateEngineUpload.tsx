
import { useState, useCallback } from "react";
import { Upload, FileText, Loader2, Brain, Zap } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { logger } from "@/services/logger";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export function SeparateEngineUpload() {
  const [uploading, setUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [selectedEngine, setSelectedEngine] = useState<'openai' | 'google'>('openai');
  const [lastResult, setLastResult] = useState<any>(null);
  const { toast } = useToast();

  const handleFileUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    setUploading(true);
    
    try {
      const file = files[0];
      
      // Validate file
      if (file.size > 10 * 1024 * 1024) {
        throw new Error('Arquivo muito grande (máximo 10MB)');
      }
      
      if (!file.type.includes('pdf') && !file.type.includes('image')) {
        throw new Error('Formato inválido (apenas PDF e imagens)');
      }

      // Convert to base64
      const arrayBuffer = await file.arrayBuffer();
      const base64 = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));
      
      logger.info('Processing file with OCR engine', {
        component: 'SeparateEngineUpload',
        engine: selectedEngine.toUpperCase(),
        fileName: file.name,
        fileSize: file.size
      });

      // Call the selected OCR engine
      const functionName = selectedEngine === 'openai' ? 'openai-vision-ocr' : 'google-vision-ocr';
      
      const { data: ocrResult, error: ocrError } = await supabase.functions.invoke(functionName, {
        body: {
          base64Data: base64,
          fileName: file.name
        }
      });

      if (ocrError) {
        console.error(`[${selectedEngine.toUpperCase()} OCR] Error:`, ocrError);
        throw new Error(`Erro no processamento ${selectedEngine.toUpperCase()}: ${ocrError.message}`);
      }

      if (!ocrResult || !ocrResult.success) {
        console.error(`[${selectedEngine.toUpperCase()} OCR] Result Error:`, ocrResult);
        throw new Error(ocrResult?.error || 'Erro desconhecido no processamento');
      }

      setLastResult(ocrResult);

      toast({
        title: "OCR concluído!",
        description: `Arquivo processado com ${selectedEngine.toUpperCase()} - Confiança: ${(ocrResult.confidence_score * 100).toFixed(1)}%`,
      });

    } catch (error) {
      console.error(`[${selectedEngine.toUpperCase()} OCR] Error:`, error);
      toast({
        title: "Erro no processamento",
        description: error.message || "Ocorreu um erro durante o processamento.",
        variant: "destructive"
      });
    } finally {
      setUploading(false);
    }
  };

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    handleFileUpload(e.dataTransfer.files);
  }, [selectedEngine]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">OCR Engines Separados</h2>
          <p className="text-gray-600">Teste individual dos engines OpenAI e Google Vision</p>
        </div>
        
        <div className="flex items-center gap-4">
          <label className="text-sm font-medium">Engine:</label>
          <Select value={selectedEngine} onValueChange={(value: 'openai' | 'google') => setSelectedEngine(value)}>
            <SelectTrigger className="w-40">
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
      </div>

      <Card className="border-2 border-dashed border-gray-300 hover:border-blue-400 transition-colors">
        <CardContent className="p-8">
          <div
            className={`text-center space-y-4 ${dragActive ? 'bg-blue-50' : ''} rounded-lg p-6 transition-colors`}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
          >
            {uploading ? (
              <>
                <Loader2 className="w-12 h-12 text-blue-500 mx-auto animate-spin" />
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">
                    Processando com {selectedEngine.toUpperCase()}...
                  </h3>
                  <p className="text-gray-600">Extraindo texto da fatura</p>
                </div>
              </>
            ) : (
              <>
                <Upload className="w-12 h-12 text-gray-400 mx-auto" />
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Upload para {selectedEngine.toUpperCase()}</h3>
                  <p className="text-gray-600">
                    Teste individual do engine {selectedEngine === 'openai' ? 'OpenAI Vision' : 'Google Vision'}
                  </p>
                </div>
                <div className="flex gap-2 justify-center">
                  <Button
                    onClick={() => document.getElementById('engine-file-upload')?.click()}
                    className={selectedEngine === 'openai' ? 
                      'bg-gradient-to-r from-green-500 to-blue-500 hover:from-green-600 hover:to-blue-600' :
                      'bg-gradient-to-r from-red-500 to-yellow-500 hover:from-red-600 hover:to-yellow-600'
                    }
                  >
                    <FileText className="w-4 h-4 mr-2" />
                    Processar com {selectedEngine.toUpperCase()}
                  </Button>
                </div>
                <input
                  id="engine-file-upload"
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png"
                  className="hidden"
                  onChange={(e) => handleFileUpload(e.target.files)}
                />
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {lastResult && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Badge className={lastResult.engine === 'openai' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}>
                {lastResult.engine.toUpperCase()}
              </Badge>
              Resultado do OCR
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <div className="text-center">
                  <p className="text-sm text-gray-600">Confiança</p>
                  <p className="text-lg font-bold text-green-600">
                    {(lastResult.confidence_score * 100).toFixed(1)}%
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-sm text-gray-600">Tempo</p>
                  <p className="text-lg font-bold text-blue-600">
                    {lastResult.processing_time_ms}ms
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-sm text-gray-600">Custo</p>
                  <p className="text-lg font-bold text-purple-600">
                    ${lastResult.cost_estimate.toFixed(3)}
                  </p>
                </div>
              </div>
              
              <div>
                <p className="text-sm font-medium text-gray-700 mb-2">Texto Extraído:</p>
                <div className="bg-gray-50 p-4 rounded-lg max-h-40 overflow-y-auto">
                  <pre className="text-xs whitespace-pre-wrap">{lastResult.text}</pre>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
