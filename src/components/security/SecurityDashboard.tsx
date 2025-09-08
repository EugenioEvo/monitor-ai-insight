import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Shield, AlertTriangle, Lock, Eye } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

interface SecurityEvent {
  id: string;
  action: string;
  user_id: string;
  ip_address: string | null;
  success: boolean;
  created_at: string;
  error_message?: string | null;
  record_id?: string;
  table_name?: string;
  user_agent?: string;
}

interface SecuritySummary {
  total_events: number;
  failed_attempts: number;
  unique_ips: number;
  event_types: Record<string, number>;
}

export const SecurityDashboard = () => {
  const { isAdmin } = useAuth();
  const [events, setEvents] = useState<SecurityEvent[]>([]);
  const [summary, setSummary] = useState<SecuritySummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState('24h');

  useEffect(() => {
    if (isAdmin) {
      fetchSecurityData();
    }
  }, [timeRange, isAdmin]);

  const fetchSecurityData = async () => {
    try {
      setLoading(true);

      // Fetch recent security events
      const { data: eventsData } = await supabase
        .from('security_audit_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);

      if (eventsData) {
        // Type assertion to handle Supabase type mismatch
        const typedEvents = eventsData as SecurityEvent[];
        setEvents(typedEvents);

        // Calculate summary
        const now = new Date();
        const cutoff = new Date(now.getTime() - (timeRange === '24h' ? 24 : 168) * 60 * 60 * 1000);
        const recentEvents = typedEvents.filter(e => new Date(e.created_at) > cutoff);

        const summaryData: SecuritySummary = {
          total_events: recentEvents.length,
          failed_attempts: recentEvents.filter(e => !e.success).length,
          unique_ips: new Set(recentEvents.map(e => e.ip_address || 'unknown')).size,
          event_types: recentEvents.reduce((acc, e) => {
            acc[e.action] = (acc[e.action] || 0) + 1;
            return acc;
          }, {} as Record<string, number>)
        };

        setSummary(summaryData);
      }
    } catch (error) {
      console.error('Error fetching security data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getSeverityBadge = (action: string, success: boolean) => {
    if (!success) {
      if (action.includes('AUTH')) return <Badge variant="destructive">High Risk</Badge>;
      if (action.includes('CREDENTIALS')) return <Badge variant="destructive">Critical</Badge>;
      return <Badge variant="secondary">Medium</Badge>;
    }
    return <Badge variant="outline">Normal</Badge>;
  };

  const getActionIcon = (action: string) => {
    if (action.includes('AUTH')) return <Lock className="h-4 w-4" />;
    if (action.includes('CREDENTIALS')) return <Shield className="h-4 w-4" />;
    if (action.includes('ACCESS')) return <Eye className="h-4 w-4" />;
    return <AlertTriangle className="h-4 w-4" />;
  };

  if (!isAdmin) {
    return (
      <Alert>
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          Acesso negado. Apenas administradores podem visualizar o dashboard de segurança.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Security Dashboard</h2>
        <select
          value={timeRange}
          onChange={(e) => setTimeRange(e.target.value)}
          className="px-3 py-1 border rounded-md"
        >
          <option value="24h">Últimas 24 horas</option>
          <option value="7d">Últimos 7 dias</option>
        </select>
      </div>

      {loading ? (
        <div className="text-center">Carregando dados de segurança...</div>
      ) : (
        <>
          {/* Summary Cards */}
          {summary && (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Events</CardTitle>
                  <Shield className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{summary.total_events}</div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Failed Attempts</CardTitle>
                  <AlertTriangle className="h-4 w-4 text-red-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-red-500">{summary.failed_attempts}</div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Unique IPs</CardTitle>
                  <Eye className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{summary.unique_ips}</div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Risk Level</CardTitle>
                  <Shield className="h-4 w-4" />
                </CardHeader>
                <CardContent>
                  <div className={`text-2xl font-bold ${
                    summary.failed_attempts > 10 ? 'text-red-500' :
                    summary.failed_attempts > 5 ? 'text-yellow-500' : 'text-green-500'
                  }`}>
                    {summary.failed_attempts > 10 ? 'HIGH' :
                     summary.failed_attempts > 5 ? 'MEDIUM' : 'LOW'}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Recent Events */}
          <Card>
            <CardHeader>
              <CardTitle>Recent Security Events</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {events.slice(0, 20).map((event) => (
                  <div key={event.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center space-x-3">
                      {getActionIcon(event.action)}
                      <div>
                        <div className="font-medium">{event.action}</div>
                        <div className="text-sm text-muted-foreground">
                          IP: {event.ip_address || 'Unknown'} • {new Date(event.created_at).toLocaleString()}
                        </div>
                        {event.error_message && (
                          <div className="text-sm text-red-500">{event.error_message}</div>
                        )}
                      </div>
                    </div>
                    {getSeverityBadge(event.action, event.success)}
                  </div>
                ))}

                {events.length === 0 && (
                  <div className="text-center text-muted-foreground py-6">
                    Nenhum evento de segurança encontrado
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
};