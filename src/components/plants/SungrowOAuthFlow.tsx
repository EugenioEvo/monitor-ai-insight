import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Shield, 
  ExternalLink, 
  CheckCircle, 
  AlertCircle, 
  Loader2, 
  Key,
  Users,
  Clock,
  RefreshCw
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import type { SungrowConfig } from '@/types/sungrow';
import { useLogger } from '@/services/logger';
import { LoadingSpinner } from '@/components/ui/loading-states';

interface SungrowOAuthFlowProps {
  onAuthSuccess?: (tokens: any, authorizedPlants: string[]) => void;
  onConfigChange?: (config: SungrowConfig) => void;
  initialConfig?: Partial<SungrowConfig>;
}

interface OAuthTokens {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  token_type: string;
  authorized_plants: string[];
  expires_at: Date;
}

export const SungrowOAuthFlow = ({ 
  onAuthSuccess, 
  onConfigChange,
  initialConfig = {}
}: SungrowOAuthFlowProps) => {
  const { toast } = useToast();
  const logger = useLogger('SungrowOAuthFlow');
  
  const [config, setConfig] = useState<SungrowConfig>({
    authMode: 'oauth2',
    appkey: '',
    accessKey: '',
    baseUrl: 'https://gateway.isolarcloud.com.hk',
    redirectUri: `${window.location.origin}/plants?oauth=callback`,
    ...initialConfig
  });

  const [authState, setAuthState] = useState<'idle' | 'authorizing' | 'exchanging' | 'success' | 'error'>('idle');
  const [tokens, setTokens] = useState<OAuthTokens | null>(null);
  const [authUrl, setAuthUrl] = useState<string>('');
  const [authorizationCode, setAuthorizationCode] = useState<string>('');
  const [errorDetails, setErrorDetails] = useState<string>('');
  const [timeLeft, setTimeLeft] = useState<number>(0);

  // Check for OAuth callback parameters on component mount
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('code');
    const state = urlParams.get('state');
    const error = urlParams.get('error');

    if (error) {
      setAuthState('error');
      setErrorDetails(`Autorização negada: ${error}`);
      toast({
        title: "Autorização negada",
        description: "O usuário cancelou o processo de autorização.",
        variant: "destructive",
      });
    } else if (code) {
      setAuthorizationCode(code);
      setAuthState('exchanging');
      exchangeAuthorizationCode(code);
    }

    // Clean up URL parameters
    if (code || error) {
      const cleanUrl = window.location.origin + window.location.pathname;
      window.history.replaceState({}, document.title, cleanUrl);
    }
  }, []);

  // Token expiry countdown
  useEffect(() => {
    if (tokens && tokens.expires_at) {
      const interval = setInterval(() => {
        const now = new Date();
        const timeLeftMs = tokens.expires_at.getTime() - now.getTime();
        setTimeLeft(Math.max(0, Math.floor(timeLeftMs / 1000)));

        if (timeLeftMs <= 0) {
          // Token expired, attempt refresh
          refreshTokens();
        }
      }, 1000);

      return () => clearInterval(interval);
    }
  }, [tokens]);

  const validateConfig = (): boolean => {
    const missingFields = [];
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

  const generateAuthorizationUrl = async () => {
    if (!validateConfig()) return;

    try {
      setAuthState('authorizing');
      setErrorDetails('');

      const context = logger.createContext({ action: 'generate_oauth_url' });
      
      logger.info('Gerando URL de autorização OAuth 2.0', {
        ...context,
        redirectUri: config.redirectUri
      });

      const { data, error } = await supabase.functions.invoke('sungrow-connector', {
        body: {
          action: 'generate_oauth_url',
          config,
          redirectUri: config.redirectUri,
          state: `oauth_${Date.now()}`
        }
      });

      if (error) {
        throw new Error(`Erro ao gerar URL: ${error.message}`);
      }

      if (data.success && data.authUrl) {
        setAuthUrl(data.authUrl);
        logger.info('URL de autorização gerada com sucesso', { ...context, authUrl: data.authUrl });
        
        toast({
          title: "URL de autorização gerada",
          description: "Clique no link para autorizar o acesso às suas plantas.",
        });
      } else {
        throw new Error(data.error || 'Falha ao gerar URL de autorização');
      }
    } catch (error) {
      setAuthState('error');
      setErrorDetails(error instanceof Error ? error.message : 'Erro desconhecido');
      logger.error('Erro ao gerar URL de autorização', error);
      
      toast({
        title: "Erro na autorização",
        description: error instanceof Error ? error.message : 'Erro desconhecido',
        variant: "destructive",
      });
    }
  };

  const exchangeAuthorizationCode = async (code: string) => {
    try {
      const context = logger.createContext({ action: 'exchange_authorization_code' });
      
      logger.info('Trocando código de autorização por tokens', {
        ...context,
        codeLength: code.length
      });

      const { data, error } = await supabase.functions.invoke('sungrow-connector', {
        body: {
          action: 'exchange_code',
          config,
          code,
          redirectUri: config.redirectUri
        }
      });

      if (error) {
        throw new Error(`Erro na troca de código: ${error.message}`);
      }

      if (data.success && data.tokens) {
        const tokenData = data.tokens;
        const expiresAt = new Date(Date.now() + (tokenData.expires_in * 1000));
        
        const newTokens: OAuthTokens = {
          ...tokenData,
          expires_at: expiresAt
        };

        setTokens(newTokens);
        setAuthState('success');
        
        logger.info('Tokens OAuth 2.0 obtidos com sucesso', {
          ...context,
          authorizedPlants: tokenData.authorized_plants?.length || 0,
          expiresAt: expiresAt.toISOString()
        });

        // Update config with new tokens
        const updatedConfig = {
          ...config,
          accessToken: tokenData.access_token,
          refreshToken: tokenData.refresh_token,
          tokenExpiresAt: expiresAt.getTime(),
          authorizedPlants: tokenData.authorized_plants || []
        };

        onConfigChange?.(updatedConfig);
        onAuthSuccess?.(tokenData, tokenData.authorized_plants || []);

        toast({
          title: "Autorização bem-sucedida!",
          description: `Acesso autorizado para ${tokenData.authorized_plants?.length || 0} plantas.`,
        });
      } else {
        throw new Error(data.error || 'Falha na troca de código por tokens');
      }
    } catch (error) {
      setAuthState('error');
      setErrorDetails(error instanceof Error ? error.message : 'Erro desconhecido');
      logger.error('Erro na troca de código de autorização', error);
      
      toast({
        title: "Erro na autorização",
        description: error instanceof Error ? error.message : 'Erro desconhecido',
        variant: "destructive",
      });
    }
  };

  const refreshTokens = async () => {
    if (!tokens?.refresh_token) return;

    try {
      const context = logger.createContext({ action: 'refresh_oauth_tokens' });
      
      logger.info('Renovando tokens OAuth 2.0', context);

      const { data, error } = await supabase.functions.invoke('sungrow-connector', {
        body: {
          action: 'refresh_token',
          config,
          refreshToken: tokens.refresh_token
        }
      });

      if (error) {
        throw new Error(`Erro ao renovar token: ${error.message}`);
      }

      if (data.success && data.tokens) {
        const tokenData = data.tokens;
        const expiresAt = new Date(Date.now() + (tokenData.expires_in * 1000));
        
        const newTokens: OAuthTokens = {
          ...tokens,
          ...tokenData,
          expires_at: expiresAt
        };

        setTokens(newTokens);
        
        // Update config with refreshed tokens
        const updatedConfig = {
          ...config,
          accessToken: tokenData.access_token,
          refreshToken: tokenData.refresh_token,
          tokenExpiresAt: expiresAt.getTime()
        };

        onConfigChange?.(updatedConfig);

        logger.info('Tokens renovados com sucesso', { ...context, expiresAt: expiresAt.toISOString() });

        toast({
          title: "Tokens renovados",
          description: "Seus tokens de acesso foram renovados automaticamente.",
        });
      } else {
        throw new Error(data.error || 'Falha ao renovar tokens');
      }
    } catch (error) {
      logger.error('Erro ao renovar tokens', error);
      
      toast({
        title: "Erro na renovação",
        description: "Falha ao renovar tokens. Você pode precisar autorizar novamente.",
        variant: "destructive",
      });
    }
  };

  const formatTimeLeft = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hours > 0) {
      return `${hours}h ${minutes}m ${secs}s`;
    }
    return `${minutes}m ${secs}s`;
  };

  const getAuthStateIcon = () => {
    switch (authState) {
      case 'authorizing':
      case 'exchanging':
        return <Loader2 className="w-5 h-5 animate-spin text-blue-500" />;
      case 'success':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'error':
        return <AlertCircle className="w-5 h-5 text-red-500" />;
      default:
        return <Shield className="w-5 h-5 text-gray-400" />;
    }
  };

  const getAuthStateBadge = () => {
    switch (authState) {
      case 'authorizing':
        return <Badge variant="outline" className="text-blue-600">Gerando autorização...</Badge>;
      case 'exchanging':
        return <Badge variant="outline" className="text-blue-600">Trocando código...</Badge>;
      case 'success':
        return <Badge variant="default" className="bg-green-600">Autorizado</Badge>;
      case 'error':
        return <Badge variant="destructive">Erro</Badge>;
      default:
        return <Badge variant="secondary">Não autorizado</Badge>;
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-start">
          <div className="flex items-center gap-2">
            {getAuthStateIcon()}
            <div>
              <CardTitle>Autorização OAuth 2.0 Sungrow</CardTitle>
              <CardDescription>
                Autorize acesso seguro às suas plantas via OAuth 2.0
              </CardDescription>
            </div>
          </div>
          {getAuthStateBadge()}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Configuration Section */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="oauth-appkey">App Key</Label>
            <Input
              id="oauth-appkey"
              value={config.appkey}
              onChange={(e) => setConfig(prev => ({ ...prev, appkey: e.target.value }))}
              placeholder="Chave da aplicação obtida no portal"
              disabled={authState === 'success'}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="oauth-accesskey">Access Key (Secret Key)</Label>
            <Input
              id="oauth-accesskey"
              type="password"
              value={config.accessKey}
              onChange={(e) => setConfig(prev => ({ ...prev, accessKey: e.target.value }))}
              placeholder="Chave secreta da aplicação"
              disabled={authState === 'success'}
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="oauth-redirect">Redirect URI</Label>
          <Input
            id="oauth-redirect"
            value={config.redirectUri}
            onChange={(e) => setConfig(prev => ({ ...prev, redirectUri: e.target.value }))}
            placeholder="URL de redirecionamento após autorização"
            disabled={authState === 'success'}
          />
          <p className="text-xs text-muted-foreground">
            Esta URL deve estar registrada na sua aplicação no portal Sungrow
          </p>
        </div>

        {/* Token Information */}
        {tokens && (
          <div className="p-4 bg-green-50 border border-green-200 rounded-lg space-y-3">
            <div className="flex items-center gap-2">
              <Key className="w-4 h-4 text-green-600" />
              <h4 className="font-medium text-green-800">Tokens Ativos</h4>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-green-600" />
                <span className="text-green-700">
                  {tokens.authorized_plants.length} plantas autorizadas
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-green-600" />
                <span className="text-green-700">
                  Expira em: {formatTimeLeft(timeLeft)}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <RefreshCw className="w-4 h-4 text-green-600" />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={refreshTokens}
                  className="h-6 text-xs"
                >
                  Renovar agora
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Authorization Steps */}
        {authState !== 'success' && (
          <div className="space-y-4">
            {!authUrl ? (
              <Button 
                onClick={generateAuthorizationUrl} 
                disabled={authState === 'authorizing'}
                className="w-full"
              >
                {authState === 'authorizing' ? (
                  <LoadingSpinner size="sm" message="Gerando autorização..." />
                ) : (
                  <>
                    <Shield className="w-4 h-4 mr-2" />
                    Gerar Link de Autorização
                  </>
                )}
              </Button>
            ) : (
              <div className="space-y-3">
                <Alert>
                  <Shield className="h-4 w-4" />
                  <AlertDescription>
                    <strong>Passo 1:</strong> Clique no link abaixo para autorizar o acesso às suas plantas.
                    <br />
                    <strong>Passo 2:</strong> Faça login no portal iSolarCloud e autorize a aplicação.
                    <br />
                    <strong>Passo 3:</strong> Você será redirecionado de volta automaticamente.
                  </AlertDescription>
                </Alert>
                
                <Button
                  asChild
                  className="w-full"
                  size="lg"
                >
                  <a href={authUrl} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="w-4 h-4 mr-2" />
                    Autorizar Aplicação no iSolarCloud
                  </a>
                </Button>
              </div>
            )}
          </div>
        )}

        {/* Exchange Status */}
        {authState === 'exchanging' && (
          <Alert>
            <Loader2 className="h-4 w-4 animate-spin" />
            <AlertDescription>
              Trocando código de autorização por tokens de acesso...
            </AlertDescription>
          </Alert>
        )}

        {/* Error Details */}
        {errorDetails && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-md">
            <p className="text-sm text-red-800 font-medium">Detalhes do erro:</p>
            <p className="text-sm text-red-700 mt-1">{errorDetails}</p>
          </div>
        )}

        {/* Success Actions */}
        {authState === 'success' && tokens && (
          <div className="flex gap-2 pt-4">
            <Button
              variant="outline"
              onClick={refreshTokens}
              className="flex-1"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Renovar Tokens
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                setAuthState('idle');
                setTokens(null);
                setAuthUrl('');
                setAuthorizationCode('');
              }}
              className="flex-1"
            >
              Nova Autorização
            </Button>
          </div>
        )}

        <div className="text-sm text-muted-foreground space-y-1">
          <p><strong>OAuth 2.0:</strong> Método mais seguro de autorização</p>
          <p>• Tokens têm validade limitada (2 dias para acesso, 30 dias para renovação)</p>
          <p>• Acesso apenas às plantas explicitamente autorizadas pelo proprietário</p>
          <p>• Tokens são renovados automaticamente quando necessário</p>
        </div>
      </CardContent>
    </Card>
  );
};