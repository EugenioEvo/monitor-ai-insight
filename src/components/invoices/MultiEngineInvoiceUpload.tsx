import { useState, useCallback } from "react";
import { Upload, FileText, Loader2, CheckCircle, AlertCircle, Settings, Brain } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { InvoiceProcessingStatus } from "./InvoiceProcessingStatus";
import { InvoiceDataExtractor } from "./InvoiceDataExtractor";
import { InvoiceValidationPanel } from "./InvoiceValidationPanel";
import { OCREngineSelector } from "./OCREngineSelector";
import { InvoiceExtractedData, InvoiceProcessingStatus as ProcessingStatus, ValidationError } from "@/types/invoice";
import { MultiEngineOCRConfig, DEFAULT_OCR_CONFIG, ABTestResult } from "@/types/ocr-engines";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";

export function MultiEngineInvoiceUpload() {
  const [uploading, setUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [processingStatus, setProcessingStatus] = useState<ProcessingStatus[]>([]);
  const [extractedData, setExtractedData] = useState<InvoiceExtractedData | null>(null);
  const [validationErrors, setValidationErrors] = useState<ValidationError[]>([]);
  const [currentStep, setCurrentStep] = useState<'upload' | 'processing' | 'review'>('upload');
  const [ocrConfig, setOcrConfig] = useState<MultiEngineOCRConfig>(DEFAULT_OCR_CONFIG);
  const [abTestResults, setAbTestResults] = useState<ABTestResult[]>([]);
  const { toast } = useToast();

  const simulateMultiEngineProcessing = async (files: FileList) => {
    const fileArray = Array.from(files);
    const newStatuses: ProcessingStatus[] = fileArray.map((file, index) => ({
      id: `file-${Date.now()}-${index}`,
      status: 'uploaded',
      progress: 0,
      current_step: 'Iniciando processamento multi-engine...'
    }));

    setProcessingStatus(newStatuses);
    setCurrentStep('processing');

    for (let i = 0; i < newStatuses.length; i++) {
      const status = newStatuses[i];
      
      // Simulação de etapas de processamento multi-engine
      const steps = [
        { progress: 5, step: 'Analisando formato do arquivo...', status: 'processing' as const },
        { progress: 15, step: 'Carregando arquivo para processamento...', status: 'processing' as const },
        { progress: 25, step: `Executando OCR primário (${ocrConfig.primary_engine.toUpperCase()})...`, status: 'processing' as const },
        { progress: 40, step: ocrConfig.ab_testing_enabled ? 'Executando A/B Test com engine secundário...' : 'Processando com engine principal...', status: 'processing' as const },
        { progress: 55, step: 'Comparando resultados dos engines...', status: 'extracted' as const },
        { progress: 70, step: 'Extraindo 50+ campos estruturados...', status: 'extracted' as const },
        { progress: 85, step: 'Aplicando validações multi-engine...', status: 'validated' as const },
        { progress: 100, step: 'Processamento multi-engine concluído', status: 'completed' as const }
      ];

      for (const stepData of steps) {
        await new Promise(resolve => setTimeout(resolve, 800));
        
        status.progress = stepData.progress;
        status.current_step = stepData.step;
        status.status = stepData.status;
        
        if (stepData.progress === 40) {
          status.confidence_score = 0.88 + Math.random() * 0.1;
        }
        
        if (stepData.progress === 70) {
          status.processing_time_ms = 2000 + Math.random() * 1500;
        }

        setProcessingStatus([...newStatuses]);
      }

      // Simular dados extraídos com informações multi-engine
      if (i === 0) {
        const mockExtractedData: InvoiceExtractedData = {
          // Dados básicos
          uc_code: '1234567890',
          reference_month: '2024-12',
          energy_kwh: 1250.5,
          demand_kw: 25.8,
          total_r$: 890.45,
          taxes_r$: 178.09,
          
          // Dados expandidos
          subgrupo_tensao: 'A4',
          consumo_fp_te_kwh: 950.3,
          consumo_p_te_kwh: 300.2,
          demanda_tusd_kw: 22.5,
          demanda_te_kw: 25.8,
          icms_valor: 125.67,
          icms_aliquota: 18,
          pis_valor: 12.45,
          pis_aliquota: 1.65,
          cofins_valor: 39.97,
          cofins_aliquota: 7.6,
          bandeira_tipo: 'Verde',
          bandeira_valor: 0,
          data_leitura: '2024-11-28',
          data_emissao: '2024-12-05',
          data_vencimento: '2024-12-20',
          leitura_atual: 145678.5,
          leitura_anterior: 144428.0,
          multiplicador: 1.0,
          tarifa_te_tusd: 0.15847,
          tarifa_te_te: 0.31205,
          tarifa_demanda_tusd: 12.85,
          tarifa_demanda_te: 25.47,
          valor_tusd: 198.75,
          valor_te: 390.32,
          valor_demanda_tusd: 289.13,
          valor_demanda_te: 657.12,
          energia_injetada_kwh: 856.2,
          energia_compensada_kwh: 856.2,
          saldo_creditos_kwh: 125.5,
          contrib_ilum_publica: 15.45,
          issqn_valor: 0,
          outras_taxas: 8.75,
          classe_subclasse: 'Comercial - Outros Serviços',
          modalidade_tarifaria: 'Convencional B3',
          fator_potencia: 0.92,
          dias_faturamento: 30,
          
          // Metadados multi-engine
          confidence_score: status.confidence_score,
          extraction_method: ocrConfig.primary_engine,
          requires_review: status.confidence_score < ocrConfig.confidence_threshold,
          processing_time_ms: status.processing_time_ms,
          observacoes: `Processado com ${ocrConfig.primary_engine.toUpperCase()}${ocrConfig.ab_testing_enabled ? ' + A/B Test' : ''}`,
          codigo_barras: '84890000001234567890123456789012345678901234',
          linha_digitavel: '84890.00000 01234.567890 12345.678901 2 34567890123456'
        };

        setExtractedData(mockExtractedData);

        // Simular A/B test result se habilitado
        if (ocrConfig.ab_testing_enabled) {
          const mockABResult: ABTestResult = {
            test_id: `ab-${Date.now()}`,
            engine_a: ocrConfig.primary_engine,
            engine_b: ocrConfig.fallback_engines[0] || 'google_vision',
            file_id: status.id,
            result_a: {
              engine: ocrConfig.primary_engine,
              text: 'Mock OCR result A',
              confidence_score: status.confidence_score!,
              processing_time_ms: 3200,
              cost_estimate: 0.015
            },
            result_b: {
              engine: ocrConfig.fallback_engines[0] || 'google_vision',
              text: 'Mock OCR result B',
              confidence_score: status.confidence_score! - 0.02,
              processing_time_ms: 2100,
              cost_estimate: 0.005
            },
            winner: 'a',
            criteria: 'confidence_score',
            timestamp: new Date().toISOString()
          };
          setAbTestResults([mockABResult]);
        }

        // Validações específicas para multi-engine
        const mockValidationErrors: ValidationError[] = [];
        
        if (mockExtractedData.confidence_score < ocrConfig.confidence_threshold) {
          mockValidationErrors.push({
            rule_id: 'multi-engine-confidence',
            field_name: 'Confiança Multi-Engine',
            error_type: 'low_confidence',
            message: `Confiança abaixo do limite configurado (${(ocrConfig.confidence_threshold * 100).toFixed(0)}%)`,
            severity: 'warning',
            suggested_fix: 'Considerar processar com engine alternativo ou revisão manual'
          });
        }

        setValidationErrors(mockValidationErrors);
        setCurrentStep('review');
      }
    }

    toast({
      title: "Processamento Multi-Engine Concluído!",
      description: `${files.length} arquivo(s) processado(s) com ${ocrConfig.primary_engine.toUpperCase()}${ocrConfig.ab_testing_enabled ? ' + A/B Testing' : ''}.`,
    });
  };

  const handleFileUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    setUploading(true);
    await simulateMultiEngineProcessing(files);
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
    setAbTestResults([]);
  };

  const handleReject = () => {
    toast({
      title: "Dados rejeitados",
      description: "A fatura será reprocessada com engine alternativo.",
      variant: "destructive"
    });
    setCurrentStep('upload');
    setExtractedData(null);
    setProcessingStatus([]);
    setAbTestResults([]);
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
          <div>
            <h2 className="text-2xl font-bold">Revisão Multi-Engine OCR</h2>
            <div className="flex items-center gap-2 mt-1">
              <Badge className="bg-purple-100 text-purple-800">
                Engine: {extractedData.extraction_method?.toUpperCase()}
              </Badge>
              {abTestResults.length > 0 && (
                <Badge className="bg-blue-100 text-blue-800">
                  A/B Test Executado
                </Badge>
              )}
              <Badge className="bg-green-100 text-green-800">
                Confiança: {((extractedData.confidence_score || 0) * 100).toFixed(1)}%
              </Badge>
            </div>
          </div>
          <Button variant="outline" onClick={() => setCurrentStep('upload')}>
            Voltar ao Upload
          </Button>
        </div>

        <Tabs defaultValue="extracted" className="space-y-4">
          <TabsList>
            <TabsTrigger value="extracted">Dados Extraídos</TabsTrigger>
            <TabsTrigger value="validation">Validação</TabsTrigger>
            {abTestResults.length > 0 && (
              <TabsTrigger value="abtest">A/B Test Results</TabsTrigger>
            )}
          </TabsList>

          <TabsContent value="extracted" className="grid grid-cols-1 lg:grid-cols-3 gap-6">
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
          </TabsContent>

          <TabsContent value="validation">
            <InvoiceValidationPanel
              validationErrors={validationErrors}
              onApprove={handleApprove}
              onReject={handleReject}
              onRequestReview={handleRequestReview}
            />
          </TabsContent>

          {abTestResults.length > 0 && (
            <TabsContent value="abtest">
              <Card>
                <CardContent className="p-6">
                  <h3 className="text-lg font-semibold mb-4">Resultados do A/B Test</h3>
                  {abTestResults.map(result => (
                    <div key={result.test_id} className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="p-4 border rounded-lg">
                          <h4 className="font-medium">Engine A: {result.engine_a.toUpperCase()}</h4>
                          <div className="mt-2 space-y-1 text-sm">
                            <p>Confiança: {(result.result_a.confidence_score * 100).toFixed(1)}%</p>
                            <p>Tempo: {result.result_a.processing_time_ms}ms</p>
                            <p>Custo: ${result.result_a.cost_estimate.toFixed(3)}</p>
                          </div>
                        </div>
                        
                        <div className="p-4 border rounded-lg">
                          <h4 className="font-medium">Engine B: {result.engine_b.toUpperCase()}</h4>
                          <div className="mt-2 space-y-1 text-sm">
                            <p>Confiança: {(result.result_b.confidence_score * 100).toFixed(1)}%</p>
                            <p>Tempo: {result.result_b.processing_time_ms}ms</p>
                            <p>Custo: ${result.result_b.cost_estimate.toFixed(3)}</p>
                          </div>
                        </div>
                      </div>
                      
                      <div className="text-center">
                        <Badge className={result.winner === 'a' ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'}>
                          Vencedor: Engine {result.winner.toUpperCase()} ({result.criteria})
                        </Badge>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </TabsContent>
          )}
        </Tabs>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Tabs defaultValue="upload" className="space-y-6">
        <TabsList>
          <TabsTrigger value="upload">Upload</TabsTrigger>
          <TabsTrigger value="config">Configuração OCR</TabsTrigger>
        </TabsList>

        <TabsContent value="upload" className="space-y-6">
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
                      <h3 className="text-lg font-semibold text-gray-900">Processando com Multi-Engine OCR...</h3>
                      <p className="text-gray-600">
                        {ocrConfig.primary_engine.toUpperCase()} + 
                        {ocrConfig.ab_testing_enabled ? ' A/B Testing' : ' Fallback Engines'}
                      </p>
                    </div>
                  </>
                ) : (
                  <>
                    <Upload className="w-12 h-12 text-gray-400 mx-auto" />
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">Upload Inteligente Multi-Engine</h3>
                      <p className="text-gray-600">
                        Sistema avançado com {ocrConfig.primary_engine.toUpperCase()} + 
                        {ocrConfig.ab_testing_enabled ? ' A/B Testing' : ' Engines de Fallback'}
                      </p>
                    </div>
                    <div className="flex gap-2 justify-center">
                      <Button
                        onClick={() => document.getElementById('file-upload')?.click()}
                        className="bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600"
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
        </TabsContent>

        <TabsContent value="config">
          <OCREngineSelector 
            config={ocrConfig}
            onConfigChange={setOcrConfig}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
