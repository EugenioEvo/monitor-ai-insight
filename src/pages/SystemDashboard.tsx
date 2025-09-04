import React from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { SystemHealthDashboard } from '@/components/monitoring/SystemHealthDashboard';
import { PerformanceTracker } from '@/components/performance/PerformanceTracker';
import { 
  Activity, 
  Database, 
  Shield, 
  Zap, 
  TrendingUp, 
  AlertTriangle,
  CheckCircle,
  Clock
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { Alert, AlertDescription } from '@/components/ui/alert';

const SystemDashboard = () => {
  const { isAdmin } = useAuth();

  if (!isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Alert className="max-w-md">
          <Shield className="h-4 w-4" />
          <AlertDescription>
            Acesso negado. Apenas administradores podem acessar o dashboard do sistema.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-responsive-3xl font-bold">Sistema Dashboard</h1>
          <p className="text-muted-foreground text-lg">
            Monitoramento completo da infraestrutura Monitor.ai
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="bg-success text-white border-0">
            <CheckCircle className="w-3 h-3 mr-1" />
            Sistema Operacional
          </Badge>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="hover-lift">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold text-success">99.9%</div>
                <div className="text-sm text-muted-foreground">Uptime</div>
              </div>
              <div className="w-12 h-12 bg-gradient-primary rounded-xl flex items-center justify-center">
                <Activity className="w-6 h-6 text-white" />
              </div>
            </div>
            <div className="mt-4 flex items-center text-xs text-success">
              <TrendingUp className="w-3 h-3 mr-1" />
              +0.1% esta semana
            </div>
          </CardContent>
        </Card>

        <Card className="hover-lift">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold text-primary">245ms</div>
                <div className="text-sm text-muted-foreground">Tempo Resposta</div>
              </div>
              <div className="w-12 h-12 bg-gradient-secondary rounded-xl flex items-center justify-center">
                <Zap className="w-6 h-6 text-white" />
              </div>
            </div>
            <div className="mt-4 flex items-center text-xs text-success">
              <TrendingUp className="w-3 h-3 mr-1" />
              -15ms esta semana
            </div>
          </CardContent>
        </Card>

        <Card className="hover-lift">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold text-secondary">128</div>
                <div className="text-sm text-muted-foreground">Conexões Ativas</div>
              </div>
              <div className="w-12 h-12 bg-gradient-accent rounded-xl flex items-center justify-center">
                <Database className="w-6 h-6 text-white" />
              </div>
            </div>
            <div className="mt-4 flex items-center text-xs text-warning">
              <TrendingUp className="w-3 h-3 mr-1" />
              +12 conexões
            </div>
          </CardContent>
        </Card>

        <Card className="hover-lift">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold text-accent">0.02%</div>
                <div className="text-sm text-muted-foreground">Taxa de Erro</div>
              </div>
              <div className="w-12 h-12 bg-success rounded-xl flex items-center justify-center">
                <Shield className="w-6 h-6 text-white" />
              </div>
            </div>
            <div className="mt-4 flex items-center text-xs text-success">
              <TrendingUp className="w-3 h-3 mr-1" />
              -0.01% esta semana
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Tabs */}
      <Tabs defaultValue="health" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="health" className="flex items-center gap-2">
            <Activity className="w-4 h-4" />
            Saúde do Sistema
          </TabsTrigger>
          <TabsTrigger value="performance" className="flex items-center gap-2">
            <Zap className="w-4 h-4" />
            Performance
          </TabsTrigger>
          <TabsTrigger value="backup" className="flex items-center gap-2">
            <Database className="w-4 h-4" />
            Backup & Recovery
          </TabsTrigger>
        </TabsList>

        <TabsContent value="health">
          <SystemHealthDashboard />
        </TabsContent>

        <TabsContent value="performance">
          <div className="text-center py-8">
            <Zap className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-muted-foreground">Performance Tracker em desenvolvimento</p>
          </div>
        </TabsContent>

        <TabsContent value="backup">
          <div className="text-center py-8">
            <Database className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-muted-foreground">Backup Manager em desenvolvimento</p>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default SystemDashboard;