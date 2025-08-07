import React, { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Bell, CheckCircle, Clock, RefreshCw, AlertTriangle, XCircle, TrendingDown, Search } from 'lucide-react';
import { SmartAlertsManager } from '@/components/alerts/SmartAlertsManager';

interface AlertRow {
  id: string;
  plant_id: string;
  timestamp: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  type: 'performance' | 'compliance' | 'maintenance' | string;
  acknowledged_by?: string | null;
  status?: 'open' | 'acknowledged' | 'resolved';
}

interface Plant { id: string; name: string }

const severityConfig = {
  low: { color: 'bg-blue-100 text-blue-800 border-blue-200', icon: Clock, label: 'Baixa' },
  medium: { color: 'bg-yellow-100 text-yellow-800 border-yellow-200', icon: AlertTriangle, label: 'Média' },
  high: { color: 'bg-orange-100 text-orange-800 border-orange-200', icon: AlertTriangle, label: 'Alta' },
  critical: { color: 'bg-red-100 text-red-800 border-red-200', icon: XCircle, label: 'Crítica' },
};

const typeConfig: Record<string, { label: string; icon: any; color: string }> = {
  performance: { label: 'Performance', icon: TrendingDown, color: 'text-orange-600' },
  compliance: { label: 'Conformidade', icon: CheckCircle, color: 'text-blue-600' },
  maintenance: { label: 'Manutenção', icon: AlertTriangle, color: 'text-yellow-600' },
};

export default function Alerts() {
  // Filtros
  const [plantId, setPlantId] = useState<string | undefined>(undefined);
  const [status, setStatus] = useState<string | undefined>(undefined);
  const [severity, setSeverity] = useState<'low' | 'medium' | 'high' | 'critical' | undefined>(undefined);
  const [searchTerm, setSearchTerm] = useState('');

  // Dados de plantas
  const { data: plants } = useQuery<Plant[]>({
    queryKey: ['plants-names'],
    queryFn: async () => {
      const { data, error } = await supabase.from('plants').select('id, name');
      if (error) throw error;
      return (data || []) as Plant[];
    },
    staleTime: 5 * 60 * 1000,
  });

  // Buscar alertas com filtros
  const { data: alerts, isLoading, refetch } = useQuery<AlertRow[]>({
    queryKey: ['alerts', plantId, status, severity, searchTerm],
    queryFn: async () => {
      let query = supabase
        .from('alerts')
        .select('*')
        .order('timestamp', { ascending: false });

      if (plantId) query = query.eq('plant_id', plantId);
      if (status) query = query.eq('status', status);
      if (severity) query = query.eq('severity', severity);
      if (searchTerm) {
        const term = `%${searchTerm}%`;
        query = query.or(`message.ilike.${term},type.ilike.${term}`);
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as AlertRow[];
    },
    staleTime: 60 * 1000,
  });

  // Realtime: atualizar automaticamente
  useEffect(() => {
    const channel = supabase
      .channel('alerts-page-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'alerts' }, () => {
        refetch();
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [refetch]);

  const getPlantName = (id: string) => plants?.find(p => p.id === id)?.name || 'Planta Desconhecida';

  const stats = useMemo(() => {
    const list = alerts || [];
    return {
      total: list.length,
      critical: list.filter(a => a.severity === 'critical').length,
      unack: list.filter(a => (a.status ? a.status !== 'resolved' && a.status !== 'acknowledged' : !a.acknowledged_by)).length,
    };
  }, [alerts]);

  const acknowledgeAlert = async (alertId: string) => {
    try {
      const { data: userRes } = await supabase.auth.getUser();
      const userId = userRes.user?.id || 'ui';
      const { error } = await supabase
        .from('alerts')
        .update({ status: 'acknowledged', acknowledged_by: userId })
        .eq('id', alertId);
      if (error) throw error;
      refetch();
    } catch (e) {
      console.error('Erro ao reconhecer alerta:', e);
    }
  };

  const clearFilters = () => {
    setPlantId(undefined);
    setStatus(undefined);
    setSeverity(undefined);
    setSearchTerm('');
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Alertas</h1>
          <p className="text-muted-foreground">Monitore alertas do sistema e inteligentes</p>
        </div>
        <Button variant="outline" onClick={() => refetch()}>
          <RefreshCw className="w-4 h-4 mr-2" /> Atualizar
        </Button>
      </div>

      <Tabs defaultValue="sistema" className="space-y-6">
        <TabsList>
          <TabsTrigger value="sistema">Sistema</TabsTrigger>
          <TabsTrigger value="inteligentes">Inteligentes</TabsTrigger>
        </TabsList>

        <TabsContent value="sistema" className="space-y-6">
          {/* Filtros */}
          <Card>
            <CardHeader>
              <CardTitle>Filtros</CardTitle>
              <CardDescription>Refine os alertas exibidos</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                <div className="space-y-1">
                  <Label>Planta</Label>
                  <Select value={plantId} onValueChange={(v) => setPlantId(v)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Todas" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={''}>Todas</SelectItem>
                      {plants?.map((p) => (
                        <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1">
                  <Label>Status</Label>
                  <Select value={status} onValueChange={(v) => setStatus(v)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Todos" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={''}>Todos</SelectItem>
                      <SelectItem value="open">Aberto</SelectItem>
                      <SelectItem value="acknowledged">Reconhecido</SelectItem>
                      <SelectItem value="resolved">Resolvido</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1">
                  <Label>Severidade</Label>
                  <Select value={severity} onValueChange={(v) => setSeverity(v as any)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Todas" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={''}>Todas</SelectItem>
                      <SelectItem value="low">Baixa</SelectItem>
                      <SelectItem value="medium">Média</SelectItem>
                      <SelectItem value="high">Alta</SelectItem>
                      <SelectItem value="critical">Crítica</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1 md:col-span-2">
                  <Label>Busca</Label>
                  <div className="flex items-center gap-2">
                    <Search className="w-4 h-4 text-muted-foreground" />
                    <Input placeholder="Mensagem ou tipo" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
                  </div>
                </div>
              </div>

              <div className="mt-4 flex gap-2">
                <Button variant="outline" onClick={clearFilters}>Limpar</Button>
              </div>
            </CardContent>
          </Card>

          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Total de Alertas</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.total}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Alertas Críticos</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600">{stats.critical}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Não Reconhecidos</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-orange-600">{stats.unack}</div>
              </CardContent>
            </Card>
          </div>

          {/* Lista */}
          <Card>
            <CardHeader>
              <CardTitle>Alertas Recentes</CardTitle>
              <CardDescription>Lista ordenada por data</CardDescription>
            </CardHeader>
            <CardContent>
              {(!alerts || alerts.length === 0) ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Bell className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <h3 className="text-lg font-medium mb-2">Nenhum alerta encontrado</h3>
                  <p>O sistema está funcionando normalmente.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {alerts.map((alert) => {
                    const SeverityIcon = severityConfig[alert.severity]?.icon || Bell;
                    const typeMeta = typeConfig[alert.type] || { label: alert.type, icon: Bell, color: 'text-muted-foreground' };
                    return (
                      <div key={alert.id} className={`border rounded-lg p-4 ${alert.status === 'acknowledged' ? 'opacity-80' : ''}`}>
                        <div className="flex items-start justify-between">
                          <div className="flex items-start gap-3 flex-1">
                            <SeverityIcon className="w-5 h-5 mt-0.5 text-muted-foreground" />
                            <div className="flex-1 space-y-2">
                              <div className="flex items-center gap-2 flex-wrap">
                                <Badge className={severityConfig[alert.severity]?.color} variant="outline">
                                  {severityConfig[alert.severity]?.label || alert.severity}
                                </Badge>
                                <div className={`flex items-center gap-1 text-sm ${typeMeta.color}`}>
                                  <typeMeta.icon className="w-4 h-4" />
                                  {typeMeta.label}
                                </div>
                                <span className="text-sm text-muted-foreground">{getPlantName(alert.plant_id)}</span>
                                {alert.status && (
                                  <Badge variant="secondary">{alert.status.toUpperCase()}</Badge>
                                )}
                              </div>
                              <p className="font-medium">{alert.message}</p>
                              <div className="flex items-center justify-between">
                                <span className="text-xs text-muted-foreground">{new Date(alert.timestamp).toLocaleString('pt-BR')}</span>
                                {alert.status !== 'acknowledged' && alert.status !== 'resolved' && (
                                  <Button variant="outline" size="sm" onClick={() => acknowledgeAlert(alert.id)}>
                                    <CheckCircle className="w-4 h-4 mr-2" /> Reconhecer
                                  </Button>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="inteligentes">
          <SmartAlertsManager />
        </TabsContent>
      </Tabs>
    </div>
  );
}
