import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Lightbulb, AlertTriangle, Calendar, TrendingUp, CheckCircle, Clock } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";

interface Recommendation {
  id: string;
  equipment_id: string;
  equipment_type: string;
  risk_level: 'low' | 'medium' | 'high' | 'critical';
  failure_probability: number;
  recommended_action: string;
  predicted_failure_date?: string;
  confidence_percent: number;
  factors: any;
}

export function MaintenanceRecommendations({ plantId }: { plantId?: string }) {
  const { toast } = useToast();
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const { data: recommendations, isLoading, refetch } = useQuery({
    queryKey: ['maintenance-recommendations', plantId],
    queryFn: async (): Promise<Recommendation[]> => {
      let query = supabase
        .from('predictive_maintenance_scores')
        .select('*')
        .order('failure_probability', { ascending: false })
        .limit(10);

      if (plantId) {
        query = query.eq('plant_id', plantId);
      }

      const { data, error } = await query;

      if (error) throw error;
      return (data || []) as Recommendation[];
    },
    staleTime: 5 * 60 * 1000,
  });

  const runAnalysis = async () => {
    setIsAnalyzing(true);
    try {
      const { data, error } = await supabase.functions.invoke('predictive-maintenance', {
        body: { plant_id: plantId }
      });

      if (error) throw error;

      toast({
        title: "Análise Preditiva Concluída",
        description: `${data?.predictions?.length || 0} predições geradas com IA`,
      });

      refetch();
    } catch (error) {
      console.error('Analysis error:', error);
      toast({
        title: "Erro na Análise",
        description: error instanceof Error ? error.message : "Erro desconhecido",
        variant: "destructive"
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  const createTicket = async (rec: Recommendation) => {
    try {
      const { error } = await supabase.functions.invoke('create-ticket', {
        body: {
          plant_id: plantId,
          title: `Manutenção Preditiva: ${rec.equipment_type}`,
          description: `${rec.recommended_action}\n\nProbabilidade de falha: ${(rec.failure_probability * 100).toFixed(0)}%\nConfiança: ${rec.confidence_percent}%`,
          priority: rec.risk_level === 'critical' ? 'urgent' : rec.risk_level === 'high' ? 'high' : 'medium',
          type: 'maintenance'
        }
      });

      if (error) throw error;

      toast({
        title: "Ticket Criado",
        description: "Ticket de manutenção criado com sucesso"
      });
    } catch (error) {
      toast({
        title: "Erro ao Criar Ticket",
        description: error instanceof Error ? error.message : "Erro desconhecido",
        variant: "destructive"
      });
    }
  };

  const getRiskColor = (level: string) => {
    switch (level) {
      case 'critical': return 'bg-destructive text-destructive-foreground';
      case 'high': return 'bg-warning text-warning-foreground';
      case 'medium': return 'bg-info text-info-foreground';
      default: return 'bg-success text-success-foreground';
    }
  };

  const getRiskIcon = (level: string) => {
    switch (level) {
      case 'critical': return '🚨';
      case 'high': return '⚠️';
      case 'medium': return '⚡';
      default: return '✅';
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lightbulb className="w-5 h-5" />
            Recomendações Inteligentes
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-40">
            <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="hover:shadow-lg transition-all duration-300">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-info to-info/80 rounded-xl flex items-center justify-center shadow-lg">
              <Lightbulb className="w-5 h-5 text-info-foreground" />
            </div>
            <div>
              <CardTitle className="text-xl flex items-center gap-2">
                🤖 Recomendações Inteligentes
              </CardTitle>
              <CardDescription>Baseadas em Machine Learning</CardDescription>
            </div>
          </div>
          <Button
            onClick={runAnalysis}
            disabled={isAnalyzing}
            className="gap-2"
          >
            {isAnalyzing ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Analisando...
              </>
            ) : (
              <>
                <TrendingUp className="w-4 h-4" />
                Executar Análise
              </>
            )}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[500px] pr-4">
          <div className="space-y-3">
            {recommendations && recommendations.length > 0 ? (
              recommendations.map((rec) => (
                <Card key={rec.id} className={`border-l-4 ${
                  rec.risk_level === 'critical' ? 'border-l-destructive' :
                  rec.risk_level === 'high' ? 'border-l-warning' :
                  rec.risk_level === 'medium' ? 'border-l-info' :
                  'border-l-success'
                } hover:shadow-md transition-all`}>
                  <CardContent className="p-4">
                    <div className="space-y-3">
                      {/* Header */}
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-start gap-2 flex-1">
                          <span className="text-2xl">{getRiskIcon(rec.risk_level)}</span>
                          <div className="flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <Badge className={getRiskColor(rec.risk_level)}>
                                {rec.risk_level.toUpperCase()}
                              </Badge>
                              <span className="font-semibold text-sm">{rec.equipment_type}</span>
                              <span className="text-xs text-muted-foreground">ID: {rec.equipment_id}</span>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Recommendation */}
                      <div className="bg-muted/50 rounded-lg p-3">
                        <p className="text-sm font-medium">{rec.recommended_action}</p>
                      </div>

                      {/* Metrics */}
                      <div className="grid grid-cols-3 gap-3 text-xs">
                        <div className="space-y-1">
                          <div className="flex items-center gap-1 text-muted-foreground">
                            <AlertTriangle className="w-3 h-3" />
                            <span>Probabilidade</span>
                          </div>
                          <div className="font-semibold text-sm">
                            {(rec.failure_probability * 100).toFixed(0)}%
                          </div>
                        </div>
                        <div className="space-y-1">
                          <div className="flex items-center gap-1 text-muted-foreground">
                            <CheckCircle className="w-3 h-3" />
                            <span>Confiança</span>
                          </div>
                          <div className="font-semibold text-sm">
                            {rec.confidence_percent}%
                          </div>
                        </div>
                        {rec.predicted_failure_date && (
                          <div className="space-y-1">
                            <div className="flex items-center gap-1 text-muted-foreground">
                              <Clock className="w-3 h-3" />
                              <span>Previsão</span>
                            </div>
                            <div className="font-semibold text-sm">
                              {format(new Date(rec.predicted_failure_date), "dd/MM/yy", { locale: ptBR })}
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Key Factors */}
                      {rec.factors?.key_factors && rec.factors.key_factors.length > 0 && (
                        <div className="space-y-1">
                          <div className="text-xs font-medium text-muted-foreground">Fatores de Risco:</div>
                          <div className="flex flex-wrap gap-1">
                            {rec.factors.key_factors.map((factor: string, idx: number) => (
                              <Badge key={idx} variant="outline" className="text-xs">
                                {factor}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Actions */}
                      <div className="flex gap-2 pt-2">
                        <Button
                          size="sm"
                          onClick={() => createTicket(rec)}
                          className="flex-1 h-8"
                        >
                          <Calendar className="w-3 h-3 mr-1" />
                          Agendar Manutenção
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                <Lightbulb className="w-16 h-16 mx-auto mb-4 opacity-50" />
                <p className="text-sm mb-4">Nenhuma recomendação disponível</p>
                <Button onClick={runAnalysis} disabled={isAnalyzing}>
                  {isAnalyzing ? 'Analisando...' : 'Executar Primeira Análise'}
                </Button>
              </div>
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
