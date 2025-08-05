import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { FileText, Download, RefreshCw, Calendar, TrendingUp, Activity, Zap, BarChart3 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { format as formatDate } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface AutomatedReport {
  id: string;
  report_type: string;
  plant_id?: string;
  period_start: string;
  period_end: string;
  report_data: any;
  generated_at: string;
}

interface PlantInfo {
  id: string;
  name: string;
}

export const AutomatedReportsPanel: React.FC = () => {
  const [reports, setReports] = useState<AutomatedReport[]>([]);
  const [plants, setPlants] = useState<PlantInfo[]>([]);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [selectedPlant, setSelectedPlant] = useState<string>('all');
  const [reportType, setReportType] = useState('monthly');
  const { toast } = useToast();

  const fetchData = async () => {
    setLoading(true);
    try {
      // Buscar plantas
      const { data: plantsData, error: plantsError } = await supabase
        .from('plants')
        .select('id, name')
        .eq('status', 'active');

      if (plantsError) throw plantsError;
      setPlants(plantsData || []);

      // Buscar relatórios
      const { data, error } = await supabase.functions.invoke('report-generator', {
        body: { 
          action: 'get_reports',
          report_type: reportType === 'all' ? undefined : reportType,
          limit: 50
        }
      });

      if (error) throw error;
      setReports(data.reports || []);

    } catch (error) {
      console.error('Error fetching reports:', error);
      toast({
        title: "Erro ao carregar relatórios",
        description: "Não foi possível carregar os relatórios automatizados.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const generateReport = async () => {
    setGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke('report-generator', {
        body: { 
          action: 'generate_monthly_report',
          report_type: reportType,
          plant_id: selectedPlant === 'all' ? undefined : selectedPlant
        }
      });

      if (error) throw error;

      toast({
        title: "Relatório gerado",
        description: `${data.reports_generated} relatórios foram gerados com sucesso.`,
      });

      // Recarregar dados
      await fetchData();
    } catch (error) {
      console.error('Error generating report:', error);
      toast({
        title: "Erro na geração",
        description: "Não foi possível gerar o relatório.",
        variant: "destructive",
      });
    } finally {
      setGenerating(false);
    }
  };

  const downloadReport = (report: AutomatedReport, downloadFormat: 'pdf' | 'json' = 'pdf') => {
    if (downloadFormat === 'pdf') {
      generatePDFReport(report);
    } else {
      const reportContent = {
        ...report.report_data,
        metadata: {
          generated_at: report.generated_at,
          period: `${formatDate(new Date(report.period_start), 'dd/MM/yyyy')} - ${formatDate(new Date(report.period_end), 'dd/MM/yyyy')}`,
          report_type: report.report_type
        }
      };

      const blob = new Blob([JSON.stringify(reportContent, null, 2)], {
        type: 'application/json'
      });
      
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `relatorio_${report.report_type}_${formatDate(new Date(report.generated_at), 'yyyyMMdd')}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }

    toast({
      title: "Download iniciado",
      description: "O relatório está sendo baixado.",
    });
  };

  const generatePDFReport = (report: AutomatedReport) => {
    const doc = new jsPDF();
    const plant = plants.find(p => p.id === report.plant_id);
    const energyMetrics = report.report_data?.energy_metrics || {};
    const operationalMetrics = report.report_data?.operational_metrics || {};
    
    // Título
    doc.setFontSize(18);
    doc.text('Relatório de Performance Solar', 20, 20);
    
    // Informações básicas
    doc.setFontSize(12);
    doc.text(`Planta: ${plant?.name || 'Todas as plantas'}`, 20, 35);
    doc.text(`Tipo: ${getReportTypeName(report.report_type)}`, 20, 45);
    doc.text(`Período: ${formatDate(new Date(report.period_start), 'dd/MM/yyyy')} - ${formatDate(new Date(report.period_end), 'dd/MM/yyyy')}`, 20, 55);
    doc.text(`Gerado em: ${formatDate(new Date(report.generated_at), 'dd/MM/yyyy HH:mm')}`, 20, 65);
    
    // Métricas de energia
    doc.setFontSize(14);
    doc.text('Métricas de Energia', 20, 85);
    
    const energyData = [
      ['Energia Total (kWh)', formatMetric(energyMetrics.total_energy_kwh || 0)],
      ['Potência Média (kW)', formatMetric((energyMetrics.average_power_w || 0) / 1000)],
      ['Potência Máxima (kW)', formatMetric((energyMetrics.max_power_w || 0) / 1000)],
      ['Performance (%)', formatMetric(energyMetrics.performance_percentage || 0)],
      ['Disponibilidade (%)', formatMetric(energyMetrics.availability_percentage || 0)]
    ];
    
    autoTable(doc, {
      startY: 95,
      head: [['Métrica', 'Valor']],
      body: energyData,
      theme: 'striped',
      headStyles: { fillColor: [41, 128, 185] },
      margin: { left: 20, right: 20 }
    });
    
    // Métricas operacionais
    const finalY = (doc as any).lastAutoTable.finalY || 95;
    doc.setFontSize(14);
    doc.text('Métricas Operacionais', 20, finalY + 20);
    
    const operationalData = [
      ['Total de Alertas', (operationalMetrics.total_alerts || 0).toString()],
      ['Alertas Críticos', (operationalMetrics.critical_alerts || 0).toString()],
      ['Tickets Abertos', (operationalMetrics.open_tickets || 0).toString()],
      ['Tickets Fechados', (operationalMetrics.closed_tickets || 0).toString()]
    ];
    
    autoTable(doc, {
      startY: finalY + 30,
      head: [['Métrica', 'Valor']],
      body: operationalData,
      theme: 'striped',
      headStyles: { fillColor: [231, 76, 60] },
      margin: { left: 20, right: 20 }
    });
    
    // Salvar PDF
    const fileName = `relatorio_${report.report_type}_${formatDate(new Date(report.generated_at), 'yyyyMMdd')}.pdf`;
    doc.save(fileName);
  };

  useEffect(() => {
    fetchData();
  }, [reportType]);

  const getReportTypeIcon = (type: string) => {
    switch (type) {
      case 'monthly': return <Calendar className="h-4 w-4" />;
      case 'weekly': return <BarChart3 className="h-4 w-4" />;
      case 'daily': return <Activity className="h-4 w-4" />;
      default: return <FileText className="h-4 w-4" />;
    }
  };

  const getReportTypeName = (type: string) => {
    switch (type) {
      case 'monthly': return 'Mensal';
      case 'weekly': return 'Semanal';
      case 'daily': return 'Diário';
      default: return type;
    }
  };

  const formatMetric = (value: number, decimals = 2) => {
    return new Intl.NumberFormat('pt-BR', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals
    }).format(value);
  };

  const reportCounts = {
    total: reports.length,
    thisMonth: reports.filter(r => {
      const reportDate = new Date(r.generated_at);
      const now = new Date();
      return reportDate.getMonth() === now.getMonth() && reportDate.getFullYear() === now.getFullYear();
    }).length,
    lastWeek: reports.filter(r => {
      const reportDate = new Date(r.generated_at);
      const now = new Date();
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      return reportDate >= weekAgo;
    }).length
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold">Relatórios Automatizados</h2>
          <p className="text-muted-foreground">
            Geração e gerenciamento de relatórios automáticos de performance
          </p>
        </div>
        <div className="flex gap-2">
          <Select value={selectedPlant} onValueChange={setSelectedPlant}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Selecionar planta" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as plantas</SelectItem>
              {plants.map(plant => (
                <SelectItem key={plant.id} value={plant.id}>
                  {plant.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button onClick={generateReport} disabled={generating}>
            <FileText className={`mr-2 h-4 w-4 ${generating ? 'animate-pulse' : ''}`} />
            Gerar Relatório
          </Button>
        </div>
      </div>

      {/* Cards de resumo */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Relatórios</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{reportCounts.total}</div>
            <p className="text-xs text-muted-foreground">
              relatórios gerados
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Este Mês</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{reportCounts.thisMonth}</div>
            <p className="text-xs text-muted-foreground">
              relatórios gerados
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Última Semana</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{reportCounts.lastWeek}</div>
            <p className="text-xs text-muted-foreground">
              relatórios gerados
            </p>
          </CardContent>
        </Card>
      </div>

      <Tabs value={reportType} onValueChange={setReportType}>
        <TabsList>
          <TabsTrigger value="monthly">Mensais</TabsTrigger>
          <TabsTrigger value="weekly">Semanais</TabsTrigger>
          <TabsTrigger value="daily">Diários</TabsTrigger>
        </TabsList>

        <TabsContent value={reportType}>
          <Card>
            <CardHeader>
              <CardTitle>
                Relatórios {getReportTypeName(reportType)}
              </CardTitle>
              <CardDescription>
                Lista de relatórios automatizados gerados
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Planta</TableHead>
                    <TableHead>Período</TableHead>
                    <TableHead>Energia Total</TableHead>
                    <TableHead>Performance</TableHead>
                    <TableHead>Alertas</TableHead>
                    <TableHead>Gerado em</TableHead>
                    <TableHead>Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {reports.map((report) => {
                    const plant = plants.find(p => p.id === report.plant_id);
                    const energyMetrics = report.report_data?.energy_metrics || {};
                    const operationalMetrics = report.report_data?.operational_metrics || {};
                    
                    return (
                      <TableRow key={report.id}>
                        <TableCell className="font-medium">
                          {plant?.name || 'Todas as plantas'}
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            <div className="text-sm">
                              {formatDate(new Date(report.period_start), 'dd/MM/yyyy', { locale: ptBR })}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              até {formatDate(new Date(report.period_end), 'dd/MM/yyyy', { locale: ptBR })}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            <div className="font-medium">
                              {formatMetric(energyMetrics.total_energy_kwh || 0)} kWh
                            </div>
                            <div className="text-xs text-muted-foreground">
                              Máx: {formatMetric(energyMetrics.max_power_w / 1000 || 0)} kW
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            <Badge variant={
                              (energyMetrics.performance_percentage || 0) > 80 ? 'default' :
                              (energyMetrics.performance_percentage || 0) > 60 ? 'secondary' : 'destructive'
                            }>
                              {formatMetric(energyMetrics.performance_percentage || 0)}%
                            </Badge>
                            <div className="text-xs text-muted-foreground">
                              Disponibilidade: {formatMetric(energyMetrics.availability_percentage || 0)}%
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            <div className="text-sm">
                              {operationalMetrics.total_alerts || 0} alertas
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {operationalMetrics.critical_alerts || 0} críticos
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          {formatDate(new Date(report.generated_at), 'dd/MM/yyyy HH:mm', { locale: ptBR })}
                        </TableCell>
                        <TableCell>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => downloadReport(report)}
                          >
                            <Download className="h-3 w-3 mr-1" />
                            Baixar
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>

              {reports.length === 0 && !loading && (
                <div className="text-center py-8 text-muted-foreground">
                  Nenhum relatório {reportType} encontrado.
                  <br />
                  <Button variant="outline" onClick={generateReport} className="mt-2">
                    Gerar primeiro relatório
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};