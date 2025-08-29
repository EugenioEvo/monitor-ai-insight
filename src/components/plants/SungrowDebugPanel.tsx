import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, CheckCircle, Loader2, Wifi, WifiOff, TestTube, Activity, TrendingUp } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { SungrowDiagnosticPanel } from './SungrowDiagnosticPanel';
import { useSungrowDiagnostics } from '@/hooks/useSungrowDiagnostics';

export const SungrowDebugPanel = () => {
  const { toast } = useToast();
  const { metrics, runHealthCheck } = useSungrowDiagnostics();
  const [loading, setLoading] = useState(false);
  const [testResult, setTestResult] = useState<any>(null);
  const [discoveryResult, setDiscoveryResult] = useState<any>(null);
  const [healthStatus, setHealthStatus] = useState<any>(null);
  
  const [config, setConfig] = useState({
    username: '',
    password: '',
    appkey: '',
    accessKey: '',
    baseUrl: 'https://gateway.isolarcloud.com.hk'
  });

  const testAuthentication = async () => {
    setLoading(true);
    setTestResult(null);
    
    try {
      console.log('Testando autenticação Sungrow...', {
        username: config.username ? `${config.username.substring(0, 3)}***` : 'empty',
        hasAppkey: !!config.appkey,
        hasAccessKey: !!config.accessKey,
        baseUrl: config.baseUrl
      });

      const { data: session } = await supabase.auth.getSession();
      const { data, error } = await supabase.functions.invoke('sungrow-connector', {
        body: {
          action: 'test_connection',
          config: config
        },
        headers: { Authorization: `Bearer ${session?.session?.access_token}` }
      });

      console.log('Resposta recebida:', { data, error });

      if (error) {
        throw new Error(`Erro na função: ${error.message}`);
      }

      setTestResult(data);
      
      if (data.success) {
        toast({
          title: "✅ Teste bem-sucedido!",
          description: "Credenciais Sungrow válidas",
        });
      } else {
        toast({
          title: "❌ Teste falhou",
          description: data.error || 'Erro desconhecido',
          variant: "destructive",
        });
      }
    } catch (error: any) {
      console.error('Erro no teste:', error);
      setTestResult({ success: false, error: error.message });
      toast({
        title: "❌ Erro no teste",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const discoverPlants = async () => {
    if (!testResult?.success) {
      toast({
        title: "Teste primeiro",
        description: "Execute o teste de conexão antes de descobrir plantas",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    setDiscoveryResult(null);
    
    try {
      console.log('Descobrindo plantas Sungrow...');

      const { data: session } = await supabase.auth.getSession();
      const { data, error } = await supabase.functions.invoke('sungrow-connector', {
        body: {
          action: 'discover_plants',
          config: config
        },
        headers: { Authorization: `Bearer ${session?.session?.access_token}` }
      });

      console.log('Plantas descobertas:', { data, error });

      if (error) {
        throw new Error(`Erro na função: ${error.message}`);
      }

      setDiscoveryResult(data);
      
      if (data.success) {
        toast({
          title: "✅ Plantas descobertas!",
          description: `${data.plants?.length || 0} plantas encontradas`,
        });
      } else {
        toast({
          title: "❌ Descoberta falhou",
          description: data.error || 'Erro desconhecido',
          variant: "destructive",
        });
      }
    } catch (error: any) {
      console.error('Erro na descoberta:', error);
      setDiscoveryResult({ success: false, error: error.message });
      toast({
        title: "❌ Erro na descoberta",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const checkSystemHealth = async () => {
    setLoading(true);
    try {
      const health = await runHealthCheck();
      setHealthStatus(health);
      
      toast({
        title: `Sistema ${health.status === 'healthy' ? 'Saudável' : health.status === 'degraded' ? 'Degradado' : 'Com Problemas'}`,
        description: `${health.issues.length} problemas encontrados`,
        variant: health.status === 'healthy' ? 'default' : 'destructive'
      });
    } catch (error: any) {
      toast({
        title: 'Erro no health check',
        description: error.message,
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Health Status Card */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              <TestTube className="w-5 h-5" />
              <div>
                <CardTitle>Sistema de Diagnóstico Sungrow</CardTitle>
                <CardDescription>
                  Teste credenciais e monitore saúde da conectividade
                </CardDescription>
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={checkSystemHealth} disabled={loading}>
                <Activity className="w-4 h-4 mr-2" />
                Health Check
              </Button>
              {metrics && (
                <Badge variant={metrics.successRate > 80 ? "default" : metrics.successRate > 50 ? "secondary" : "destructive"}>
                  <TrendingUp className="w-3 h-3 mr-1" />
                  {metrics.successRate.toFixed(1)}% Success
                </Badge>
              )}
            </div>
          </div>
          {healthStatus && (
            <div className="mt-4 p-3 border rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                {healthStatus.status === 'healthy' ? 
                  <CheckCircle className="w-4 h-4 text-green-500" /> : 
                  <AlertCircle className="w-4 h-4 text-red-500" />
                }
                <span className="font-medium">
                  Status: {healthStatus.status === 'healthy' ? 'Saudável' : 
                           healthStatus.status === 'degraded' ? 'Degradado' : 'Com Problemas'}
                </span>
              </div>
              {healthStatus.issues.length > 0 && (
                <div className="text-sm text-red-600 mb-2">
                  <strong>Problemas:</strong> {healthStatus.issues.join(', ')}
                </div>
              )}
              {healthStatus.recommendations.length > 0 && (
                <div className="text-sm text-blue-600">
                  <strong>Recomendações:</strong> {healthStatus.recommendations.join(', ')}
                </div>
              )}
            </div>
          )}
        </CardHeader>
      </Card>

      <Tabs defaultValue="test" className="space-y-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="test">Teste de Conexão</TabsTrigger>
          <TabsTrigger value="discover">Descobrir Plantas</TabsTrigger>
          <TabsTrigger value="diagnostics">Diagnóstico Avançado</TabsTrigger>
        </TabsList>

        <TabsContent value="test" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Credenciais Sungrow</CardTitle>
              <CardDescription>
                Insira as mesmas credenciais que funcionavam na semana passada
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="username">Usuário (Email)</Label>
                  <Input
                    id="username"
                    value={config.username}
                    onChange={(e) => setConfig(prev => ({ ...prev, username: e.target.value }))}
                    placeholder="seu-email@exemplo.com"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Senha</Label>
                  <Input
                    id="password"
                    type="password"
                    value={config.password}
                    onChange={(e) => setConfig(prev => ({ ...prev, password: e.target.value }))}
                    placeholder="Sua senha"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="appkey">App Key</Label>
                  <Input
                    id="appkey"
                    value={config.appkey}
                    onChange={(e) => setConfig(prev => ({ ...prev, appkey: e.target.value }))}
                    placeholder="Chave da aplicação"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="accesskey">Access Key Value</Label>
                  <Input
                    id="accesskey"
                    type="password"
                    value={config.accessKey}
                    onChange={(e) => setConfig(prev => ({ ...prev, accessKey: e.target.value }))}
                    placeholder="Valor da chave de acesso"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="baseurl">Base URL</Label>
                <Input
                  id="baseurl"
                  value={config.baseUrl}
                  onChange={(e) => setConfig(prev => ({ ...prev, baseUrl: e.target.value }))}
                  placeholder="https://gateway.isolarcloud.com.hk"
                />
              </div>

              <Button 
                onClick={testAuthentication} 
                disabled={loading || !config.username || !config.password || !config.appkey || !config.accessKey}
                className="w-full"
              >
                {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Wifi className="w-4 h-4 mr-2" />}
                Testar Autenticação
              </Button>

              {testResult && (
                <Card className={testResult.success ? "border-green-200 bg-green-50" : "border-red-200 bg-red-50"}>
                  <CardContent className="pt-4">
                    <div className="flex items-center gap-2 mb-2">
                      {testResult.success ? 
                        <CheckCircle className="w-5 h-5 text-green-600" /> : 
                        <AlertCircle className="w-5 h-5 text-red-600" />
                      }
                      <span className={`font-medium ${testResult.success ? 'text-green-700' : 'text-red-700'}`}>
                        {testResult.success ? 'Autenticação bem-sucedida!' : 'Falha na autenticação'}
                      </span>
                    </div>
                    {testResult.error && (
                      <p className="text-sm text-red-600">{testResult.error}</p>
                    )}
                    <details className="mt-2">
                      <summary className="text-sm cursor-pointer">Ver resposta completa</summary>
                      <pre className="text-xs mt-2 p-2 bg-gray-100 rounded overflow-auto">
                        {JSON.stringify(testResult, null, 2)}
                      </pre>
                    </details>
                  </CardContent>
                </Card>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="discover" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Descobrir Plantas</CardTitle>
              <CardDescription>
                Após a autenticação bem-sucedida, descubra as plantas disponíveis
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button 
                onClick={discoverPlants} 
                disabled={loading || !testResult?.success}
                className="w-full"
              >
                {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <CheckCircle className="w-4 h-4 mr-2" />}
                Descobrir Plantas
              </Button>

              {discoveryResult && (
                <Card className={discoveryResult.success ? "border-green-200 bg-green-50" : "border-red-200 bg-red-50"}>
                  <CardContent className="pt-4">
                    <div className="flex items-center gap-2 mb-2">
                      {discoveryResult.success ? 
                        <CheckCircle className="w-5 h-5 text-green-600" /> : 
                        <AlertCircle className="w-5 h-5 text-red-600" />
                      }
                      <span className={`font-medium ${discoveryResult.success ? 'text-green-700' : 'text-red-700'}`}>
                        {discoveryResult.success ? 
                          `${discoveryResult.plants?.length || 0} plantas encontradas` : 
                          'Falha na descoberta'
                        }
                      </span>
                    </div>
                    
                    {discoveryResult.plants && discoveryResult.plants.length > 0 && (
                      <div className="mt-4 space-y-2">
                        <h4 className="font-medium">Plantas encontradas:</h4>
                        {discoveryResult.plants.map((plant: any, index: number) => (
                          <div key={index} className="p-2 bg-white rounded border">
                            <div className="font-medium">{plant.name}</div>
                            <div className="text-sm text-gray-600">
                              ID: {plant.id} | Capacidade: {plant.capacity} kW | Local: {plant.location}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {discoveryResult.error && (
                      <p className="text-sm text-red-600">{discoveryResult.error}</p>
                    )}
                    
                    <details className="mt-2">
                      <summary className="text-sm cursor-pointer">Ver resposta completa</summary>
                      <pre className="text-xs mt-2 p-2 bg-gray-100 rounded overflow-auto">
                        {JSON.stringify(discoveryResult, null, 2)}
                      </pre>
                    </details>
                  </CardContent>
                </Card>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="diagnostics" className="space-y-4">
          <SungrowDiagnosticPanel />
        </TabsContent>
      </Tabs>
    </div>
  );
};