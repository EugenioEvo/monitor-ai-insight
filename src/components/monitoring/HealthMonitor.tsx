/**
 * Health Monitor - Componente para observabilidade do sistema
 * Monitora status de APIs, autenticação e performance
 */

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Activity, 
  Wifi, 
  WifiOff, 
  Clock, 
  AlertTriangle, 
  CheckCircle,
  RefreshCw,
  Database,
  Zap
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { envValidator } from '@/services/env-validator';
import { logger } from '@/services/logger';

interface HealthStatus {
  id: string;
  name: string;
  status: 'healthy' | 'warning' | 'critical' | 'unknown';
  latency?: number;
  message?: string;
  lastChecked: Date;
}

interface SystemMetrics {
  totalRequests: number;
  failedRequests: number;
  averageLatency: number;
  uptime: string;
}

export const HealthMonitor: React.FC = () => {
  const { user, session } = useAuth();
  const [healthChecks, setHealthChecks] = useState<HealthStatus[]>([]);
  const [metrics, setMetrics] = useState<SystemMetrics>({
    totalRequests: 0,
    failedRequests: 0,
    averageLatency: 0,
    uptime: '0s'
  });
  const [isChecking, setIsChecking] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);

  const performHealthCheck = async (checkId: string, name: string, checkFn: () => Promise<{ status: HealthStatus['status'], latency?: number, message?: string }>) => {
    const startTime = performance.now();
    
    try {
      const result = await checkFn();
      const endTime = performance.now();
      
      return {
        id: checkId,
        name,
        status: result.status,
        latency: result.latency || (endTime - startTime),
        message: result.message,
        lastChecked: new Date()
      };
    } catch (error) {
      const endTime = performance.now();
      logger.error(`Health check failed: ${name}`, error as Error, {
        component: 'HealthMonitor',
        checkId
      });
      
      return {
        id: checkId,
        name,
        status: 'critical' as const,
        latency: endTime - startTime,
        message: (error as Error).message,
        lastChecked: new Date()
      };
    }
  };

  const runAllHealthChecks = async () => {
    setIsChecking(true);
    
    try {
      const checks = await Promise.all([
        // Supabase Database Check
        performHealthCheck('supabase_db', 'Supabase Database', async () => {
          const { data, error } = await supabase.from('plants').select('count', { count: 'exact' }).limit(1);
          
          if (error) {
            return { status: 'critical', message: error.message };
          }
          
          return { status: 'healthy', message: `${data?.length || 0} plants found` };
        }),

        // Authentication Check
        performHealthCheck('auth', 'Authentication', async () => {
          if (!user || !session) {
            return { status: 'warning', message: 'User not authenticated' };
          }

          const { data: { user: currentUser }, error } = await supabase.auth.getUser();
          
          if (error) {
            return { status: 'critical', message: error.message };
          }
          
          return { 
            status: 'healthy', 
            message: `Authenticated as ${currentUser?.email}` 
          };
        }),

        // Sungrow Edge Function Check
        performHealthCheck('sungrow_function', 'Sungrow Connector', async () => {
          try {
            const { data: session } = await supabase.auth.getSession();
            const { data, error } = await supabase.functions.invoke('sungrow-connector', {
              body: { action: 'test_connection', config: { username: 'test', password: 'test', appkey: 'test', accessKey: 'test' } },
              headers: { Authorization: `Bearer ${session?.session?.access_token}` }
            });

            if (error) {
              return { status: 'warning', message: error.message };
            }
            
            return { 
              status: data?.success ? 'healthy' : 'warning', 
              message: data?.error || 'Function responding' 
            };
          } catch (error) {
            return { status: 'critical', message: (error as Error).message };
          }
        }),

        // Environment Check
        performHealthCheck('environment', 'Environment Config', async () => {
          const healthCheck = envValidator.healthCheck();
          
          return {
            status: healthCheck.status === 'healthy' ? 'healthy' : 
                   healthCheck.status === 'warning' ? 'warning' : 'critical',
            message: healthCheck.issues.length > 0 ? healthCheck.issues.join(', ') : 'All configs valid'
          };
        }),

        // Local Storage Check
        performHealthCheck('storage', 'Local Storage', async () => {
          try {
            const testKey = '_health_check_test';
            localStorage.setItem(testKey, 'test');
            const retrieved = localStorage.getItem(testKey);
            localStorage.removeItem(testKey);
            
            if (retrieved !== 'test') {
              return { status: 'warning', message: 'Storage read/write issues' };
            }
            
            return { status: 'healthy', message: 'Storage working correctly' };
          } catch (error) {
            return { status: 'critical', message: 'Storage unavailable' };
          }
        })
      ]);

      setHealthChecks(checks);
      
      // Update metrics
      const totalChecks = checks.length;
      const failedChecks = checks.filter(c => c.status === 'critical').length;
      const avgLatency = checks.reduce((sum, c) => sum + (c.latency || 0), 0) / totalChecks;
      
      setMetrics(prev => ({
        totalRequests: prev.totalRequests + totalChecks,
        failedRequests: prev.failedRequests + failedChecks,
        averageLatency: Math.round(avgLatency),
        uptime: prev.uptime // Simplified uptime tracking
      }));

    } catch (error) {
      logger.error('Health check batch failed', error as Error, {
        component: 'HealthMonitor'
      });
    } finally {
      setIsChecking(false);
    }
  };

  useEffect(() => {
    runAllHealthChecks();
    
    if (autoRefresh) {
      const interval = setInterval(runAllHealthChecks, 30000); // 30 seconds
      return () => clearInterval(interval);
    }
  }, [autoRefresh]);

  const getStatusIcon = (status: HealthStatus['status']) => {
    switch (status) {
      case 'healthy': return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'warning': return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      case 'critical': return <WifiOff className="h-4 w-4 text-red-500" />;
      default: return <Activity className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusBadge = (status: HealthStatus['status']) => {
    const variants = {
      healthy: 'default',
      warning: 'secondary',
      critical: 'destructive',
      unknown: 'outline'
    } as const;
    
    return <Badge variant={variants[status]}>{status}</Badge>;
  };

  const overallStatus = healthChecks.length === 0 ? 'unknown' :
    healthChecks.some(c => c.status === 'critical') ? 'critical' :
    healthChecks.some(c => c.status === 'warning') ? 'warning' : 'healthy';

  return (
    <div className="space-y-6">
      {/* Overall Status */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {getStatusIcon(overallStatus)}
              <div>
                <CardTitle>Monitor.AI System Status</CardTitle>
                <CardDescription>
                  Overall system health and performance metrics
                </CardDescription>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {getStatusBadge(overallStatus)}
              <Button
                onClick={runAllHealthChecks}
                disabled={isChecking}
                size="sm"
                variant="outline"
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${isChecking ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Health Checks */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {healthChecks.map((check) => (
          <Card key={check.id}>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {getStatusIcon(check.status)}
                  <CardTitle className="text-sm">{check.name}</CardTitle>
                </div>
                {getStatusBadge(check.status)}
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="space-y-1 text-sm">
                {check.message && (
                  <p className="text-muted-foreground">{check.message}</p>
                )}
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Latency: {Math.round(check.latency || 0)}ms</span>
                  <span>{check.lastChecked.toLocaleTimeString()}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* System Metrics */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Performance Metrics
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold">{metrics.totalRequests}</div>
              <div className="text-sm text-muted-foreground">Total Requests</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-red-500">{metrics.failedRequests}</div>
              <div className="text-sm text-muted-foreground">Failed Requests</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold">{metrics.averageLatency}ms</div>
              <div className="text-sm text-muted-foreground">Avg Latency</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-500">
                {Math.round((Date.now() - performance.timeOrigin) / 1000)}s
              </div>
              <div className="text-sm text-muted-foreground">Session Uptime</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Auto-refresh Toggle */}
      <div className="flex justify-center">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setAutoRefresh(!autoRefresh)}
        >
          <Clock className="h-4 w-4 mr-2" />
          Auto-refresh: {autoRefresh ? 'ON' : 'OFF'}
        </Button>
      </div>
    </div>
  );
};

export default HealthMonitor;