import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { 
  Upload, 
  FileText, 
  Eye, 
  Brain, 
  CheckCircle, 
  AlertCircle,
  Clock,
  Zap
} from 'lucide-react';

interface ProcessingStats {
  vision_confidence: number;
  vision_processing_time_ms: number;
  gpt_processing_time_ms: number;
  total_processing_time_ms: number;
  text_length: number;
}

interface StructuredData {
  uc?: string;
  referencia?: string;
  data_emissao?: string;
  data_vencimento?: string;
  consumo_kwh?: number;
  valor_total?: number;
  cliente_nome?: string;
  distribuidora?: string;
  processing_metadata?: {
    processing_engine: string;
    timestamp: string;
  };
}

interface HybridResult {
  success: boolean;
  structured_data: StructuredData;
  raw_text: string;
  processing_stats: ProcessingStats;
}

export const HybridInvoiceUpload: React.FC = () => {
  const [uploading, setUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [result, setResult] = useState<HybridResult | null>(null);
  const { toast } = useToast();

  const validateFile = (file: File): string | null => {
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'application/pdf'];
    if (!validTypes.includes(file.type)) {
      return 'Tipo de arquivo não suportado. Use JPG, PNG ou PDF.';
    }
    
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      return 'Arquivo muito grande. Máximo 10MB.';
    }
    
    return null;
  };

  const convertFileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const base64String = reader.result as string;
        const base64Data = base64String.split(',')[1];
        resolve(base64Data);
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const processInvoice = async (file: File) => {
    try {
      setUploading(true);
      
      const validationError = validateFile(file);
      if (validationError) {
        toast({
          title: "Erro no arquivo",
          description: validationError,
          variant: "destructive"
        });
        return;
      }

      const base64Data = await convertFileToBase64(file);

      const { data, error } = await supabase.functions.invoke('hybrid-invoice-ocr', {
        body: {
          base64Data,
          fileName: file.name
        }
      });

      if (error) {
        console.error('Supabase function error:', error);
        toast({
          title: "Erro no processamento",
          description: error.message || "Erro desconhecido ao processar fatura",
          variant: "destructive"
        });
        return;
      }

      if (!data.success) {
        toast({
          title: "Falha no processamento",
          description: data.error || "Não foi possível processar a fatura",
          variant: "destructive"
        });
        return;
      }

      setResult(data);
      toast({
        title: "Fatura processada com sucesso!",
        description: `Dados extraídos em ${(data.processing_stats.total_processing_time_ms / 1000).toFixed(1)}s`,
      });

    } catch (error) {
      console.error('Error processing invoice:', error);
      toast({
        title: "Erro inesperado",
        description: "Ocorreu um erro ao processar a fatura",
        variant: "destructive"
      });
    } finally {
      setUploading(false);
    }
  };

  const handleFileUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    await processInvoice(files[0]);
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    handleFileUpload(e.dataTransfer.files);
  };

  const formatCurrency = (value: number | undefined): string => {
    if (!value) return 'N/A';
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const formatDate = (dateString: string | undefined): string => {
    if (!dateString) return 'N/A';
    try {
      return new Date(dateString).toLocaleDateString('pt-BR');
    } catch {
      return dateString;
    }
  };

  return (
    <div className="space-y-6">
      {/* Upload Area */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5 text-primary" />
            OCR Híbrido: Google Vision + ChatGPT
          </CardTitle>
          <CardDescription>
            Sistema inteligente que usa Google Vision para extração de texto e ChatGPT para análise estruturada
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div
            className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
              dragActive 
                ? 'border-primary bg-primary/5' 
                : 'border-muted-foreground/25 hover:border-muted-foreground/50'
            }`}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
          >
            <div className="space-y-4">
              <div className="flex items-center justify-center gap-2 text-muted-foreground">
                <Eye className="h-8 w-8" />
                <span className="text-2xl">+</span>
                <Brain className="h-8 w-8" />
              </div>
              
              <div>
                <p className="text-lg font-medium">
                  Arraste sua fatura aqui ou clique para selecionar
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  Suporta JPG, PNG e PDF • Máximo 10MB
                </p>
              </div>

              <div className="flex items-center justify-center gap-4 text-xs text-muted-foreground">
                <Badge variant="outline" className="gap-1">
                  <Eye className="h-3 w-3" />
                  Google Vision
                </Badge>
                <span>→</span>
                <Badge variant="outline" className="gap-1">
                  <Brain className="h-3 w-3" />
                  ChatGPT Analysis
                </Badge>
              </div>

              <Button
                onClick={() => document.getElementById('file-upload')?.click()}
                disabled={uploading}
                size="lg"
                className="mt-4"
              >
                {uploading ? (
                  <>
                    <Zap className="h-4 w-4 mr-2 animate-spin" />
                    Processando...
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4 mr-2" />
                    Selecionar Arquivo
                  </>
                )}
              </Button>

              <input
                id="file-upload"
                type="file"
                accept=".jpg,.jpeg,.png,.pdf"
                onChange={(e) => handleFileUpload(e.target.files)}
                className="hidden"
                disabled={uploading}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Results */}
      {result && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-500" />
              Resultado do Processamento
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Processing Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-primary">
                  {(result.processing_stats.vision_confidence * 100).toFixed(1)}%
                </div>
                <div className="text-xs text-muted-foreground">Confiança OCR</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold">
                  {(result.processing_stats.vision_processing_time_ms / 1000).toFixed(1)}s
                </div>
                <div className="text-xs text-muted-foreground">Google Vision</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold">
                  {(result.processing_stats.gpt_processing_time_ms / 1000).toFixed(1)}s
                </div>
                <div className="text-xs text-muted-foreground">ChatGPT</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold">
                  {result.processing_stats.text_length}
                </div>
                <div className="text-xs text-muted-foreground">Caracteres</div>
              </div>
            </div>

            <Separator />

            {/* Structured Data */}
            <div className="space-y-4">
              <h3 className="font-semibold flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Dados Estruturados Extraídos
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-3">
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">UC</label>
                    <div className="text-lg">{result.structured_data.uc || 'N/A'}</div>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Referência</label>
                    <div className="text-lg">{result.structured_data.referencia || 'N/A'}</div>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Consumo (kWh)</label>
                    <div className="text-lg">{result.structured_data.consumo_kwh || 'N/A'}</div>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Cliente</label>
                    <div className="text-lg">{result.structured_data.cliente_nome || 'N/A'}</div>
                  </div>
                </div>

                <div className="space-y-3">
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Valor Total</label>
                    <div className="text-lg font-semibold text-green-600">
                      {formatCurrency(result.structured_data.valor_total)}
                    </div>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Data de Emissão</label>
                    <div className="text-lg">{formatDate(result.structured_data.data_emissao)}</div>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Data de Vencimento</label>
                    <div className="text-lg">{formatDate(result.structured_data.data_vencimento)}</div>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Distribuidora</label>
                    <div className="text-lg">{result.structured_data.distribuidora || 'N/A'}</div>
                  </div>
                </div>
              </div>

              {/* Raw Text Preview */}
              <details className="mt-6">
                <summary className="cursor-pointer font-medium text-sm text-muted-foreground hover:text-foreground">
                  Ver texto extraído completo ({result.raw_text.length} caracteres)
                </summary>
                <ScrollArea className="h-32 mt-2 p-3 bg-muted rounded">
                  <pre className="text-xs whitespace-pre-wrap">{result.raw_text}</pre>
                </ScrollArea>
              </details>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};