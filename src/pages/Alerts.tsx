
import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { AlertTriangle, CheckCircle, Clock, XCircle, Bell, TrendingDown } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface Alert {
  id: string;
  plant_id: string;
  timestamp: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  type: 'performance' | 'compliance' | 'maintenance';
  acknowledged_by?: string;
}

interface Plant {
  id: string;
  name: string;
}

const severityConfig = {
  low: {
    color: 'bg-blue-100 text-blue-800 border-blue-200',
    icon: Clock,
    label: 'Baixa'
  },
  medium: {
    color: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    icon: AlertTriangle,
    label: 'Média'
  },
  high: {
    color: 'bg-orange-100 text-orange-800 border-orange-200',
    icon: AlertTriangle,
    label: 'Alta'
  },
  critical: {
    color: 'bg-red-100 text-red-800 border-red-200',
    icon: XCircle,
    label: 'Crítica'
  }
};

const typeConfig = {
  performance: {
    label: 'Performance',
    icon: TrendingDown,
    color: 'text-orange-600'
  },
  compliance: {
    label: 'Conformidade',
    icon: CheckCircle,
    color: 'text-blue-600'
  },
  maintenance: {
    label: 'Manutenção',
    icon: AlertTriangle,
    color: 'text-yellow-600'
  }
};

export default function Alerts() {
  const { data: alerts, isLoading: alertsLoading, refetch } = useQuery({
    queryKey: ['alerts'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('alerts')
        .select('*')
        .order('timestamp', { ascending: false });
      
      if (error) throw error;
      return data as Alert[];
    }
  });

  const { data: plants } = useQuery({
    queryKey: ['plants-names'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('plants')
        .select('id, name');
      
      if (error) throw error;
      return data as Plant[];
    }
  });

  const getPlantName = (plantId: string) => {
    return plants?.find(p => p.id === plantId)?.name || 'Planta Desconhecida';
  };

  const acknowledgeAlert = async (alertId: string) => {
    try {
      const { error } = await supabase
        .from('alerts')
        .update({ acknowledged_by: 'Sistema' })
        .eq('id', alertId);
      
      if (error) throw error;
      refetch();
    } catch (error) {
      console.error('Erro ao reconhecer alerta:', error);
    }
  };

  const getAlertStats = () => {
    if (!alerts) return { total: 0, critical: 0, unacknowledged: 0 };
    
    return {
      total: alerts.length,
      critical: alerts.filter(a => a.severity === 'critical').length,
      unacknowledged: alerts.filter(a => !a.acknowledged_by).length
    };
  };

  const stats = getAlertStats();

  if (alertsLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Alertas do Sistema</h1>
          <p className="text-muted-foreground">
            Monitore alertas de performance, manutenção e conformidade
          </p>
        </div>
        <Button onClick={() => refetch()} variant="outline">
          <Bell className="w-4 h-4 mr-2" />
          Atualizar
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total de Alertas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Alertas Críticos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{stats.critical}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Não Reconhecidos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{stats.unacknowledged}</div>
          </CardContent>
        </Card>
      </div>

      {/* Alerts List */}
      <Card>
        <CardHeader>
          <CardTitle>Alertas Recentes</CardTitle>
          <CardDescription>
            Lista de todos os alertas do sistema ordenados por data
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!alerts || alerts.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Bell className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <h3 className="text-lg font-medium mb-2">Nenhum alerta encontrado</h3>
              <p>O sistema está funcionando normalmente sem alertas ativos.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {alerts.map((alert) => {
                const SeverityIcon = severityConfig[alert.severity].icon;
                const TypeIcon = typeConfig[alert.type].icon;
                
                return (
                  <div
                    key={alert.id}
                    className={`border rounded-lg p-4 ${
                      alert.acknowledged_by ? 'opacity-60' : ''
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3 flex-1">
                        <SeverityIcon className="w-5 h-5 mt-0.5 text-muted-foreground" />
                        
                        <div className="flex-1 space-y-2">
                          <div className="flex items-center gap-2 flex-wrap">
                            <Badge
                              className={severityConfig[alert.severity].color}
                              variant="outline"
                            >
                              {severityConfig[alert.severity].label}
                            </Badge>
                            
                            <div className={`flex items-center gap-1 text-sm ${typeConfig[alert.type].color}`}>
                              <TypeIcon className="w-4 h-4" />
                              {typeConfig[alert.type].label}
                            </div>
                            
                            <span className="text-sm text-muted-foreground">
                              {getPlantName(alert.plant_id)}
                            </span>
                          </div>
                          
                          <p className="font-medium text-gray-900">
                            {alert.message}
                          </p>
                          
                          <div className="flex items-center justify-between">
                            <span className="text-xs text-muted-foreground">
                              {new Date(alert.timestamp).toLocaleString('pt-BR')}
                            </span>
                            
                            {alert.acknowledged_by && (
                              <Badge variant="outline" className="text-green-700 border-green-200">
                                <CheckCircle className="w-3 h-3 mr-1" />
                                Reconhecido
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                      
                      {!alert.acknowledged_by && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => acknowledgeAlert(alert.id)}
                        >
                          <CheckCircle className="w-4 h-4 mr-2" />
                          Reconhecer
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
