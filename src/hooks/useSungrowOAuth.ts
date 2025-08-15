import { useState, useCallback, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import type { SungrowConfig } from '@/types/sungrow';
import { useLogger } from '@/services/logger';

interface OAuthTokens {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  token_type: string;
  authorized_plants: string[];
  expires_at: Date;
}

interface UseSungrowOAuthResult {
  tokens: OAuthTokens | null;
  loading: boolean;
  error: string | null;
  isTokenValid: boolean;
  timeUntilExpiry: number;
  
  // Actions
  generateAuthUrl: (config: SungrowConfig, redirectUri: string, state?: string) => Promise<string | null>;
  exchangeAuthCode: (config: SungrowConfig, code: string, redirectUri: string) => Promise<OAuthTokens | null>;
  refreshTokens: (config: SungrowConfig, refreshToken: string) => Promise<OAuthTokens | null>;
  clearTokens: () => void;
}

export const useSungrowOAuth = (): UseSungrowOAuthResult => {
  const { toast } = useToast();
  const logger = useLogger('useSungrowOAuth');
  
  const [tokens, setTokens] = useState<OAuthTokens | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [timeUntilExpiry, setTimeUntilExpiry] = useState(0);

  // Check if current token is valid
  const isTokenValid = tokens ? new Date() < tokens.expires_at : false;

  // Update time until expiry
  useEffect(() => {
    if (!tokens?.expires_at) {
      setTimeUntilExpiry(0);
      return;
    }

    const interval = setInterval(() => {
      const now = new Date();
      const timeLeft = Math.max(0, Math.floor((tokens.expires_at.getTime() - now.getTime()) / 1000));
      setTimeUntilExpiry(timeLeft);
    }, 1000);

    return () => clearInterval(interval);
  }, [tokens]);

  const generateAuthUrl = useCallback(async (
    config: SungrowConfig, 
    redirectUri: string, 
    state?: string
  ): Promise<string | null> => {
    const context = logger.createContext({ action: 'generate_oauth_url' });
    
    try {
      setLoading(true);
      setError(null);

      logger.info('Gerando URL de autorização OAuth 2.0', {
        ...context,
        redirectUri,
        state
      });

      const { data, error: invokeError } = await supabase.functions.invoke('sungrow-connector', {
        body: {
          action: 'generate_oauth_url',
          config,
          redirectUri,
          state
        }
      });

      if (invokeError) {
        throw new Error(`Erro ao gerar URL: ${invokeError.message}`);
      }

      if (data.success && data.authUrl) {
        logger.info('URL de autorização gerada com sucesso', { ...context, authUrl: data.authUrl });
        return data.authUrl;
      } else {
        throw new Error(data.error || 'Falha ao gerar URL de autorização');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro desconhecido';
      setError(errorMessage);
      logger.error('Erro ao gerar URL de autorização', err, context);
      
      toast({
        title: "Erro na autorização",
        description: errorMessage,
        variant: "destructive",
      });
      
      return null;
    } finally {
      setLoading(false);
    }
  }, [toast, logger]);

  const exchangeAuthCode = useCallback(async (
    config: SungrowConfig,
    code: string,
    redirectUri: string
  ): Promise<OAuthTokens | null> => {
    const context = logger.createContext({ action: 'exchange_authorization_code' });
    
    try {
      setLoading(true);
      setError(null);

      logger.info('Trocando código de autorização por tokens', {
        ...context,
        codeLength: code.length,
        redirectUri
      });

      const { data, error: invokeError } = await supabase.functions.invoke('sungrow-connector', {
        body: {
          action: 'exchange_code',
          config,
          code,
          redirectUri
        }
      });

      if (invokeError) {
        throw new Error(`Erro na troca de código: ${invokeError.message}`);
      }

      if (data.success && data.tokens) {
        const tokenData = data.tokens;
        const expiresAt = new Date(Date.now() + (tokenData.expires_in * 1000));
        
        const newTokens: OAuthTokens = {
          ...tokenData,
          expires_at: expiresAt
        };

        setTokens(newTokens);
        
        logger.info('Tokens OAuth 2.0 obtidos com sucesso', {
          ...context,
          authorizedPlants: tokenData.authorized_plants?.length || 0,
          expiresAt: expiresAt.toISOString()
        });

        toast({
          title: "Autorização bem-sucedida!",
          description: `Acesso autorizado para ${tokenData.authorized_plants?.length || 0} plantas.`,
        });

        return newTokens;
      } else {
        throw new Error(data.error || 'Falha na troca de código por tokens');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro desconhecido';
      setError(errorMessage);
      logger.error('Erro na troca de código de autorização', err, context);
      
      toast({
        title: "Erro na autorização",
        description: errorMessage,
        variant: "destructive",
      });
      
      return null;
    } finally {
      setLoading(false);
    }
  }, [toast, logger]);

  const refreshTokens = useCallback(async (
    config: SungrowConfig,
    refreshToken: string
  ): Promise<OAuthTokens | null> => {
    const context = logger.createContext({ action: 'refresh_oauth_tokens' });
    
    try {
      setLoading(true);
      setError(null);

      logger.info('Renovando tokens OAuth 2.0', context);

      const { data, error: invokeError } = await supabase.functions.invoke('sungrow-connector', {
        body: {
          action: 'refresh_token',
          config,
          refreshToken
        }
      });

      if (invokeError) {
        throw new Error(`Erro ao renovar token: ${invokeError.message}`);
      }

      if (data.success && data.tokens) {
        const tokenData = data.tokens;
        const expiresAt = new Date(Date.now() + (tokenData.expires_in * 1000));
        
        const newTokens: OAuthTokens = {
          ...tokens!,
          ...tokenData,
          expires_at: expiresAt
        };

        setTokens(newTokens);
        
        logger.info('Tokens renovados com sucesso', { ...context, expiresAt: expiresAt.toISOString() });

        toast({
          title: "Tokens renovados",
          description: "Seus tokens de acesso foram renovados automaticamente.",
        });

        return newTokens;
      } else {
        throw new Error(data.error || 'Falha ao renovar tokens');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro desconhecido';
      setError(errorMessage);
      logger.error('Erro ao renovar tokens', err, context);
      
      toast({
        title: "Erro na renovação",
        description: "Falha ao renovar tokens. Você pode precisar autorizar novamente.",
        variant: "destructive",
      });
      
      return null;
    } finally {
      setLoading(false);
    }
  }, [tokens, toast, logger]);

  const clearTokens = useCallback(() => {
    setTokens(null);
    setError(null);
    setTimeUntilExpiry(0);
    logger.info('Tokens OAuth 2.0 limpos', { action: 'clear_tokens' });
  }, [logger]);

  return {
    tokens,
    loading,
    error,
    isTokenValid,
    timeUntilExpiry,
    generateAuthUrl,
    exchangeAuthCode,
    refreshTokens,
    clearTokens
  };
};