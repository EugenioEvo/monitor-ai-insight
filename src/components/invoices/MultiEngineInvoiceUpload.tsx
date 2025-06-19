import { useState, useCallback } from "react";
import { Upload, FileText, Loader2, Settings, Brain, Eye, AlertTriangle, CheckCircle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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
import { ValidationEngine } from "@/services/validationEngine";
import { ValidationResult, DEFAULT_VALIDATION_CONFIG } from "@/types/validation";
import { EnhancedValidationPanel } from "./EnhancedValidationPanel";
import { MLPipeline } from "@/services/mlPipeline";
import { MLPrediction } from "@/types/ml-pipeline";
import { MLPipelinePanel } from "./MLPipelinePanel";
import { Alert, AlertDescription } from "@/components/ui/alert";

export function MultiEngineInvoiceUpload() {
  const [uploading, setUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [processingStatus, setProcessingStatus] = useState<ProcessingStatus[]>([]);
  const [extractedData, setExtractedData] = useState<InvoiceExtractedData | null>(null);
  const [validationErrors, setValidationErrors] = useState<ValidationError[]>([]);
  const [currentStep, setCurrentStep] = useState<'upload' | 'processing' | 'review'>('upload');
  const [ocrConfig, setOcrConfig] = useState<MultiEngineOCRConfig>(DEFAULT_OCR_CONFIG);
  const [abTestResults, setAbTestResults] = useState<ABTestResult[]>([]);
  const [validationResults, setValidationResults] = useState<ValidationResult[]>([]);
  const [validationScore, setValidationScore] = useState<number>(1.0);
  const [validationStatus, setValidationStatus] = useState<'approved' | 'review_required' | 'rejected'>('approved');
  const [mlPipeline] = useState(() => new MLPipeline());
  const [validationPrediction, setValidationPrediction] = useState<MLPrediction | null>(null);
  const [anomalyPrediction, setAnomalyPrediction] = useState<MLPrediction | null>(null);
  const [modelStatus, setModelStatus] = useState<any>({});
  const [apiErrors, setApiErrors] = useState<string[]>([]);
  const { toast } = useToast();

  const handleFileUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    setUploading(true);
    setCurrentStep('processing');
    setApiErrors([]);

    try {
      const fileArray = Array.from(files);
      
      // Validate files
      for (const file of fileArray) {
        if (file.size > 10 * 1024 * 1024) {
          throw new Error(`Arquivo ${file.name} é muito grande (máximo 10MB)`);
        }
        
        if (!file.type.includes('pdf') && !file.type.includes('image')) {
          throw new Error(`Arquivo ${file.name} tem formato inválido (apenas PDF e imagens)`);
        }
      }

      const newStatuses: ProcessingStatus[] = fileArray.map((file, index) => ({
        id: `file-${Date.now()}-${index}`,
        status: 'uploaded',
        progress: 0,
        current_step: 'Validando arquivo...'
      }));

      setProcessingStatus(newStatuses);

      for (let i = 0; i < fileArray.length; i++) {
        const file = fileArray[i];
        const status = newStatuses[i];

        try {
          // Update status: uploading file
          status.progress = 10;
          status.current_step = 'Fazendo upload do arquivo...';
          status.status = 'processing';
          setProcessingStatus([...newStatuses]);

          // Upload file to Supabase Storage
          const fileName = `${Date.now()}-${file.name}`;
          const { data: uploadData, error: uploadError } = await supabase.storage
            .from('invoices')
            .upload(fileName, file);

          if (uploadError) {
            throw new Error(`Erro no upload: ${uploadError.message}`);
          }

          // Update status: processing with multi-engine OCR
          status.progress = 30;
          status.current_step = `Processando com Multi-Engine OCR...`;
          setProcessingStatus([...newStatuses]);

          // Call multi-engine OCR function
          const { data: ocrResult, error: ocrError } = await supabase.functions.invoke('multi-engine-ocr', {
            body: {
              filePath: fileName,
              fileName: file.name,
              config: ocrConfig
            }
          });

          if (ocrError) {
            console.error('OCR Error:', ocrError);
            throw new Error(`Erro no processamento OCR: ${ocrError.message}`);
          }

          if (!ocrResult.success) {
            console.error('OCR Result Error:', ocrResult);
            
            // Check for specific API errors
            if (ocrResult.error?.includes('API key')) {
              setApiErrors(prev => [...prev, `Erro de configuração de API: ${ocrResult.error}`]);
            }
            
            throw new Error(ocrResult.error || 'Erro desconhecido no processamento');
          }

          // Update status: OCR completed
          status.progress = 70;
          status.current_step = 'OCR concluído, processando dados...';
          status.confidence_score = ocrResult.confidence_score;
          status.processing_time_ms = ocrResult.processing_time_ms;
          setProcessingStatus([...newStatuses]);

          // Update status: validation
          status.progress = 90;
          status.current_step = 'Aplicando validações...';
          setProcessingStatus([...newStatuses]);

          // Set extracted data for the first file (for review)
          if (i === 0) {
            setExtractedData(ocrResult.extracted_data);
            
            // Set A/B test results if available
            if (ocrResult.ab_test_result) {
              setAbTestResults([ocrResult.ab_test_result]);
            }

            // Phase 3: Validation Engine
            status.progress = 85;
            status.current_step = 'Executando Validation Engine...';
            setProcessingStatus([...newStatuses]);

            const validationEngine = new ValidationEngine(DEFAULT_VALIDATION_CONFIG);
            
            // Mock historical context
            const mockHistoricalContext = {
              historical_invoices: [
                { energy_kwh: 1100, total_r$: 780.50 },
                { energy_kwh: 1180, total_r$: 825.30 },
                { energy_kwh: 1050, total_r$: 750.25 },
                { energy_kwh: 1220, total_r$: 890.75 },
                { energy_kwh: 1080, total_r$: 795.60 }
              ]
            };

            console.log('🔍 Running Validation Engine Phase 3...');
            const validationResults = await validationEngine.validateInvoice(
              ocrResult.extracted_data, 
              mockHistoricalContext
            );

            const overallScore = validationEngine['calculateOverallScore'](validationResults);
            const validationStatus = validationEngine.getValidationStatus(validationResults);

            setValidationResults(validationResults);
            setValidationScore(overallScore);
            setValidationStatus(validationStatus);

            // Phase 4: ML Pipeline
            status.progress = 95;
            status.current_step = 'Executando ML Pipeline...';
            setProcessingStatus([...newStatuses]);

            console.log('🤖 Running ML Pipeline Phase 4...');
            
            // Get ML predictions
            const validationPred = await mlPipeline.predictValidationResults(ocrResult.extracted_data);
            const anomalyPred = await mlPipeline.detectAnomalies(ocrResult.extracted_data, mockHistoricalContext.historical_invoices);
            
            setValidationPrediction(validationPred);
            setAnomalyPrediction(anomalyPred);
            setModelStatus(mlPipeline.getModelStatus());

            // Add training data for continuous learning
            await mlPipeline.addTrainingData(
              ocrResult.extracted_data,
              validationResults,
              { user_approved: validationStatus === 'approved' }
            );

            // Legacy validation errors for backward compatibility
            const legacyValidationErrors: ValidationError[] = validationResults.map(result => ({
              rule_id: result.rule_id,
              field_name: result.field_name || 'Unknown',
              error_type: result.error_type,
              message: result.message,
              severity: result.severity,
              suggested_fix: result.suggested_fix
            }));

            setValidationErrors(legacyValidationErrors);
            setCurrentStep('review');

            console.log(`✅ ML Pipeline completed. Validation: ${(validationPred.confidence * 100).toFixed(1)}%, Anomaly: ${(anomalyPred.confidence * 100).toFixed(1)}%`);
          }

          // Complete processing
          status.progress = 100;
          status.current_step = 'Processamento concluído com sucesso';
          status.status = 'completed';
          status.requires_review = validationStatus === 'review_required' || validationStatus === 'rejected';
          setProcessingStatus([...newStatuses]);

        } catch (fileError) {
          console.error(`Error processing file ${file.name}:`, fileError);
          status.status = 'error';
          status.error_message = fileError.message;
          setProcessingStatus([...newStatuses]);
          
          toast({
            title: "Erro no processamento",
            description: `Falha ao processar ${file.name}: ${fileError.message}`,
            variant: "destructive"
          });
        }
      }

      // Show success if any files were processed successfully
      const successCount = newStatuses.filter(s => s.status === 'completed').length;
      if (successCount > 0) {
        toast({
          title: "Processamento Concluído!",
          description: `${successCount} arquivo(s) processado(s) com sucesso.`,
        });
      }

    } catch (error) {
      console.error('Error in multi-engine upload:', error);
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
    setApiErrors([]);
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
    setApiErrors([]);
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

  const handleMLFeedback = (prediction: MLPrediction, feedback: any) => {
    console.log('📝 Received ML feedback:', feedback);
    toast({
      title: "Feedback ML registrado",
      description: "Obrigado! Seu feedback ajudará a melhorar o modelo.",
    });
  };

  if (currentStep === 'review' && extractedData) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold">Multi-Engine OCR + Validation + ML Pipeline</h2>
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
                OCR: {((extractedData.confidence_score || 0) * 100).toFixed(1)}%
              </Badge>
              <Badge className="bg-orange-100 text-orange-800">
                Validation: {(validationScore * 100).toFixed(1)}%
              </Badge>
              <Badge className="bg-purple-100 text-purple-800">
                ML: {validationPrediction ? (validationPrediction.confidence * 100).toFixed(1) + '%' : 'N/A'}
              </Badge>
              <Badge className={
                validationStatus === 'approved' ? 'bg-green-100 text-green-800' :
                validationStatus === 'rejected' ? 'bg-red-100 text-red-800' :
                'bg-yellow-100 text-yellow-800'
              }>
                {validationStatus === 'approved' ? 'Aprovado' :
                 validationStatus === 'rejected' ? 'Rejeitado' : 'Revisão'}
              </Badge>
            </div>
          </div>
          <Button variant="outline" onClick={() => setCurrentStep('upload')}>
            Voltar ao Upload
          </Button>
        </div>

        {apiErrors.length > 0 && (
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <div className="space-y-1">
                <p className="font-medium">Problemas detectados com APIs:</p>
                {apiErrors.map((error, index) => (
                  <p key={index} className="text-sm">{error}</p>
                ))}
                <p className="text-sm text-muted-foreground">
                  Configure as chaves de API na aba "Configuração OCR" para melhor performance.
                </p>
              </div>
            </AlertDescription>
          </Alert>
        )}

        <Tabs defaultValue="extracted" className="space-y-4">
          <TabsList>
            <TabsTrigger value="extracted">Dados Extraídos</TabsTrigger>
            <TabsTrigger value="validation">Validation Engine</TabsTrigger>
            <TabsTrigger value="ml">ML Pipeline</TabsTrigger>
            <TabsTrigger value="legacy">Validação Legacy</TabsTrigger>
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
              <EnhancedValidationPanel
                validationResults={validationResults}
                overallScore={validationScore}
                validationStatus={validationStatus}
                onApprove={handleApprove}
                onReject={handleReject}
                onRequestReview={handleRequestReview}
              />
            </div>
          </TabsContent>

          <TabsContent value="validation">
            <EnhancedValidationPanel
              validationResults={validationResults}
              overallScore={validationScore}
              validationStatus={validationStatus}
              onApprove={handleApprove}
              onReject={handleReject}
              onRequestReview={handleRequestReview}
            />
          </TabsContent>

          <TabsContent value="ml">
            <MLPipelinePanel
              validationPrediction={validationPrediction || undefined}
              anomalyPrediction={anomalyPrediction || undefined}
              modelStatus={modelStatus}
              onFeedback={handleMLFeedback}
            />
          </TabsContent>

          <TabsContent value="legacy">
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
      {apiErrors.length > 0 && (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <div className="space-y-1">
              <p className="font-medium">Problemas com configuração de APIs:</p>
              {apiErrors.map((error, index) => (
                <p key={index} className="text-sm">{error}</p>
              ))}
              <p className="text-sm text-muted-foreground">
                Configure as chaves de API na aba "Configuração OCR" abaixo.
              </p>
            </div>
          </AlertDescription>
        </Alert>
      )}

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
                        Sistema resiliente com fallbacks automáticos
                      </p>
                    </div>
                  </>
                ) : (
                  <>
                    <Upload className="w-12 h-12 text-gray-400 mx-auto" />
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">Upload Inteligente Multi-Engine</h3>
                      <p className="text-gray-600">
                        Sistema robusto com validação e fallbacks automáticos
                      </p>
                      <p className="text-sm text-gray-500">
                        Suporte: PDF, JPG, PNG (máx. 10MB)
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
