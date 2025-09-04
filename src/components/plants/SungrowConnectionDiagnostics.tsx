import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { 
  CheckCircle2, 
  XCircle, 
  AlertTriangle, 
  Loader2, 
  Network, 
  Key, 
  Shield, 
  Database,
  RefreshCw,
  Eye,
  EyeOff
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useSungrowProfiles } from '@/hooks/useSungrowProfiles';

interface ConnectionTestResult {
  test: string;
  success: boolean;
  message: string;
  tokenLength?: number;
}

interface DiagnosticsResult {
  success: boolean;
  message: string;
  details: {
    testResults: ConnectionTestResult[];
    timestamp: string;
    authMode: string;
    plantsFound?: number;
    warning?: string;
    suggestions?: string[];
  };
}

export const SungrowConnectionDiagnostics: React.FC = () => {
  const { toast } = useToast();
  const { profiles, selectedProfile, loading: profilesLoading } = useSungrowProfiles();
  
  const [testing, setTesting] = useState(false);
  const [results, setResults] = useState<DiagnosticsResult | null>(null);
  const [showCredentials, setShowCredentials] = useState(false);
  const [testProgress, setTestProgress] = useState(0);

  const runDiagnostics = async () => {
    if (!selectedProfile) {
      toast({
        title: 'Erro',
        description: 'Selecione um perfil de credenciais para executar o diagnóstico.',
        variant: 'destructive'
      });
      return;
    }

    setTesting(true);
    setTestProgress(0);
    setResults(null);

    try {
      // Simular progresso do teste
      const progressInterval = setInterval(() => {
        setTestProgress(prev => Math.min(prev + 20, 90));
      }, 500);

      const config = {
        authMode: selectedProfile.auth_mode,
        username: selectedProfile.username,
        password: selectedProfile.password,
        appkey: selectedProfile.appkey,
        accessKey: selectedProfile.access_key,
        baseUrl: selectedProfile.base_url
      };

      const { data, error } = await supabase.functions.invoke('sungrow-connector', {
        body: {
          action: 'test_connection',
          config
        }
      });

      clearInterval(progressInterval);
      setTestProgress(100);

      if (error) {
        throw error;
      }

      setResults(data);
      
      toast({
        title: data.success ? 'Diagnóstico Concluído' : 'Problemas Detectados',
        description: data.message,
        variant: data.success ? 'default' : 'destructive'
      });
    } catch (error) {
      console.error('Diagnostics failed:', error);
      setResults({
        success: false,
        message: `Falha no diagnóstico: ${(error as Error).message}`,
        details: {
          testResults: [],
          timestamp: new Date().toISOString(),
          authMode: selectedProfile.auth_mode || 'unknown'
        }
      });
      
      toast({
        title: 'Erro no Diagnóstico',
        description: 'Falha ao executar diagnóstico de conexão.',
        variant: 'destructive'
      });
    } finally {
      setTesting(false);
      setTestProgress(0);
    }
  };

  const getTestIcon = (test: ConnectionTestResult) => {
    if (test.success) {
      return <CheckCircle2 className="w-4 h-4 text-success" />;
    }
    return <XCircle className="w-4 h-4 text-destructive" />;
  };

  const getTestVariant = (test: ConnectionTestResult) => {
    return test.success ? 'default' : 'destructive';
  };

  if (profilesLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin mr-2" />
          <span>Carregando perfis...</span>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Network className="w-5 h-5" />
            Diagnóstico de Conexão Sungrow
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {selectedProfile ? (
            <div className="space-y-4">
              <div className="p-4 bg-muted rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-medium">Perfil Selecionado: {selectedProfile.name}</h4>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowCredentials(!showCredentials)}
                  >
                    {showCredentials ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </Button>
                </div>
                
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="font-medium">Modo:</span> {selectedProfile.auth_mode}
                  </div>
                  <div>
                    <span className="font-medium">URL Base:</span> {selectedProfile.base_url}
                  </div>
                  {showCredentials && (
                    <>
                      <div>
                        <span className="font-medium">App Key:</span> {selectedProfile.appkey ? '***' : 'Não configurada'}
                      </div>
                      <div>
                        <span className="font-medium">Access Key:</span> {selectedProfile.access_key ? '***' : 'Não configurada'}
                      </div>
                      {selectedProfile.username && (
                        <div>
                          <span className="font-medium">Username:</span> {selectedProfile.username}
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>

              <Button 
                onClick={runDiagnostics} 
                disabled={testing}
                className="w-full"
              >
                {testing ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    Executando Diagnóstico...
                  </>
                ) : (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Executar Diagnóstico Completo
                  </>
                )}
              </Button>

              {testing && (
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Progresso do teste</span>
                    <span>{testProgress}%</span>
                  </div>
                  <Progress value={testProgress} />
                </div>
              )}
            </div>
          ) : (
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                Nenhum perfil selecionado. Selecione um perfil de credenciais Sungrow para executar o diagnóstico.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {results && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {results.success ? (
                <CheckCircle2 className="w-5 h-5 text-success" />
              ) : (
                <XCircle className="w-5 h-5 text-destructive" />
              )}
              Resultados do Diagnóstico
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="results" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="results">Resultados</TabsTrigger>
                <TabsTrigger value="details">Detalhes</TabsTrigger>
                <TabsTrigger value="suggestions">Sugestões</TabsTrigger>
              </TabsList>
              
              <TabsContent value="results" className="space-y-4">
                <Alert variant={results.success ? 'default' : 'destructive'}>
                  <AlertDescription className="font-medium">
                    {results.message}
                  </AlertDescription>
                </Alert>

                <div className="space-y-3">
                  {results.details.testResults?.map((test, index) => (
                    <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center gap-3">
                        {getTestIcon(test)}
                        <div>
                          <div className="font-medium capitalize">
                            {test.test.replace(/_/g, ' ')}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {test.message}
                          </div>
                        </div>
                      </div>
                      <Badge variant={getTestVariant(test)}>
                        {test.success ? 'OK' : 'Falhou'}
                      </Badge>
                    </div>
                  ))}
                </div>
              </TabsContent>
              
              <TabsContent value="details" className="space-y-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="font-medium">Timestamp:</span> {new Date(results.details.timestamp).toLocaleString()}
                  </div>
                  <div>
                    <span className="font-medium">Modo Auth:</span> {results.details.authMode}
                  </div>
                  {results.details.plantsFound !== undefined && (
                    <div>
                      <span className="font-medium">Plantas Encontradas:</span> {results.details.plantsFound}
                    </div>
                  )}
                  {results.details.warning && (
                    <div className="col-span-2">
                      <Alert variant="destructive">
                        <AlertTriangle className="h-4 w-4" />
                        <AlertDescription>{results.details.warning}</AlertDescription>
                      </Alert>
                    </div>
                  )}
                </div>
              </TabsContent>
              
              <TabsContent value="suggestions" className="space-y-4">
                {results.details.suggestions?.length ? (
                  <div className="space-y-2">
                    <h4 className="font-medium">Sugestões de Correção:</h4>
                    <ul className="space-y-2">
                      {results.details.suggestions.map((suggestion, index) => (
                        <li key={index} className="flex items-start gap-2">
                          <div className="w-2 h-2 bg-primary rounded-full mt-2 flex-shrink-0" />
                          <span className="text-sm">{suggestion}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : (
                  <Alert>
                    <AlertDescription>
                      {results.success 
                        ? 'Conexão funcionando corretamente. Nenhuma ação necessária.'
                        : 'Nenhuma sugestão específica disponível. Verifique as credenciais e configurações no portal Sungrow.'
                      }
                    </AlertDescription>
                  </Alert>
                )}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      )}
    </div>
  );
};