import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { supabase } from '@/integrations/supabase/client';
import { AlertTriangle, CheckCircle, Info, TrendingUp, FileText, Users } from 'lucide-react';
import { toast } from 'sonner';

interface InvoiceAnalysis {
  id: string;
  invoice_id: string;
  analysis_report: {
    processing_summary: {
      pages_processed: number;
      processing_time_ms: number;
      confidence_score: number;
      extraction_method: string;
    };
    raw_data: any;
    ai_analysis?: {
      executive_summary: string;
      anomalies: Array<{
        type: string;
        description: string;
        severity: 'low' | 'medium' | 'high';
      }>;
      recommendations: Array<{
        category: string;
        description: string;
        potential_savings: string;
      }>;
      consumption_insights: string;
      important_alerts: string[];
      cost_analysis: {
        total_cost: number;
        cost_breakdown: any;
        comparison_notes: string;
      };
    };
  };
  chat_report: string;
  ai_insights: any;
  anomalies_detected: any[];
  recommendations: any[];
  created_at: string;
}

export const InvoiceAnalysisViewer: React.FC = () => {
  const [analyses, setAnalyses] = useState<InvoiceAnalysis[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedAnalysis, setSelectedAnalysis] = useState<InvoiceAnalysis | null>(null);

  useEffect(() => {
    fetchAnalyses();
  }, []);

  const fetchAnalyses = async () => {
    try {
      const { data, error } = await supabase
        .from('invoice_analyses')
        .select(`
          id,
          invoice_id,  
          analysis_report,
          chat_report,
          ai_insights,
          anomalies_detected,
          recommendations,
          created_at
        `)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) {
        console.error('Error fetching analyses:', error);
        toast.error('Erro ao carregar análises de faturas');
        return;
      }

      setAnalyses((data as InvoiceAnalysis[]) || []);
      if (data && data.length > 0 && !selectedAnalysis) {
        setSelectedAnalysis(data[0] as InvoiceAnalysis);
      }
    } catch (error) {
      console.error('Error:', error);
      toast.error('Erro ao carregar análises de faturas');
    } finally {
      setLoading(false);
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'high': return 'destructive';
      case 'medium': return 'secondary';
      case 'low': return 'outline';
      default: return 'outline';
    }
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'high': return <AlertTriangle className="h-4 w-4" />;
      case 'medium': return <Info className="h-4 w-4" />;
      case 'low': return <CheckCircle className="h-4 w-4" />;
      default: return <Info className="h-4 w-4" />;
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Análises de Faturas</h2>
          <p className="text-muted-foreground">
            Visualize insights, anomalias e recomendações das faturas processadas
          </p>
        </div>
        <Badge variant="secondary" className="flex items-center gap-2">
          <FileText className="h-4 w-4" />
          {analyses.length} análises
        </Badge>
      </div>

      {analyses.length === 0 ? (
        <Alert>
          <Info className="h-4 w-4" />
          <AlertTitle>Nenhuma análise encontrada</AlertTitle>
          <AlertDescription>
            Faça upload de faturas para ver as análises geradas pelo sistema.
          </AlertDescription>
        </Alert>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Lista de análises */}
          <div className="lg:col-span-1">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Faturas Analisadas</CardTitle>
                <CardDescription>
                  Selecione uma fatura para ver a análise detalhada
                </CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <ScrollArea className="h-96">
                  {analyses.map((analysis) => (
                    <div
                      key={analysis.id}
                      className={`p-4 border-b cursor-pointer transition-colors hover:bg-muted/50 ${
                        selectedAnalysis?.id === analysis.id ? 'bg-primary/5 border-l-4 border-l-primary' : ''
                      }`}
                      onClick={() => setSelectedAnalysis(analysis)}
                    >
                      <div className="flex justify-between items-start mb-2">
                        <div className="text-sm font-medium">
                          UC: {analysis.analysis_report?.raw_data?.uc || 'N/A'}
                        </div>
                        <Badge variant="outline" className="text-xs">
                          {analysis.analysis_report?.raw_data?.referencia || 'N/A'}
                        </Badge>
                      </div>
                      <div className="text-xs text-muted-foreground space-y-1">
                        <div>Valor: R$ {analysis.analysis_report?.raw_data?.valor_total?.toFixed(2) || 'N/A'}</div>
                        <div>Consumo: {analysis.analysis_report?.raw_data?.consumo_kwh || 0} kWh</div>
                        <div>
                          Processado em: {new Date(analysis.created_at).toLocaleDateString('pt-BR')}
                        </div>
                      </div>
                    </div>
                  ))}
                </ScrollArea>
              </CardContent>
            </Card>
          </div>

          {/* Análise detalhada */}
          <div className="lg:col-span-2">
            {selectedAnalysis && (
              <Tabs defaultValue="summary" className="space-y-4">
                <TabsList className="grid w-full grid-cols-4">
                  <TabsTrigger value="summary">Resumo</TabsTrigger>
                  <TabsTrigger value="anomalies">Anomalias</TabsTrigger>
                  <TabsTrigger value="recommendations">Recomendações</TabsTrigger>
                  <TabsTrigger value="report">Relatório</TabsTrigger>
                </TabsList>

                <TabsContent value="summary">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <TrendingUp className="h-5 w-5" />
                        Resumo Executivo
                      </CardTitle>
                      <CardDescription>
                        UC: {selectedAnalysis.analysis_report?.raw_data?.uc} - {selectedAnalysis.analysis_report?.raw_data?.referencia}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {selectedAnalysis.analysis_report.ai_analysis?.executive_summary && (
                        <Alert>
                          <Info className="h-4 w-4" />
                          <AlertDescription className="whitespace-pre-wrap">
                            {selectedAnalysis.analysis_report.ai_analysis.executive_summary}
                          </AlertDescription>
                        </Alert>
                      )}

                      <div className="grid grid-cols-2 gap-4">
                        <Card>
                          <CardHeader className="pb-2">
                            <CardTitle className="text-sm">Processamento</CardTitle>
                          </CardHeader>
                          <CardContent className="space-y-2">
                            <div className="text-sm">
                              <strong>Páginas:</strong> {selectedAnalysis.analysis_report.processing_summary.pages_processed}
                            </div>
                            <div className="text-sm">
                              <strong>Tempo:</strong> {selectedAnalysis.analysis_report.processing_summary.processing_time_ms}ms
                            </div>
                            <div className="text-sm">
                              <strong>Confiança:</strong> {(selectedAnalysis.analysis_report.processing_summary.confidence_score * 100).toFixed(1)}%
                            </div>
                          </CardContent>
                        </Card>

                        {selectedAnalysis.analysis_report.ai_analysis?.cost_analysis && (
                          <Card>
                            <CardHeader className="pb-2">
                              <CardTitle className="text-sm">Análise de Custos</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-2">
                              <div className="text-sm">
                                <strong>Custo Total:</strong> R$ {selectedAnalysis.analysis_report.ai_analysis.cost_analysis.total_cost?.toFixed(2) || 'N/A'}
                              </div>
                              {selectedAnalysis.analysis_report.ai_analysis.cost_analysis.comparison_notes && (
                                <div className="text-xs text-muted-foreground">
                                  {selectedAnalysis.analysis_report.ai_analysis.cost_analysis.comparison_notes}
                                </div>
                              )}
                            </CardContent>
                          </Card>
                        )}
                      </div>

                      {selectedAnalysis.analysis_report.ai_analysis?.consumption_insights && (
                        <Card>
                          <CardHeader className="pb-2">
                            <CardTitle className="text-sm">Insights de Consumo</CardTitle>
                          </CardHeader>
                          <CardContent>
                            <p className="text-sm whitespace-pre-wrap">
                              {selectedAnalysis.analysis_report.ai_analysis.consumption_insights}
                            </p>
                          </CardContent>
                        </Card>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="anomalies">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <AlertTriangle className="h-5 w-5" />
                        Anomalias Detectadas
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      {selectedAnalysis.anomalies_detected && selectedAnalysis.anomalies_detected.length > 0 ? (
                        <div className="space-y-3">
                          {selectedAnalysis.anomalies_detected.map((anomaly, index) => (
                            <Alert key={index} variant={anomaly.severity === 'high' ? 'destructive' : 'default'}>
                              {getSeverityIcon(anomaly.severity)}
                              <AlertTitle className="flex items-center gap-2">
                                {anomaly.type}
                                <Badge variant={getSeverityColor(anomaly.severity)}>
                                  {anomaly.severity}
                                </Badge>
                              </AlertTitle>
                              <AlertDescription>{anomaly.description}</AlertDescription>
                            </Alert>
                          ))}
                        </div>
                      ) : (
                        <Alert>
                          <CheckCircle className="h-4 w-4" />
                          <AlertTitle>Nenhuma anomalia detectada</AlertTitle>
                          <AlertDescription>
                            A análise não identificou anomalias significativas nesta fatura.
                          </AlertDescription>
                        </Alert>
                      )}

                      {selectedAnalysis.analysis_report.ai_analysis?.important_alerts && 
                       selectedAnalysis.analysis_report.ai_analysis.important_alerts.length > 0 && (
                        <div className="mt-6">
                          <h4 className="text-sm font-medium mb-3">Alertas Importantes</h4>
                          <div className="space-y-2">
                            {selectedAnalysis.analysis_report.ai_analysis.important_alerts.map((alert, index) => (
                              <Alert key={index}>
                                <Info className="h-4 w-4" />
                                <AlertDescription>{alert}</AlertDescription>
                              </Alert>
                            ))}
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="recommendations">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <TrendingUp className="h-5 w-5" />
                        Recomendações
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      {selectedAnalysis.recommendations && selectedAnalysis.recommendations.length > 0 ? (
                        <div className="space-y-4">
                          {selectedAnalysis.recommendations.map((rec, index) => (
                            <Card key={index} className="border-l-4 border-l-primary">
                              <CardHeader className="pb-2">
                                <CardTitle className="text-sm">{rec.category}</CardTitle>
                              </CardHeader>
                              <CardContent className="space-y-2">
                                <p className="text-sm">{rec.description}</p>
                                {rec.potential_savings && (
                                  <Badge variant="secondary" className="text-xs">
                                    Economia potencial: {rec.potential_savings}
                                  </Badge>
                                )}
                              </CardContent>
                            </Card>
                          ))}
                        </div>
                      ) : (
                        <Alert>
                          <Info className="h-4 w-4" />
                          <AlertTitle>Nenhuma recomendação específica</AlertTitle>
                          <AlertDescription>
                            A análise não gerou recomendações específicas para esta fatura.
                          </AlertDescription>
                        </Alert>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="report">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <FileText className="h-5 w-5" />
                        Relatório do Chat
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {selectedAnalysis.chat_report && (
                        <Alert>
                          <Info className="h-4 w-4" />
                          <AlertTitle>Relatório de Processamento</AlertTitle>
                          <AlertDescription className="whitespace-pre-wrap">
                            {selectedAnalysis.chat_report}
                          </AlertDescription>
                        </Alert>
                      )}

                      <Separator />

                      <div>
                        <h4 className="text-sm font-medium mb-3">Dados Extraídos (Resumo)</h4>
                        <ScrollArea className="h-64 w-full border rounded-md p-3">
                          <pre className="text-xs">
                            {JSON.stringify(selectedAnalysis.analysis_report.raw_data, null, 2)}
                          </pre>
                        </ScrollArea>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>
            )}
          </div>
        </div>
      )}
    </div>
  );
};