import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Shield, Key, Info, CheckCircle } from 'lucide-react';
import { SungrowConnectionTest } from './SungrowConnectionTest';
import { SungrowOAuthFlow } from './SungrowOAuthFlow';
import type { SungrowConfig } from '@/types/sungrow';

interface EnhancedSungrowAuthProps {
  onAuthSuccess?: (config: SungrowConfig, method: 'direct' | 'oauth2') => void;
  initialConfig?: Partial<SungrowConfig>;
}

export const EnhancedSungrowAuth = ({ onAuthSuccess, initialConfig = {} }: EnhancedSungrowAuthProps) => {
  const [activeTab, setActiveTab] = useState<'direct' | 'oauth2'>('oauth2');
  const [connectionStatus, setConnectionStatus] = useState<{
    direct?: boolean;
    oauth2?: boolean;
  }>({});

  const handleDirectLoginSuccess = (config: SungrowConfig) => {
    setConnectionStatus(prev => ({ ...prev, direct: true }));
    onAuthSuccess?.(config, 'direct');
  };

  const handleOAuthSuccess = (tokens: any, authorizedPlants: string[]) => {
    setConnectionStatus(prev => ({ ...prev, oauth2: true }));
    
    const oauthConfig: SungrowConfig = {
      ...initialConfig,
      authMode: 'oauth2',
      appkey: initialConfig.appkey || '', // Ensure appkey is provided
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token,
      tokenExpiresAt: Date.now() + (tokens.expires_in * 1000),
      authorizedPlants
    };
    
    onAuthSuccess?.(oauthConfig, 'oauth2');
  };

  const getMethodBadge = (method: 'direct' | 'oauth2') => {
    const isConnected = connectionStatus[method];
    
    if (isConnected) {
      return <Badge variant="default" className="bg-green-600 ml-2">Conectado</Badge>;
    }
    
    return null;
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5" />
            Autenticação Sungrow Avançada
          </CardTitle>
          <CardDescription>
            Escolha o método de autenticação mais adequado para suas necessidades
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <Alert>
              <Key className="h-4 w-4" />
              <AlertDescription>
                <strong>Login Direto:</strong> Mais simples, use suas credenciais do iSolarCloud diretamente.
                Ideal para desenvolvimento e teste.
              </AlertDescription>
            </Alert>
            
            <Alert>
              <Shield className="h-4 w-4" />
              <AlertDescription>
                <strong>OAuth 2.0:</strong> Mais seguro, permite autorização granular por planta.
                Recomendado para produção.
              </AlertDescription>
            </Alert>
          </div>

          <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'direct' | 'oauth2')}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="oauth2" className="flex items-center gap-2">
                <Shield className="w-4 h-4" />
                OAuth 2.0 (Recomendado)
                {getMethodBadge('oauth2')}
              </TabsTrigger>
              <TabsTrigger value="direct" className="flex items-center gap-2">
                <Key className="w-4 h-4" />
                Login Direto
                {getMethodBadge('direct')}
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="oauth2" className="mt-6">
              <div className="space-y-4">
                <Alert>
                  <Info className="h-4 w-4" />
                  <AlertDescription>
                    <strong>OAuth 2.0 oferece:</strong>
                    <ul className="list-disc list-inside mt-2 space-y-1">
                      <li>Autorização segura sem compartilhar senha</li>
                      <li>Controle granular por planta (o proprietário escolhe quais plantas autorizar)</li>
                      <li>Tokens com validade limitada (2 dias para acesso, 30 dias para renovação)</li>
                      <li>Renovação automática de tokens</li>
                      <li>Possibilidade de revogação pelo proprietário</li>
                    </ul>
                  </AlertDescription>
                </Alert>
                
                <SungrowOAuthFlow
                  onAuthSuccess={handleOAuthSuccess}
                  initialConfig={initialConfig}
                />
              </div>
            </TabsContent>
            
            <TabsContent value="direct" className="mt-6">
              <div className="space-y-4">
                <Alert>
                  <Info className="h-4 w-4" />
                  <AlertDescription>
                    <strong>Login Direto oferece:</strong>
                    <ul className="list-disc list-inside mt-2 space-y-1">
                      <li>Configuração mais simples e rápida</li>
                      <li>Acesso direto a todas as plantas da conta</li>
                      <li>Ideal para desenvolvimento e teste</li>
                      <li>Usa suas credenciais normais do iSolarCloud</li>
                    </ul>
                    <br />
                    <strong className="text-amber-600">Nota:</strong> Para produção, recomendamos usar OAuth 2.0 
                    por questões de segurança.
                  </AlertDescription>
                </Alert>
                
                <SungrowConnectionTest
                  onConnectionSuccess={handleDirectLoginSuccess}
                />
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Connection Status Summary */}
      {(connectionStatus.direct || connectionStatus.oauth2) && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-green-500" />
              Status de Conexão
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {connectionStatus.oauth2 && (
                <div className="flex items-center gap-2">
                  <Badge variant="default" className="bg-green-600">OAuth 2.0 Conectado</Badge>
                  <span className="text-sm text-muted-foreground">
                    Autenticação segura com tokens temporários ativa
                  </span>
                </div>
              )}
              {connectionStatus.direct && (
                <div className="flex items-center gap-2">
                  <Badge variant="default" className="bg-blue-600">Login Direto Conectado</Badge>
                  <span className="text-sm text-muted-foreground">
                    Autenticação direta com credenciais ativa
                  </span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};