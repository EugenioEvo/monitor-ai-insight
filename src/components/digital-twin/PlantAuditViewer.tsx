import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  TrendingUp, 
  AlertTriangle,
  DollarSign,
  FileText,
  CheckCircle,
  Clock,
  Zap,
  Download
} from 'lucide-react';
import type { PlantAudit, AuditFinding, AuditRecommendation } from '@/types/plant-audit';

interface PlantAuditViewerProps {
  audit: PlantAudit;
  onGenerateReport?: () => void;
}

export const PlantAuditViewer = ({ audit, onGenerateReport }: PlantAuditViewerProps) => {
  const getCategoryIcon = (category: string) => {
    const icons: Record<string, any> = {
      soiling: '🧹',
      mismatch: '⚡',
      mppt: '🎯',
      clipping: '✂️',
      outage: '🔌',
      degradation: '📉',
      shading: '🌥️',
      thermal: '🌡️',
    };
    return icons[category] || '📊';
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'destructive';
      case 'high': return 'default';
      case 'medium': return 'secondary';
      default: return 'outline';
    }
  };

  const getPriorityBadge = (priority: string) => {
    const colors: Record<string, string> = {
      immediate: 'bg-red-500',
      short_term: 'bg-orange-500',
      medium_term: 'bg-yellow-500',
      long_term: 'bg-blue-500',
    };
    return colors[priority] || 'bg-gray-500';
  };

  return (
    <div className="space-y-6">
      {/* Executive Summary */}
      <Card className="border-2 border-primary">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-2xl">Auditoria da Planta</CardTitle>
              <CardDescription>
                Período: {new Date(audit.period_analyzed.start).toLocaleDateString('pt-BR')} até {new Date(audit.period_analyzed.end).toLocaleDateString('pt-BR')}
              </CardDescription>
            </div>
            <Badge 
              variant={
                audit.overall_status === 'excellent' ? 'default' :
                audit.overall_status === 'good' ? 'secondary' :
                audit.overall_status === 'needs_attention' ? 'outline' :
                'destructive'
              }
              className="text-lg px-4 py-2"
            >
              {audit.overall_status === 'excellent' && '⭐ Excelente'}
              {audit.overall_status === 'good' && '👍 Bom'}
              {audit.overall_status === 'needs_attention' && '⚠️ Atenção'}
              {audit.overall_status === 'critical' && '🚨 Crítico'}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Key Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-green-700 font-medium">Geração Recuperável</p>
                    <p className="text-3xl font-bold text-green-900">
                      {audit.total_recoverable_generation_kwh.toLocaleString('pt-BR')} kWh/ano
                    </p>
                    <Badge className="mt-2 bg-green-600">
                      +{audit.recoverable_percent.toFixed(1)}%
                    </Badge>
                  </div>
                  <TrendingUp className="w-12 h-12 text-green-600 opacity-50" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-blue-700 font-medium">Valor Recuperável</p>
                    <p className="text-3xl font-bold text-blue-900">
                      R$ {audit.total_recoverable_value_brl.toLocaleString('pt-BR')}
                    </p>
                    <p className="text-xs text-blue-600 mt-1">por ano</p>
                  </div>
                  <DollarSign className="w-12 h-12 text-blue-600 opacity-50" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-orange-700 font-medium">Problemas Encontrados</p>
                    <p className="text-3xl font-bold text-orange-900">
                      {audit.findings.length}
                    </p>
                    <p className="text-xs text-orange-600 mt-1">
                      {audit.findings.filter(f => f.severity === 'critical').length} críticos
                    </p>
                  </div>
                  <AlertTriangle className="w-12 h-12 text-orange-600 opacity-50" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Quick Actions */}
          <div className="flex gap-3">
            <Button onClick={onGenerateReport} className="flex-1">
              <FileText className="w-4 h-4 mr-2" />
              Gerar Relatório Executivo
            </Button>
            <Button variant="outline">
              <Download className="w-4 h-4 mr-2" />
              Exportar Dados
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Detailed Findings & Recommendations */}
      <Tabs defaultValue="findings" className="space-y-4">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="findings">
            <AlertTriangle className="w-4 h-4 mr-2" />
            Problemas Identificados
          </TabsTrigger>
          <TabsTrigger value="recommendations">
            <CheckCircle className="w-4 h-4 mr-2" />
            Recomendações
          </TabsTrigger>
        </TabsList>

        {/* Findings Tab */}
        <TabsContent value="findings" className="space-y-4">
          {audit.findings.map((finding) => (
            <Card key={finding.id} className="relative overflow-hidden">
              <div 
                className={`absolute left-0 top-0 bottom-0 w-1 ${
                  finding.severity === 'critical' ? 'bg-red-500' :
                  finding.severity === 'high' ? 'bg-orange-500' :
                  finding.severity === 'medium' ? 'bg-yellow-500' :
                  'bg-blue-500'
                }`}
              />
              <CardHeader className="pl-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-2xl">{getCategoryIcon(finding.category)}</span>
                      <Badge variant={getSeverityColor(finding.severity)}>
                        {finding.severity}
                      </Badge>
                      <Badge variant="outline" className="capitalize">
                        {finding.category}
                      </Badge>
                    </div>
                    <CardTitle>{finding.title}</CardTitle>
                    <CardDescription>{finding.description}</CardDescription>
                  </div>
                  <div className="text-right ml-4">
                    <p className="text-sm text-muted-foreground">Perda Estimada</p>
                    <p className="text-2xl font-bold text-red-600">
                      {finding.estimated_loss_kwh_year.toLocaleString('pt-BR')} kWh
                    </p>
                    <p className="text-sm font-semibold">
                      R$ {finding.estimated_loss_brl_year.toLocaleString('pt-BR')}/ano
                    </p>
                    <Badge className="mt-2" variant="destructive">
                      -{finding.loss_percent.toFixed(1)}%
                    </Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pl-6 space-y-4">
                {/* Probable Causes */}
                {finding.probable_root_causes.length > 0 && (
                  <div>
                    <p className="text-sm font-semibold mb-2">Causas Prováveis:</p>
                    <ul className="list-disc list-inside space-y-1">
                      {finding.probable_root_causes.map((cause, idx) => (
                        <li key={idx} className="text-sm text-muted-foreground">{cause}</li>
                      ))}
                    </ul>
                    <div className="mt-2">
                      <Progress value={finding.confidence * 100} className="h-2" />
                      <p className="text-xs text-muted-foreground mt-1">
                        Confiança da análise: {(finding.confidence * 100).toFixed(0)}%
                      </p>
                    </div>
                  </div>
                )}

                {/* Affected Components */}
                {finding.affected_components && finding.affected_components.length > 0 && (
                  <div>
                    <p className="text-sm font-semibold mb-2">Componentes Afetados:</p>
                    <div className="flex flex-wrap gap-2">
                      {finding.affected_components.map((comp, idx) => (
                        <Badge key={idx} variant="secondary">{comp}</Badge>
                      ))}
                    </div>
                  </div>
                )}

                {/* Evidence */}
                {finding.evidence.length > 0 && (
                  <div className="pt-4 border-t">
                    <p className="text-sm font-semibold mb-2">Evidências:</p>
                    <div className="space-y-2">
                      {finding.evidence.map((ev, idx) => (
                        <div key={idx} className="p-3 bg-muted rounded-lg">
                          <p className="text-sm font-medium">{ev.type}</p>
                          <p className="text-xs text-muted-foreground">{ev.description}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        {/* Recommendations Tab */}
        <TabsContent value="recommendations" className="space-y-4">
          {audit.recommendations.map((rec) => {
            const finding = audit.findings.find(f => f.id === rec.finding_id);
            return (
              <Card key={rec.id} className="relative overflow-hidden">
                <div className={`absolute left-0 top-0 bottom-0 w-1 ${getPriorityBadge(rec.priority)}`} />
                <CardHeader className="pl-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <Badge className={getPriorityBadge(rec.priority)}>
                          {rec.priority === 'immediate' && '🚨 Imediato'}
                          {rec.priority === 'short_term' && '⏱️ Curto Prazo'}
                          {rec.priority === 'medium_term' && '📅 Médio Prazo'}
                          {rec.priority === 'long_term' && '🎯 Longo Prazo'}
                        </Badge>
                        {finding && (
                          <Badge variant="outline">
                            {getCategoryIcon(finding.category)} {finding.category}
                          </Badge>
                        )}
                      </div>
                      <CardTitle className="text-lg">{rec.action}</CardTitle>
                      <CardDescription>{rec.description}</CardDescription>
                    </div>
                    <div className="text-right ml-4">
                      <p className="text-sm text-muted-foreground">Ganho Anual</p>
                      <p className="text-2xl font-bold text-green-600">
                        +{rec.expected_generation_increase_kwh_year.toLocaleString('pt-BR')} kWh
                      </p>
                      <p className="text-sm font-semibold">
                        R$ {rec.estimated_annual_benefit_brl.toLocaleString('pt-BR')}
                      </p>
                      <Badge className="mt-2 bg-green-600">
                        +{rec.expected_increase_percent.toFixed(1)}%
                      </Badge>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pl-6 space-y-4">
                  {/* ROI Information */}
                  <div className="grid grid-cols-3 gap-4 p-4 bg-muted rounded-lg">
                    {rec.estimated_cost_brl && (
                      <div>
                        <p className="text-xs text-muted-foreground">Custo Estimado</p>
                        <p className="text-lg font-semibold">
                          R$ {rec.estimated_cost_brl.toLocaleString('pt-BR')}
                        </p>
                      </div>
                    )}
                    {rec.payback_months && (
                      <div>
                        <p className="text-xs text-muted-foreground">Payback</p>
                        <p className="text-lg font-semibold flex items-center gap-1">
                          <Clock className="w-4 h-4" />
                          {rec.payback_months} meses
                        </p>
                      </div>
                    )}
                    {rec.implementation_time_hours && (
                      <div>
                        <p className="text-xs text-muted-foreground">Tempo de Implementação</p>
                        <p className="text-lg font-semibold">
                          {rec.implementation_time_hours}h
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Resources & Specialist */}
                  {(rec.required_resources || rec.requires_specialist) && (
                    <div className="flex gap-4">
                      {rec.required_resources && rec.required_resources.length > 0 && (
                        <div className="flex-1">
                          <p className="text-sm font-semibold mb-2">Recursos Necessários:</p>
                          <div className="flex flex-wrap gap-2">
                            {rec.required_resources.map((resource, idx) => (
                              <Badge key={idx} variant="outline">{resource}</Badge>
                            ))}
                          </div>
                        </div>
                      )}
                      {rec.requires_specialist && (
                        <Badge variant="secondary" className="self-start">
                          Requer Especialista
                        </Badge>
                      )}
                    </div>
                  )}

                  {/* Action Button */}
                  <div className="flex gap-2 pt-4 border-t">
                    <Button className="flex-1" variant={rec.status === 'completed' ? 'secondary' : 'default'}>
                      {rec.status === 'completed' && <CheckCircle className="w-4 h-4 mr-2" />}
                      {rec.status === 'in_progress' && <Clock className="w-4 h-4 mr-2" />}
                      {rec.status === 'pending' && <Zap className="w-4 h-4 mr-2" />}
                      {rec.status === 'completed' ? 'Concluído' :
                       rec.status === 'in_progress' ? 'Em Andamento' :
                       'Iniciar Implementação'}
                    </Button>
                    {rec.status === 'pending' && (
                      <Button variant="outline">Agendar</Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </TabsContent>
      </Tabs>
    </div>
  );
};
