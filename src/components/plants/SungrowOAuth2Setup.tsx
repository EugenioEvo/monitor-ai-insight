import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { 
  Shield, 
  ExternalLink, 
  CheckCircle, 
  AlertCircle, 
  Loader2, 
  Key,
  Users,
  Clock,
  RefreshCw,
  Copy,
  ArrowRight,
  Info
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useLogger } from '@/services/logger';

interface SungrowOAuth2SetupProps {
  onSuccess?: (tokens: any, plants: string[]) => void;
  plantId?: string;
}

interface OAuthConfig {
  appkey: string;
  accessKey: string;
  baseUrl: string;
  redirectUri: string;
}

interface OAuthTokens {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  token_type: string;
  authorized_plants: string[];
  expires_at: Date;
}

export const SungrowOAuth2Setup = ({ onSuccess, plantId }: SungrowOAuth2SetupProps) => {
  const { toast } = useToast();
  const logger = useLogger('SungrowOAuth2Setup');
  
  const [config, setConfig] = useState<OAuthConfig>({
    appkey: '',
    accessKey: '',
    baseUrl: '', // Empty for OAuth - uses web3.isolarcloud.com.hk
    redirectUri: `${window.location.origin}/plants?oauth=callback`
  });

  const [currentStep, setCurrentStep] = useState<'config' | 'authorize' | 'callback' | 'success' | 'error'>('config');
  const [authUrl, setAuthUrl] = useState<string>('');
  const [tokens, setTokens] = useState<OAuthTokens | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const [timeLeft, setTimeLeft] = useState<number>(0);

  // Handle OAuth callback
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('code');
    const error = urlParams.get('error');
    const state = urlParams.get('state');

    if (error) {
      setCurrentStep('error');
      setError(`Autorização negada: ${error}`);
      toast({
        title: "Autorização cancelada",
        description: "O processo de autorização foi cancelado pelo usuário.",
        variant: "destructive",
      });
    } else if (code && state?.startsWith('sungrow_oauth_')) {
      setCurrentStep('callback');
      handleAuthCallback(code);
    }

    // Clean URL
    if (code || error) {
      const cleanUrl = window.location.origin + window.location.pathname;
      window.history.replaceState({}, document.title, cleanUrl);
    }
  }, []);

  // Token countdown
  useEffect(() => {
    if (tokens?.expires_at) {
      const interval = setInterval(() => {
        const now = new Date();
        const timeLeftMs = tokens.expires_at.getTime() - now.getTime();
        setTimeLeft(Math.max(0, Math.floor(timeLeftMs / 1000)));
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [tokens]);

  const validateConfig = (): boolean => {
    const missing = [];
    if (!config.appkey.trim()) missing.push('App Key');
    if (!config.accessKey.trim()) missing.push('Access Key');
    
    if (missing.length > 0) {
      toast({
        title: "Configuração incompleta",
        description: `Preencha os campos: ${missing.join(', ')}`,
        variant: "destructive",
      });
      return false;
    }
    return true;
  };

  const generateAuthUrl = async () => {
    if (!validateConfig()) return;

    setLoading(true);
    setError('');

    try {
      const state = `sungrow_oauth_${Date.now()}`;
      
      const { data, error: invokeError } = await supabase.functions.invoke('sungrow-connector', {
        body: {
          action: 'generate_oauth_url',
          config: {
            authMode: 'oauth2',
            ...config
          },
          redirectUri: config.redirectUri,
          state
        }
      });

      if (invokeError) {
        throw new Error(`Erro na função: ${invokeError.message}`);
      }

      if (data.success && data.authUrl) {
        setAuthUrl(data.authUrl);
        setCurrentStep('authorize');
        
        toast({
          title: "URL de autorização gerada",
          description: "Agora autorize o acesso no portal iSolarCloud",
        });

        logger.info('URL OAuth gerada com sucesso', { authUrl: data.authUrl });
      } else {
        throw new Error(data.error || 'Falha ao gerar URL de autorização');
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro desconhecido';
      setError(message);
      setCurrentStep('error');
      logger.error('Erro ao gerar URL OAuth', err);
      
      toast({
        title: "Erro na autorização",
        description: message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAuthCallback = async (code: string) => {
    setLoading(true);
    
    try {
      const { data, error: invokeError } = await supabase.functions.invoke('sungrow-connector', {
        body: {
          action: 'exchange_code',
          config: {
            authMode: 'oauth2',
            ...config
          },
          code,
          redirectUri: config.redirectUri
        }
      });

      if (invokeError) {
        throw new Error(`Erro na troca do código: ${invokeError.message}`);
      }

      if (data.success && data.tokens) {
        const tokenData = data.tokens;
        const expiresAt = new Date(Date.now() + (tokenData.expires_in * 1000));
        
        const newTokens: OAuthTokens = {
          ...tokenData,
          expires_at: expiresAt
        };

        setTokens(newTokens);
        setCurrentStep('success');

        // Save to plant credentials if plantId provided
        if (plantId) {
          await saveToPlantCredentials(newTokens);
        }

        onSuccess?.(tokenData, tokenData.authorized_plants || []);

        toast({
          title: "Autorização concluída!",
          description: `Acesso autorizado para ${tokenData.authorized_plants?.length || 0} plantas.`,
        });

        logger.info('OAuth 2.0 concluído com sucesso', {
          plantsCount: tokenData.authorized_plants?.length || 0,
          expiresAt: expiresAt.toISOString()
        });
      } else {
        throw new Error(data.error || 'Falha na troca do código por tokens');
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro desconhecido';
      setError(message);
      setCurrentStep('error');
      
      toast({
        title: "Erro na autorização",
        description: message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const saveToPlantCredentials = async (tokens: OAuthTokens) => {
    try {
      const { error } = await supabase
        .from('plant_credentials')
        .upsert({
          plant_id: plantId,
          provider: 'sungrow_oauth2',
          username: null,
          password: null,
          appkey: config.appkey,
          access_key: config.accessKey,
          base_url: config.baseUrl
        }, { onConflict: 'plant_id,provider' });

      if (error) throw error;

      // Also save tokens
      const { error: tokenError } = await supabase
        .from('sungrow_tokens')
        .upsert({
          user_id: (await supabase.auth.getUser()).data.user?.id,
          plant_id: plantId,
          provider: 'sungrow',
          access_token: tokens.access_token,
          refresh_token: tokens.refresh_token,
          expires_at: tokens.expires_at.toISOString(),
          token_type: tokens.token_type,
          config_hash: btoa(JSON.stringify(config))
        }, { onConflict: 'user_id,plant_id,provider' });

      if (tokenError) throw tokenError;
    } catch (err) {
      logger.error('Erro ao salvar credenciais', err);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copiado!",
      description: "Texto copiado para a área de transferência",
    });
  };

  const formatTimeLeft = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m ${secs}s`;
  };

  const getStepIcon = () => {
    switch (currentStep) {
      case 'config': return <Shield className="w-5 h-5 text-blue-500" />;
      case 'authorize': return <ExternalLink className="w-5 h-5 text-orange-500" />;
      case 'callback': return <Loader2 className="w-5 h-5 animate-spin text-blue-500" />;
      case 'success': return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'error': return <AlertCircle className="w-5 h-5 text-red-500" />;
    }
  };

  const getStepTitle = () => {
    switch (currentStep) {
      case 'config': return 'Configuração OAuth 2.0';
      case 'authorize': return 'Autorização Pendente';
      case 'callback': return 'Processando Autorização';
      case 'success': return 'Autorização Concluída';
      case 'error': return 'Erro na Autorização';
    }
  };

  const restart = () => {
    setCurrentStep('config');
    setAuthUrl('');
    setTokens(null);
    setError('');
    setConfig(prev => ({ ...prev, appkey: '', accessKey: '' }));
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          {getStepIcon()}
          <div>
            <CardTitle>{getStepTitle()}</CardTitle>
            <CardDescription>
              Autorização OAuth 2.0 seguindo o plano oficial da Sungrow
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Step 1: Configuration */}
        {currentStep === 'config' && (
          <div className="space-y-4">
            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription>
                <strong>Plano OAuth 2.0 da Sungrow:</strong>
                <br />1. Configure App Key e Access Key da sua aplicação registrada
                <br />2. Registre a Redirect URI no portal iSolarCloud
                <br />3. Gere URL de autorização e autorize no portal
                <br />4. Receba tokens de acesso automaticamente
                <br />
                <br /><strong>⚠️ Importante:</strong> Certifique-se de que sua aplicação está registrada no iSolarCloud e tem permissões OpenAPI habilitadas.
              </AlertDescription>
            </Alert>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="appkey">App Key *</Label>
                <Input
                  id="appkey"
                  value={config.appkey}
                  onChange={(e) => setConfig(prev => ({ ...prev, appkey: e.target.value }))}
                  placeholder="Ex: A43B5FD278331D97B7399780AC540E61"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="accesskey">Access Key (Secret) *</Label>
                <Input
                  id="accesskey"
                  type="password"
                  value={config.accessKey}
                  onChange={(e) => setConfig(prev => ({ ...prev, accessKey: e.target.value }))}
                  placeholder="Chave secreta da aplicação"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="redirect">Redirect URI</Label>
              <div className="flex gap-2">
                <Input
                  id="redirect"
                  value={config.redirectUri}
                  onChange={(e) => setConfig(prev => ({ ...prev, redirectUri: e.target.value }))}
                  readOnly
                />
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => copyToClipboard(config.redirectUri)}
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                <strong>Registre esta URL no portal iSolarCloud:</strong>
                <br />Developer Center → Manage Application → Redirect URI/Callback URL
              </p>
            </div>

            <Button 
              onClick={generateAuthUrl} 
              disabled={loading}
              className="w-full"
              size="lg"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Shield className="w-4 h-4 mr-2" />
              )}
              Gerar Autorização OAuth 2.0
            </Button>
          </div>
        )}

        {/* Step 2: Authorization */}
        {currentStep === 'authorize' && authUrl && (
          <div className="space-y-4">
            <Alert>
              <ExternalLink className="h-4 w-4" />
              <AlertDescription>
                <strong>Próximo passo:</strong> Clique no botão abaixo para abrir o portal iSolarCloud.
                Faça login com suas credenciais e autorize o acesso às plantas desejadas.
              </AlertDescription>
            </Alert>

            <Button
              asChild
              size="lg"
              className="w-full"
            >
              <a href={authUrl} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="w-4 h-4 mr-2" />
                Autorizar no Portal iSolarCloud
                <ArrowRight className="w-4 h-4 ml-2" />
              </a>
            </Button>

            <p className="text-sm text-muted-foreground text-center">
              Após autorizar, você será redirecionado automaticamente de volta para esta página
            </p>
          </div>
        )}

        {/* Step 3: Processing callback */}
        {currentStep === 'callback' && (
          <Alert>
            <Loader2 className="h-4 w-4 animate-spin" />
            <AlertDescription>
              Processando autorização... Aguarde enquanto validamos os tokens de acesso.
            </AlertDescription>
          </Alert>
        )}

        {/* Step 4: Success */}
        {currentStep === 'success' && tokens && (
          <div className="space-y-4">
            <Alert className="border-green-200 bg-green-50">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-800">
                <strong>Autorização concluída com sucesso!</strong>
                <br />Você agora tem acesso seguro às plantas autorizadas via OAuth 2.0.
              </AlertDescription>
            </Alert>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="flex items-center gap-2 p-3 bg-green-50 rounded-lg">
                <Users className="w-5 h-5 text-green-600" />
                <div>
                  <div className="font-medium text-green-800">
                    {tokens.authorized_plants.length}
                  </div>
                  <div className="text-xs text-green-600">Plantas autorizadas</div>
                </div>
              </div>
              
              <div className="flex items-center gap-2 p-3 bg-blue-50 rounded-lg">
                <Clock className="w-5 h-5 text-blue-600" />
                <div>
                  <div className="font-medium text-blue-800">
                    {formatTimeLeft(timeLeft)}
                  </div>
                  <div className="text-xs text-blue-600">Token expira em</div>
                </div>
              </div>
              
              <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg">
                <Key className="w-5 h-5 text-gray-600" />
                <div>
                  <div className="font-medium text-gray-800">OAuth 2.0</div>
                  <div className="text-xs text-gray-600">Método seguro</div>
                </div>
              </div>
            </div>

            <Button 
              onClick={restart} 
              variant="outline" 
              className="w-full"
            >
              Configurar Nova Autorização
            </Button>
          </div>
        )}

        {/* Error State */}
        {currentStep === 'error' && (
          <div className="space-y-4">
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <strong>Erro na autorização:</strong>
                <br />{error}
              </AlertDescription>
            </Alert>

            <Button 
              onClick={restart} 
              variant="outline" 
              className="w-full"
            >
              Tentar Novamente
            </Button>
          </div>
        )}

        <Separator />
        
        <div className="text-xs text-muted-foreground space-y-1">
          <p><strong>Servidor:</strong> {config.baseUrl}</p>
          <p><strong>Método:</strong> OAuth 2.0 (Plano oficial Sungrow)</p>
          <p><strong>Segurança:</strong> Tokens com validade limitada e renovação automática</p>
        </div>
      </CardContent>
    </Card>
  );
};