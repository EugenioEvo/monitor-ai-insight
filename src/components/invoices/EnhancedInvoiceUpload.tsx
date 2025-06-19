import { useState, useCallback } from "react";
import { Upload, FileText, Loader2, CheckCircle, AlertCircle, Eye } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { InvoiceProcessingStatus } from "./InvoiceProcessingStatus";
import { InvoiceDataExtractor } from "./InvoiceDataExtractor";
import { InvoiceValidationPanel } from "./InvoiceValidationPanel";
import { InvoiceExtractedData, InvoiceProcessingStatus as ProcessingStatus, ValidationError } from "@/types/invoice";

export function EnhancedInvoiceUpload() {
  const [uploading, setUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [processingStatus, setProcessingStatus] = useState<ProcessingStatus[]>([]);
  const [extractedData, setExtractedData] = useState<InvoiceExtractedData | null>(null);
  const [validationErrors, setValidationErrors] = useState<ValidationError[]>([]);
  const [currentStep, setCurrentStep] = useState<'upload' | 'processing' | 'review'>('upload');
  const { toast } = useToast();

  const simulateAdvancedProcessing = async (files: FileList) => {
    const fileArray = Array.from(files);
    const newStatuses: ProcessingStatus[] = fileArray.map((file, index) => ({
      id: `file-${Date.now()}-${index}`,
      status: 'uploaded',
      progress: 0,
      current_step: 'Iniciando processamento...'
    }));

    setProcessingStatus(newStatuses);
    setCurrentStep('processing');

    for (let i = 0; i < newStatuses.length; i++) {
      const status = newStatuses[i];
      
      // Simulação de etapas de processamento expandidas
      const steps = [
        { progress: 5, step: 'Analisando formato do arquivo...', status: 'processing' as const },
        { progress: 15, step: 'Detectando layout da fatura...', status: 'processing' as const },
        { progress: 25, step: 'Executando OCR primário (OpenAI Vision)...', status: 'processing' as const },
        { progress: 40, step: 'Processando com IA (GPT-4o)...', status: 'processing' as const },
        { progress: 55, step: 'Extraindo 50+ campos estruturados...', status: 'extracted' as const },
        { progress: 70, step: 'Aplicando validações de negócio...', status: 'validated' as const },
        { progress: 85, step: 'Verificando consistência dos dados...', status: 'validated' as const },
        { progress: 100, step: 'Processamento concluído', status: 'completed' as const }
      ];

      for (const stepData of steps) {
        await new Promise(resolve => setTimeout(resolve, 800));
        
        status.progress = stepData.progress;
        status.current_step = stepData.step;
        status.status = stepData.status;
        
        if (stepData.progress === 40) {
          status.confidence_score = 0.85 + Math.random() * 0.12;
        }
        
        if (stepData.progress === 70) {
          status.processing_time_ms = 2500 + Math.random() * 2000;
        }

        setProcessingStatus([...newStatuses]);
      }

      // Simular dados extraídos expandidos para o primeiro arquivo
      if (i === 0) {
        const mockExtractedData: InvoiceExtractedData = {
          // Dados básicos
          uc_code: '1234567890',
          reference_month: '2024-12',
          energy_kwh: 1250.5,
          demand_kw: 25.8,
          total_r$: 890.45,
          taxes_r$: 178.09,
          
          // Dados expandidos do glossário
          subgrupo_tensao: 'A4',
          consumo_fp_te_kwh: 950.3,
          consumo_p_te_kwh: 300.2,
          demanda_tusd_kw: 22.5,
          demanda_te_kw: 25.8,
          
          // Tributos detalhados
          icms_valor: 125.67,
          icms_aliquota: 18,
          pis_valor: 12.45,
          pis_aliquota: 1.65,
          cofins_valor: 39.97,
          cofins_aliquota: 7.6,
          
          // Bandeira tarifária
          bandeira_tipo: 'Verde',
          bandeira_valor: 0,
          
          // Datas
          data_leitura: '2024-11-28',
          data_emissao: '2024-12-05',
          data_vencimento: '2024-12-20',
          
          // Leituras
          leitura_atual: 145678.5,
          leitura_anterior: 144428.0,
          multiplicador: 1.0,
          
          // Tarifas
          tarifa_te_tusd: 0.15847,
          tarifa_te_te: 0.31205,
          tarifa_demanda_tusd: 12.85,
          tarifa_demanda_te: 25.47,
          
          // Valores calculados
          valor_tusd: 198.75,
          valor_te: 390.32,
          valor_demanda_tusd: 289.13,
          valor_demanda_te: 657.12,
          
          // Compensação
          energia_injetada_kwh: 856.2,
          energia_compensada_kwh: 856.2,
          saldo_creditos_kwh: 125.5,
          
          // Taxas adicionais
          contrib_ilum_publica: 15.45,
          issqn_valor: 0,
          outras_taxas: 8.75,
          
          // Classificação
          classe_subclasse: 'Comercial - Outros Serviços',
          modalidade_tarifaria: 'Convencional B3',
          fator_potencia: 0.92,
          dias_faturamento: 30,
          
          // Metadados
          confidence_score: status.confidence_score,
          extraction_method: 'openai',
          requires_review: status.confidence_score < 0.9,
          processing_time_ms: status.processing_time_ms,
          
          // Informações complementares
          observacoes: 'Fatura com compensação de energia elétrica aplicada',
          codigo_barras: '84890000001234567890123456789012345678901234',
          linha_digitavel: '84890.00000 01234.567890 12345.678901 2 34567890123456'
        };

        setExtractedData(mockExtractedData);

        // Simular validações expandidas
        const mockValidationErrors: ValidationError[] = [];
        
        if (mockExtractedData.confidence_score < 0.9) {
          mockValidationErrors.push({
            rule_id: 'confidence-check',
            field_name: 'Confiança Geral',
            error_type: 'low_confidence',
            message: 'Confiança da extração abaixo do limite recomendado (90%)',
            severity: 'warning',
            suggested_fix: 'Revisar manualmente os campos extraídos'
          });
        }

        // Validação de cross-field arithmetic
        const calculatedTotal = (mockExtractedData.valor_tusd || 0) + 
                               (mockExtractedData.valor_te || 0) + 
                               (mockExtractedData.valor_demanda_tusd || 0) + 
                               (mockExtractedData.valor_demanda_te || 0) +
                               (mockExtractedData.icms_valor || 0) +
                               (mockExtractedData.pis_valor || 0) +
                               (mockExtractedData.cofins_valor || 0);
        
        if (Math.abs(calculatedTotal - mockExtractedData.total_r$) > 10) {
          mockValidationErrors.push({
            rule_id: 'total-calculation',
            field_name: 'Valor Total',
            error_type: 'arithmetic_inconsistency',
            message: `Valor total informado (R$ ${mockExtractedData.total_r$.toFixed(2)}) difere do calculado (R$ ${calculatedTotal.toFixed(2)})`,
            severity: 'error',
            suggested_fix: 'Verificar cálculo dos componentes da fatura'
          });
        }

        setValidationErrors(mockValidationErrors);
        setCurrentStep('review');
      }
    }

    toast({
      title: "Processamento concluído!",
      description: `${files.length} arquivo(s) processado(s) com IA avançada e 50+ campos extraídos.`,
    });
  };

  const handleFileUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    setUploading(true);
    await simulateAdvancedProcessing(files);
    setUploading(false);
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
  }, []);

  const handleApprove = () => {
    toast({
      title: "Dados aprovados!",
      description: "Os dados extraídos foram salvos no sistema.",
    });
    setCurrentStep('upload');
    setExtractedData(null);
    setProcessingStatus([]);
  };

  const handleReject = () => {
    toast({
      title: "Dados rejeitados",
      description: "A fatura será reprocessada ou removida.",
      variant: "destructive"
    });
    setCurrentStep('upload');
    setExtractedData(null);
    setProcessingStatus([]);
  };

  const handleRequestReview = () => {
    toast({
      title: "Revisão solicitada",
      description: "A fatura foi encaminhada para revisão manual.",
    });
  };

  const handleSaveExtractedData = (data: InvoiceExtractedData) => {
    setExtractedData(data);
    toast({
      title: "Dados atualizados",
      description: "As alterações foram salvas.",
    });
  };

  if (currentStep === 'review' && extractedData) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold">Revisão de Dados Extraídos - 50+ Campos</h2>
          <Button variant="outline" onClick={() => setCurrentStep('upload')}>
            Voltar ao Upload
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <InvoiceDataExtractor
              extractedData={extractedData}
              onSave={handleSaveExtractedData}
            />
          </div>
          
          <div className="space-y-4">
            <InvoiceValidationPanel
              validationErrors={validationErrors}
              onApprove={handleApprove}
              onReject={handleReject}
              onRequestReview={handleRequestReview}
            />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
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
                  <h3 className="text-lg font-semibold text-gray-900">Processando com IA Avançada...</h3>
                  <p className="text-gray-600">OCR multi-engine + extração de 50+ campos + validação automática</p>
                </div>
              </>
            ) : (
              <>
                <Upload className="w-12 h-12 text-gray-400 mx-auto" />
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Upload Inteligente de Faturas</h3>
                  <p className="text-gray-600">Sistema expandido - 50+ campos do glossário + validação completa</p>
                </div>
                <div className="flex gap-2 justify-center">
                  <Button
                    onClick={() => document.getElementById('file-upload')?.click()}
                    className="bg-gradient-to-r from-blue-500 to-green-500 hover:from-blue-600 hover:to-green-600"
                  >
                    <FileText className="w-4 h-4 mr-2" />
                    Selecionar Arquivos
                  </Button>
                </div>
                <input
                  id="file-upload"
                  type="file"
                  multiple
                  accept=".pdf,.jpg,.jpeg,.png,.zip"
                  className="hidden"
                  onChange={(e) => handleFileUpload(e.target.files)}
                />
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {processingStatus.length > 0 && (
        <InvoiceProcessingStatus processingStatus={processingStatus} />
      )}
    </div>
  );
}
