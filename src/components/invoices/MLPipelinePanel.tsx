
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Brain, TrendingUp, Target, Zap, Activity, Database, AlertTriangle, CheckCircle } from "lucide-react";
import { MLPrediction } from "@/types/ml-pipeline";

interface MLPipelinePanelProps {
  validationPrediction?: MLPrediction;
  anomalyPrediction?: MLPrediction;
  modelStatus: any;
  onFeedback: (prediction: MLPrediction, feedback: any) => void;
}

export function MLPipelinePanel({
  validationPrediction,
  anomalyPrediction,
  modelStatus,
  onFeedback
}: MLPipelinePanelProps) {
  const [selectedTab, setSelectedTab] = useState('predictions');
  const [feedbackOpen, setFeedbackOpen] = useState<string | null>(null);

  const renderPredictionCard = (prediction: MLPrediction, title: string, icon: any) => (
    <Card className="h-full">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-sm">
          {icon}
          {title}
          <Badge className="ml-auto">
            v{prediction.model_version}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">Confiança</span>
          <div className="flex items-center gap-2">
            <Progress value={prediction.confidence * 100} className="w-20 h-2" />
            <span className="text-sm">{(prediction.confidence * 100).toFixed(1)}%</span>
          </div>
        </div>

        <div className="space-y-2">
          {prediction.model_id === 'validation_predictor' && (
            <>
              <div className="text-xs text-gray-600">Problemas Prováveis:</div>
              <div className="flex flex-wrap gap-1">
                {(prediction.prediction.likely_issues || []).map((issue: string) => (
                  <Badge key={issue} variant="outline" className="text-xs">
                    {issue.replace(/_/g, ' ')}
                  </Badge>
                ))}
              </div>
              
              <div className="text-xs text-gray-600 mt-2">Fatores de Risco:</div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                {Object.entries(prediction.prediction.risk_factors || {}).map(([key, value]) => (
                  <div key={key} className="flex justify-between">
                    <span className="capitalize">{key.replace(/_/g, ' ')}</span>
                    <span className={`font-medium ${
                      (value as number) > 1 ? 'text-red-600' : 'text-green-600'
                    }`}>
                      {(value as number).toFixed(2)}
                    </span>
                  </div>
                ))}
              </div>
            </>
          )}

          {prediction.model_id === 'anomaly_detector' && (
            <>
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium">Status:</span>
                {prediction.prediction.is_anomaly ? (
                  <Badge variant="destructive" className="text-xs">
                    <AlertTriangle className="w-3 h-3 mr-1" />
                    Anomalia Detectada
                  </Badge>
                ) : (
                  <Badge className="bg-green-100 text-green-800 text-xs">
                    <CheckCircle className="w-3 h-3 mr-1" />
                    Normal
                  </Badge>
                )}
              </div>

              <div className="text-xs text-gray-600">Scores de Anomalia:</div>
              <div className="space-y-1">
                {Object.entries(prediction.prediction.anomaly_scores || {}).map(([key, score]) => (
                  <div key={key} className="flex items-center justify-between">
                    <span className="text-xs capitalize">{key}</span>
                    <div className="flex items-center gap-1">
                      <Progress 
                        value={Math.min(100, (score as number) * 25)} 
                        className="w-12 h-1"
                      />
                      <span className="text-xs w-8">{(score as number).toFixed(1)}</span>
                    </div>
                  </div>
                ))}
              </div>

              <div className="text-xs text-gray-600 mt-2">Severidade:</div>
              <Badge className={`text-xs ${
                prediction.prediction.severity === 'critical' ? 'bg-red-600 text-white' :
                prediction.prediction.severity === 'high' ? 'bg-orange-500 text-white' :
                prediction.prediction.severity === 'medium' ? 'bg-yellow-500 text-white' :
                'bg-green-500 text-white'
              }`}>
                {prediction.prediction.severity}
              </Badge>
            </>
          )}
        </div>

        <div className="pt-2 border-t">
          <div className="flex justify-between text-xs text-gray-500">
            <span>Tempo: {prediction.processing_time_ms}ms</span>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setFeedbackOpen(prediction.model_id)}
              className="h-6 px-2 text-xs"
            >
              Feedback
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  const renderModelStatus = () => (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="p-4 text-center">
          <div className="text-2xl font-bold text-blue-600">
            {modelStatus.models?.length || 0}
          </div>
          <div className="text-sm text-gray-600">Modelos Ativos</div>
        </Card>
        
        <Card className="p-4 text-center">
          <div className="text-2xl font-bold text-green-600">
            {modelStatus.training_data_count || 0}
          </div>
          <div className="text-sm text-gray-600">Amostras de Treino</div>
        </Card>
        
        <Card className="p-4 text-center">
          <div className="text-2xl font-bold text-orange-600">
            {modelStatus.unused_training_samples || 0}
          </div>
          <div className="text-sm text-gray-600">Aguardando Treino</div>
        </Card>
        
        <Card className="p-4 text-center">
          <div className="text-2xl font-bold text-purple-600">
            {modelStatus.config?.min_samples_for_retrain || 0}
          </div>
          <div className="text-sm text-gray-600">Limite p/ Retreino</div>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Modelos em Produção</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {(modelStatus.models || []).map((model: any) => (
              <div key={model.id} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center gap-3">
                  <Brain className="w-4 h-4 text-blue-500" />
                  <div>
                    <div className="font-medium text-sm">{model.id}</div>
                    <div className="text-xs text-gray-500">{model.type}</div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline">{model.version}</Badge>
                  <Badge className="bg-green-100 text-green-800">Ativo</Badge>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Configuração de Aprendizado Contínuo</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="flex justify-between">
              <span>Retreino Automático:</span>
              <Badge className={modelStatus.config?.enabled ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}>
                {modelStatus.config?.enabled ? 'Ativo' : 'Inativo'}
              </Badge>
            </div>
            <div className="flex justify-between">
              <span>Split de Validação:</span>
              <span>{((modelStatus.config?.validation_split || 0) * 100).toFixed(0)}%</span>
            </div>
            <div className="flex justify-between">
              <span>Limite de Degradação:</span>
              <span>{((modelStatus.config?.performance_degradation_threshold || 0) * 100).toFixed(1)}%</span>
            </div>
            <div className="flex justify-between">
              <span>Peso do Feedback:</span>
              <span>{modelStatus.config?.feedback_weight || 1}x</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Brain className="w-5 h-5 text-purple-500" />
          ML Pipeline - Fase 4
          <Badge className="bg-purple-100 text-purple-800">Continuous Learning</Badge>
        </CardTitle>
      </CardHeader>

      <CardContent>
        <Tabs value={selectedTab} onValueChange={setSelectedTab} className="space-y-4">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="predictions">Predições</TabsTrigger>
            <TabsTrigger value="anomalies">Anomalias</TabsTrigger>
            <TabsTrigger value="models">Modelos</TabsTrigger>
          </TabsList>

          <TabsContent value="predictions" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {validationPrediction && renderPredictionCard(
                validationPrediction,
                'Preditor de Validação',
                <Target className="w-4 h-4 text-green-500" />
              )}
              
              {anomalyPrediction && renderPredictionCard(
                anomalyPrediction,
                'Detector de Anomalias',
                <TrendingUp className="w-4 h-4 text-red-500" />
              )}
            </div>

            {(!validationPrediction && !anomalyPrediction) && (
              <div className="text-center py-8">
                <Brain className="w-12 h-12 text-gray-400 mx-auto mb-2" />
                <p className="text-gray-600">Nenhuma predição ML disponível</p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="anomalies" className="space-y-4">
            {anomalyPrediction ? (
              <div className="space-y-4">
                <Card className="p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Activity className="w-4 h-4 text-purple-500" />
                    <span className="font-medium">Análise de Anomalias Detalhada</span>
                  </div>
                  
                  <div className="space-y-3">
                    <div>
                      <span className="text-sm font-medium">Tipos de Anomalia Detectados:</span>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {(anomalyPrediction.prediction.anomaly_types || []).map((type: string) => (
                          <Badge key={type} variant="outline" className="text-xs">
                            {type.replace(/_/g, ' ')}
                          </Badge>
                        ))}
                      </div>
                    </div>

                    <div>
                      <span className="text-sm font-medium">Explicação:</span>
                      <p className="text-sm text-gray-600 mt-1">
                        {anomalyPrediction.prediction.explanation}
                      </p>
                    </div>
                  </div>
                </Card>
              </div>
            ) : (
              <div className="text-center py-8">
                <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-2" />
                <p className="text-green-600 font-medium">Nenhuma anomalia detectada pelo ML</p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="models">
            {renderModelStatus()}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
