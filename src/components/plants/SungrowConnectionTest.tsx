
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, CheckCircle, Loader2, Wifi, WifiOff } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import type { SungrowConfig } from '@/types/sungrow';
import { useLogger } from '@/services/logger';
import { useErrorHandler } from '@/services/errorHandler';
import { LoadingSpinner } from '@/components/ui/loading-states';

interface SungrowConnectionTestProps {
  onConnectionSuccess?: (config: SungrowConfig) => void;
}

export const SungrowConnectionTest = ({ onConnectionSuccess }: SungrowConnectionTestProps) => {
  const { toast } = useToast();
  const logger = useLogger('SungrowConnectionTest');
  const errorHandler = useErrorHandler('SungrowConnectionTest');
  
  const [loading, setLoading] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');
  const [errorDetails, setErrorDetails] = useState<string>('');
  const [oauthLoading, setOauthLoading] = useState(false);
  
  const [config, setConfig] = useState<SungrowConfig>({
    authMode: 'direct',
    username: '',
    password: '',
    appkey: '',
    accessKey: '',
    plantId: '',
    baseUrl: 'https://gateway.isolarcloud.com.hk'
  });

  const validateConfig = () => {
    const missingFields = [];
    if (!config.username) missingFields.push('Usuário');
    if (!config.password) missingFields.push('Senha');
    if (!config.appkey) missingFields.push('App Key');
    if (!config.accessKey) missingFields.push('Access Key');
    
    if (missingFields.length > 0) {
      toast({
        title: "Campos obrigatórios não preenchidos",
        description: `Por favor, preencha: ${missingFields.join(', ')}`,
        variant: "destructive",
      });
      return false;
    }
    return true;
  };

  const testConnection = async () => {
    if (!validateConfig()) return;
    
    const context = logger.createContext({ action: 'test_connection' });
    
    await errorHandler.executeWithRetry(
      async () => {
        setLoading(true);
        setConnectionStatus('testing');
        setErrorDetails('');
        
        logger.info('Testando conexão Sungrow', {
          ...context,
          hasCredentials: !!(config.appkey && config.accessKey)
        });

        // Remover plantId da config para teste de conexão
        const testConfig = { ...config };
        delete testConfig.plantId;

        const { data, error } = await supabase.functions.invoke('sungrow-connector', {
          body: {
            action: 'test_connection',
            config: {
              authMode: 'direct',
              baseUrl: '', // Clear baseUrl for direct authentication  
              ...testConfig
            }
          }
        });

        if (error) {
          logger.error('Erro na função Supabase', error, context);
          throw new Error(`Erro na função: ${error.message}`);
        }

        logger.info('Resposta do teste recebida', {
          ...context,
          success: data?.success,
          message: data?.message
        });

        if (data.success) {
          setConnectionStatus('success');
          toast({
            title: "Conexão bem-sucedida!",
            description: data.message || "Credenciais validadas com sucesso.",
          });
          onConnectionSuccess?.(config);
          logger.info('Teste de conexão bem-sucedido', context);
        } else {
          throw new Error(data.error || data.message || 'Erro desconhecido');
        }
      },
      'test_connection',
      {
        maxAttempts: 2,
        baseDelay: 1500
      }
    ).catch((error) => {
      setConnectionStatus('error');
      setErrorDetails(error.message);
      errorHandler.handleError(error, 'test_connection');
    }).finally(() => {
      setLoading(false);
    });
  };

  // OAuth 2.0 fallback: generate auth URL and handle callback
  const redirectUri = `${window.location.origin}/plants?oauth=callback`;

  const generateOAuthAuthorization = async () => {
    if (!config.appkey || !config.accessKey) {
      toast({
        title: 'Configuração incompleta',
        description: 'Preencha App Key e Access Key para continuar.',
        variant: 'destructive',
      });
      return;
    }
    try {
      setOauthLoading(true);
      const state = `sungrow_oauth_${Date.now()}`;
      const { data, error } = await supabase.functions.invoke('sungrow-connector', {
        body: {
          action: 'generate_oauth_url',
          config: { authMode: 'oauth2', appkey: config.appkey, accessKey: config.accessKey, baseUrl: '' },
          redirectUri,
          state,
        },
      });
      if (error) throw new Error(error.message);
      if (data.success && data.authUrl) {
        window.location.href = data.authUrl as string;
      } else {
        throw new Error(data.error || 'Falha ao gerar URL de autorização');
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro desconhecido';
      toast({ title: 'Erro na autorização', description: message, variant: 'destructive' });
    } finally {
      setOauthLoading(false);
    }
  };

  const exchangeAuthorizationCode = async (code: string) => {
    try {
      setOauthLoading(true);
      const { data, error } = await supabase.functions.invoke('sungrow-connector', {
        body: {
          action: 'exchange_code',
          config: { authMode: 'oauth2', appkey: config.appkey, accessKey: config.accessKey, baseUrl: '' },
          code,
          redirectUri,
        },
      });
      if (error) throw new Error(error.message);
      if (data.success && data.tokens) {
        const tokenData = data.tokens as {
          access_token: string; refresh_token: string; expires_in: number; authorized_plants?: string[];
        };
        const oauthConfig: SungrowConfig = {
          authMode: 'oauth2',
          appkey: config.appkey,
          accessKey: config.accessKey,
          accessToken: tokenData.access_token,
          refreshToken: tokenData.refresh_token,
          tokenExpiresAt: Date.now() + tokenData.expires_in * 1000,
          authorizedPlants: tokenData.authorized_plants || [],
          username: '', password: '', plantId: '', baseUrl: ''
        } as any;
        setConnectionStatus('success');
        toast({ title: 'Autorização concluída!', description: `Plantas autorizadas: ${oauthConfig.authorizedPlants?.length || 0}` });
        onConnectionSuccess?.(oauthConfig);
      } else {
        throw new Error(data.error || 'Falha na troca do código por tokens');
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro desconhecido';
      setConnectionStatus('error');
      setErrorDetails(message);
      toast({ title: 'Erro na autorização', description: message, variant: 'destructive' });
    } finally {
      setOauthLoading(false);
      // limpar query params
      const cleanUrl = window.location.origin + window.location.pathname;
      window.history.replaceState({}, document.title, cleanUrl);
    }
  };

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get('code');
    const error = params.get('error');
    if (error) {
      setConnectionStatus('error');
      setErrorDetails(`Autorização negada: ${error}`);
    } else if (code) {
      exchangeAuthorizationCode(code);
    }
  }, []);

  const getStatusIcon = () => {
    switch (connectionStatus) {
      case 'testing':
        return <Loader2 className="w-5 h-5 animate-spin text-blue-500" />;
      case 'success':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'error':
        return <AlertCircle className="w-5 h-5 text-red-500" />;
      default:
        return <Wifi className="w-5 h-5 text-gray-400" />;
    }
  };

  const getStatusBadge = () => {
    switch (connectionStatus) {
      case 'testing':
        return <Badge variant="outline" className="text-blue-600"><Loader2 className="w-3 h-3 mr-1 animate-spin" />Testando...</Badge>;
      case 'success':
        return <Badge variant="default" className="bg-green-600"><CheckCircle className="w-3 h-3 mr-1" />Conectado</Badge>;
      case 'error':
        return <Badge variant="destructive"><WifiOff className="w-3 h-3 mr-1" />Erro</Badge>;
      default:
        return <Badge variant="secondary">Não testado</Badge>;
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-start">
          <div className="flex items-center gap-2">
            {getStatusIcon()}
            <div>
              <CardTitle>Teste de Conexão Sungrow</CardTitle>
              <CardDescription>
                Teste suas credenciais da API Sungrow OpenAPI
              </CardDescription>
            </div>
          </div>
          {getStatusBadge()}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="sg-username">Usuário iSolarCloud</Label>
            <Input
              id="sg-username"
              value={config.username}
              onChange={(e) => setConfig(prev => ({ ...prev, username: e.target.value }))}
              placeholder="Seu usuário do portal iSolarCloud"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="sg-password">Senha</Label>
            <Input
              id="sg-password"
              type="password"
              value={config.password}
              onChange={(e) => setConfig(prev => ({ ...prev, password: e.target.value }))}
              placeholder="Sua senha do portal"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="sg-appkey">App Key</Label>
            <Input
              id="sg-appkey"
              value={config.appkey}
              onChange={(e) => setConfig(prev => ({ ...prev, appkey: e.target.value }))}
              placeholder="Chave da aplicação obtida no portal"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="sg-accesskey">Access Key Value</Label>
            <Input
              id="sg-accesskey"
              type="password"
              value={config.accessKey}
              onChange={(e) => setConfig(prev => ({ ...prev, accessKey: e.target.value }))}
              placeholder="Valor da chave de acesso"
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="sg-baseurl">Base URL (opcional)</Label>
          <Input
            id="sg-baseurl"
            value={config.baseUrl}
            onChange={(e) => setConfig(prev => ({ ...prev, baseUrl: e.target.value }))}
            placeholder="URL base da API (padrão: gateway.isolarcloud.com.hk)"
          />
        </div>

        {errorDetails && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-md">
            <p className="text-sm text-red-800 font-medium">Detalhes do erro:</p>
            <p className="text-sm text-red-700 mt-1">{errorDetails}</p>
            
            {errorDetails.includes('E900') && (
              <div className="mt-2 text-xs text-red-600">
                <strong>Possíveis soluções:</strong>
                <br />• Verifique se a Access Key está correta
                <br />• Confirme se o OpenAPI está habilitado no iSolarCloud  
                <br />• Considere usar OAuth 2.0 se o login direto não funcionar
                <div className="mt-3">
                  <Button 
                    variant="outline"
                    onClick={generateOAuthAuthorization}
                    disabled={oauthLoading || !config.appkey || !config.accessKey}
                    className="h-8"
                  >
                    {oauthLoading ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : null}
                    Autorizar via OAuth 2.0
                  </Button>
                </div>
              </div>
            )}
            {errorDetails.includes('E912') && (
              <div className="mt-2 text-xs text-red-600">
                <strong>Ação recomendada:</strong>
                <br />• Copie novamente a Access Key Value do portal iSolarCloud
                <br />• Certifique-se de não incluir espaços ou texto extra
              </div>
            )}
            {errorDetails.includes('Method Not Allowed') && (
              <div className="mt-2 text-xs text-red-600">
                <strong>Problema identificado:</strong>
                <br />• Base URL incorreta - tente deixar vazia ou use OAuth 2.0
                <br />• Para login direto, use: gateway.isolarcloud.com.hk
              </div>
            )}
          </div>
        )}

        <div className="flex gap-2 pt-4">
            <Button 
              onClick={testConnection} 
              disabled={loading}
              className="flex-1"
            >
              {loading ? (
                <LoadingSpinner size="sm" message="Testando..." />
              ) : (
                "Testar Conexão"
              )}
            </Button>
        </div>

        <div className="text-sm text-muted-foreground space-y-1">
          <p><strong>Dica:</strong> Você pode obter suas credenciais no portal Sungrow:</p>
          <p>• Usuário e Senha: mesmos do seu login no iSolarCloud</p>
          <p>• App Key e Access Key: obtidos na seção Developer Center do portal</p>
          <p>• Para OAuth 2.0: registre sua aplicação e configure a Redirect URI</p>
          <p><strong>Problemas comuns:</strong> E900 = credenciais inválidas, E912 = Access Key incorreta</p>
        </div>
      </CardContent>
    </Card>
  );
};
