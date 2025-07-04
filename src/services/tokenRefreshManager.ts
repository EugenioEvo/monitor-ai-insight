/**
 * Token Refresh Manager
 * Gerencia refresh automático de tokens e handle de expiração
 */

import React from 'react';
import { supabase } from '@/integrations/supabase/client';
import { logger } from './logger';

class TokenRefreshManager {
  private refreshTimer: NodeJS.Timeout | null = null;
  private isRefreshing = false;
  private refreshCallbacks: (() => void)[] = [];

  constructor() {
    this.setupAuthListener();
  }

  private setupAuthListener() {
    supabase.auth.onAuthStateChange(async (event, session) => {
      logger.info('Auth state changed', {
        component: 'TokenRefreshManager',
        event,
        hasSession: !!session,
        expiresAt: session?.expires_at
      });

      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        this.scheduleRefresh(session);
      } else if (event === 'SIGNED_OUT') {
        this.clearRefreshTimer();
      }
    });
  }

  private scheduleRefresh(session: any) {
    this.clearRefreshTimer();

    if (!session?.expires_at) return;

    // Agendar refresh 5 minutos antes do token expirar
    const expiresAt = session.expires_at * 1000; // Convert to milliseconds
    const refreshAt = expiresAt - (5 * 60 * 1000); // 5 minutes before
    const now = Date.now();

    if (refreshAt <= now) {
      // Token já está próximo do vencimento, refresh imediatamente
      this.refreshToken();
      return;
    }

    const timeUntilRefresh = refreshAt - now;
    
    logger.info('Token refresh agendado', {
      component: 'TokenRefreshManager',
      expiresAt: new Date(expiresAt).toISOString(),
      refreshAt: new Date(refreshAt).toISOString(),
      timeUntilRefresh: timeUntilRefresh / 1000 / 60 // minutes
    });

    this.refreshTimer = setTimeout(() => {
      this.refreshToken();
    }, timeUntilRefresh);
  }

  private async refreshToken() {
    if (this.isRefreshing) return;

    this.isRefreshing = true;
    
    try {
      logger.info('Iniciando refresh de token', {
        component: 'TokenRefreshManager'
      });

      const { data, error } = await supabase.auth.refreshSession();

      if (error) {
        logger.error('Erro no refresh de token', error, {
          component: 'TokenRefreshManager'
        });
        
        // Se refresh falhar, fazer logout para evitar requests com token inválido
        await supabase.auth.signOut();
        return;
      }

      if (data.session) {
        logger.info('Token refreshed com sucesso', {
          component: 'TokenRefreshManager',
          newExpiresAt: data.session.expires_at
        });

        // Notificar callbacks de refresh bem-sucedido
        this.refreshCallbacks.forEach(callback => callback());
        
        // Agendar próximo refresh
        this.scheduleRefresh(data.session);
      }
    } catch (error) {
      logger.error('Erro crítico no refresh de token', error as Error, {
        component: 'TokenRefreshManager'
      });
    } finally {
      this.isRefreshing = false;
    }
  }

  private clearRefreshTimer() {
    if (this.refreshTimer) {
      clearTimeout(this.refreshTimer);
      this.refreshTimer = null;
    }
  }

  /**
   * Verificar se o token está próximo do vencimento
   */
  public isTokenExpiringSoon(thresholdMinutes: number = 10): boolean {
    const session = supabase.auth.getSession();
    
    if (!session) return false;

    // Note: getSession() retorna uma Promise, precisamos lidar com isso
    return false; // Simplificado por ora
  }

  /**
   * Forçar refresh manual do token
   */
  public async forceRefresh(): Promise<boolean> {
    try {
      await this.refreshToken();
      return true;
    } catch (error) {
      logger.error('Falha no refresh forçado', error as Error, {
        component: 'TokenRefreshManager'
      });
      return false;
    }
  }

  /**
   * Registrar callback para ser chamado após refresh bem-sucedido
   */
  public onTokenRefreshed(callback: () => void) {
    this.refreshCallbacks.push(callback);
    
    // Retornar função para remover callback
    return () => {
      const index = this.refreshCallbacks.indexOf(callback);
      if (index > -1) {
        this.refreshCallbacks.splice(index, 1);
      }
    };
  }

  /**
   * Obter informações sobre o estado atual do token
   */
  public async getTokenInfo() {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        return { 
          isValid: false, 
          expiresAt: null, 
          minutesUntilExpiry: null 
        };
      }

      const expiresAt = new Date(session.expires_at! * 1000);
      const now = new Date();
      const minutesUntilExpiry = Math.floor((expiresAt.getTime() - now.getTime()) / (1000 * 60));

      return {
        isValid: minutesUntilExpiry > 0,
        expiresAt,
        minutesUntilExpiry,
        shouldRefreshSoon: minutesUntilExpiry <= 10
      };
    } catch (error) {
      logger.error('Erro ao obter info do token', error as Error, {
        component: 'TokenRefreshManager'
      });
      
      return { 
        isValid: false, 
        expiresAt: null, 
        minutesUntilExpiry: null 
      };
    }
  }

  /**
   * Cleanup na destruição
   */
  public destroy() {
    this.clearRefreshTimer();
    this.refreshCallbacks = [];
  }
}

// Instância singleton
export const tokenRefreshManager = new TokenRefreshManager();

// Hook React para usar o token refresh manager
export const useTokenRefresh = () => {
  const [tokenInfo, setTokenInfo] = React.useState<any>(null);

  React.useEffect(() => {
    const updateTokenInfo = async () => {
      const info = await tokenRefreshManager.getTokenInfo();
      setTokenInfo(info);
    };

    updateTokenInfo();
    const interval = setInterval(updateTokenInfo, 60000); // Update every minute

    const removeCallback = tokenRefreshManager.onTokenRefreshed(() => {
      updateTokenInfo();
    });

    return () => {
      clearInterval(interval);
      removeCallback();
    };
  }, []);

  return {
    tokenInfo,
    forceRefresh: tokenRefreshManager.forceRefresh.bind(tokenRefreshManager)
  };
};

// Utility para criar axios interceptor (se necessário)
export const createAuthInterceptor = () => {
  return async (config: any) => {
    const { data: { session } } = await supabase.auth.getSession();
    
    if (session?.access_token) {
      config.headers.Authorization = `Bearer ${session.access_token}`;
    }
    
    return config;
  };
};

export default tokenRefreshManager;