
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { AlertTriangle, CheckCircle, X, Eye, Brain, TrendingUp, Shield } from "lucide-react";
import { ValidationResult } from "@/types/validation";

interface EnhancedValidationPanelProps {
  validationResults: ValidationResult[];
  overallScore: number;
  validationStatus: 'approved' | 'review_required' | 'rejected';
  onApprove: () => void;
  onReject: () => void;
  onRequestReview: () => void;
}

export function EnhancedValidationPanel({ 
  validationResults, 
  overallScore,
  validationStatus,
  onApprove, 
  onReject, 
  onRequestReview 
}: EnhancedValidationPanelProps) {
  const [selectedResult, setSelectedResult] = useState<string | null>(null);
  const [filterCategory, setFilterCategory] = useState<string>('all');

  const criticalCount = validationResults.filter(r => r.severity === 'critical').length;
  const errorCount = validationResults.filter(r => r.severity === 'error').length;
  const warningCount = validationResults.filter(r => r.severity === 'warning').length;
  const anomalyCount = validationResults.filter(r => r.error_type.includes('anomaly')).length;

  const filteredResults = filterCategory === 'all' 
    ? validationResults 
    : validationResults.filter(r => {
        switch (filterCategory) {
          case 'critical': return r.severity === 'critical';
          case 'errors': return r.severity === 'error';
          case 'warnings': return r.severity === 'warning';
          case 'anomalies': return r.error_type.includes('anomaly');
          default: return true;
        }
      });

  const getStatusIcon = () => {
    switch (validationStatus) {
      case 'approved':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'rejected':
        return <X className="w-5 h-5 text-red-500" />;
      default:
        return <AlertTriangle className="w-5 h-5 text-yellow-500" />;
    }
  };

  const getStatusColor = () => {
    switch (validationStatus) {
      case 'approved': return 'text-green-600 bg-green-50';
      case 'rejected': return 'text-red-600 bg-red-50';
      default: return 'text-yellow-600 bg-yellow-50';
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 0.9) return 'text-green-600';
    if (score >= 0.7) return 'text-yellow-600';
    return 'text-red-600';
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Brain className="w-5 h-5 text-purple-500" />
          Validation Engine - Fase 3
        </CardTitle>
        
        <div className="grid grid-cols-2 gap-4 mt-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              {getStatusIcon()}
              <span className={`font-medium px-2 py-1 rounded ${getStatusColor()}`}>
                {validationStatus === 'approved' ? 'Aprovado' : 
                 validationStatus === 'rejected' ? 'Rejeitado' : 'Revisão Necessária'}
              </span>
            </div>
            
            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4 text-blue-500" />
              <span className={`font-bold ${getScoreColor(overallScore)}`}>
                Score: {(overallScore * 100).toFixed(1)}%
              </span>
            </div>
          </div>

          <div className="space-y-1">
            <Progress value={overallScore * 100} className="h-2" />
            <div className="flex justify-between text-xs text-gray-500">
              <span>Confiança da Validação</span>
              <span>{(overallScore * 100).toFixed(1)}%</span>
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        <Tabs defaultValue="results" className="space-y-4">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="results">Resultados</TabsTrigger>
            <TabsTrigger value="anomalies">Anomalias</TabsTrigger>
            <TabsTrigger value="summary">Resumo</TabsTrigger>
          </TabsList>

          <TabsContent value="results" className="space-y-4">
            <div className="flex gap-2 flex-wrap">
              <Button
                variant={filterCategory === 'all' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilterCategory('all')}
              >
                Todos ({validationResults.length})
              </Button>
              {criticalCount > 0 && (
                <Button
                  variant={filterCategory === 'critical' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setFilterCategory('critical')}
                >
                  Críticos ({criticalCount})
                </Button>
              )}
              {errorCount > 0 && (
                <Button
                  variant={filterCategory === 'errors' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setFilterCategory('errors')}
                >
                  Erros ({errorCount})
                </Button>
              )}
              {warningCount > 0 && (
                <Button
                  variant={filterCategory === 'warnings' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setFilterCategory('warnings')}
                >
                  Avisos ({warningCount})
                </Button>
              )}
              {anomalyCount > 0 && (
                <Button
                  variant={filterCategory === 'anomalies' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setFilterCategory('anomalies')}
                >
                  Anomalias ({anomalyCount})
                </Button>
              )}
            </div>

            {filteredResults.length === 0 ? (
              <div className="text-center py-8">
                <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-2" />
                <p className="text-green-600 font-medium">
                  {filterCategory === 'all' 
                    ? 'Todas as validações passaram com sucesso!' 
                    : `Nenhum resultado na categoria ${filterCategory}`}
                </p>
              </div>
            ) : (
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {filteredResults.map((result, index) => (
                  <div 
                    key={index}
                    className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                      selectedResult === `${index}` 
                        ? 'border-blue-500 bg-blue-50' 
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                    onClick={() => setSelectedResult(selectedResult === `${index}` ? null : `${index}`)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <AlertTriangle className={`w-4 h-4 ${
                          result.severity === 'critical' ? 'text-red-600' :
                          result.severity === 'error' ? 'text-red-500' : 'text-yellow-500'
                        }`} />
                        <span className="font-medium">{result.field_name || result.rule_id}</span>
                        <Badge variant={
                          result.severity === 'critical' ? 'destructive' :
                          result.severity === 'error' ? 'destructive' : 'outline'
                        }>
                          {result.severity === 'critical' ? 'Crítico' :
                           result.severity === 'error' ? 'Erro' : 'Aviso'}
                        </Badge>
                        
                        {result.anomaly_score && (
                          <Badge className="bg-purple-100 text-purple-800">
                            <TrendingUp className="w-3 h-3 mr-1" />
                            Z-Score: {result.anomaly_score.toFixed(1)}
                          </Badge>
                        )}
                      </div>
                      
                      <div className="text-sm text-gray-500">
                        {(result.confidence * 100).toFixed(0)}% confiança
                      </div>
                    </div>
                    
                    <p className="text-sm text-gray-600 mt-1">{result.message}</p>
                    
                    {selectedResult === `${index}` && (
                      <div className="mt-3 space-y-2">
                        {result.suggested_fix && (
                          <div className="p-2 bg-blue-50 border border-blue-200 rounded">
                            <p className="text-sm text-blue-800">
                              <strong>Sugestão:</strong> {result.suggested_fix}
                            </p>
                          </div>
                        )}
                        
                        {result.historical_context && (
                          <div className="p-2 bg-gray-50 border border-gray-200 rounded">
                            <p className="text-sm text-gray-600">
                              <strong>Contexto:</strong> {result.historical_context}
                            </p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="anomalies" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {validationResults
                .filter(r => r.anomaly_score)
                .map((result, index) => (
                  <Card key={index} className="p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <TrendingUp className="w-4 h-4 text-purple-500" />
                      <span className="font-medium">{result.field_name}</span>
                      <Badge className="bg-purple-100 text-purple-800">
                        Score: {result.anomaly_score?.toFixed(1)}
                      </Badge>
                    </div>
                    <p className="text-sm text-gray-600 mb-2">{result.message}</p>
                    {result.historical_context && (
                      <p className="text-xs text-gray-500">{result.historical_context}</p>
                    )}
                  </Card>
                ))}
              
              {validationResults.filter(r => r.anomaly_score).length === 0 && (
                <div className="col-span-2 text-center py-8">
                  <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-2" />
                  <p className="text-green-600 font-medium">Nenhuma anomalia detectada</p>
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="summary" className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card className="p-4 text-center">
                <div className="text-2xl font-bold text-green-600">
                  {validationResults.filter(r => r.passed).length}
                </div>
                <div className="text-sm text-gray-600">Aprovadas</div>
              </Card>
              
              <Card className="p-4 text-center">
                <div className="text-2xl font-bold text-red-600">{errorCount + criticalCount}</div>
                <div className="text-sm text-gray-600">Falhas</div>
              </Card>
              
              <Card className="p-4 text-center">
                <div className="text-2xl font-bold text-yellow-600">{warningCount}</div>
                <div className="text-sm text-gray-600">Avisos</div>
              </Card>
              
              <Card className="p-4 text-center">
                <div className="text-2xl font-bold text-purple-600">{anomalyCount}</div>
                <div className="text-sm text-gray-600">Anomalias</div>
              </Card>
            </div>

            <div className="p-4 bg-gray-50 rounded-lg">
              <h4 className="font-medium mb-2">Recomendação do Sistema</h4>
              <p className="text-sm text-gray-600">
                {validationStatus === 'approved' && 
                  'Fatura aprovada automaticamente. Todos os critérios de validação foram atendidos.'}
                {validationStatus === 'review_required' && 
                  'Revisão manual recomendada devido a inconsistências ou anomalias detectadas.'}
                {validationStatus === 'rejected' && 
                  'Fatura rejeitada devido a erros críticos. Reprocessamento necessário.'}
              </p>
            </div>
          </TabsContent>
        </Tabs>

        <div className="flex gap-2 pt-4 border-t">
          {validationStatus === 'approved' && (
            <Button onClick={onApprove} className="flex-1">
              <CheckCircle className="w-4 h-4 mr-2" />
              Confirmar Aprovação
            </Button>
          )}
          
          {validationStatus === 'review_required' && (
            <>
              <Button variant="outline" onClick={onRequestReview} className="flex-1">
                <Eye className="w-4 h-4 mr-2" />
                Solicitar Revisão
              </Button>
              <Button onClick={onApprove} className="flex-1">
                <CheckCircle className="w-4 h-4 mr-2" />
                Aprovar Mesmo Assim
              </Button>
            </>
          )}
          
          {(validationStatus === 'rejected' || validationStatus === 'review_required') && (
            <Button variant="destructive" onClick={onReject}>
              <X className="w-4 h-4 mr-2" />
              Rejeitar
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
