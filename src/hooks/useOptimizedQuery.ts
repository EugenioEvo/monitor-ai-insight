import { useQuery, UseQueryOptions, UseQueryResult } from '@tanstack/react-query';
import { useCallback, useMemo } from 'react';
import { logger } from '@/services/logger';

// Hook otimizado para queries com cache inteligente e retry strategy
export const useOptimizedQuery = <TData = unknown, TError = Error>(
  queryKey: unknown[],
  queryFn: () => Promise<TData>,
  options?: Omit<UseQueryOptions<TData, TError>, 'queryKey' | 'queryFn'> & {
    enablePerformanceTracking?: boolean;
    cacheTime?: number;
    staleTime?: number;
  }
): UseQueryResult<TData, TError> => {
  const {
    enablePerformanceTracking = false,
    cacheTime = 5 * 60 * 1000, // 5 minutos
    staleTime = 30 * 1000, // 30 segundos
    ...queryOptions
  } = options || {};

  // Query function com performance tracking
  const optimizedQueryFn = useCallback(async (): Promise<TData> => {
    const startTime = performance.now();
    
    try {
      const result = await queryFn();
      
      if (enablePerformanceTracking) {
        const duration = performance.now() - startTime;
        logger.info('Query completed', {
          component: 'useOptimizedQuery',
          queryKey: JSON.stringify(queryKey),
          duration,
          success: true
        });
      }
      
      return result;
    } catch (error) {
      if (enablePerformanceTracking) {
        const duration = performance.now() - startTime;
        logger.error('Query failed', error as Error, {
          component: 'useOptimizedQuery',
          queryKey: JSON.stringify(queryKey),
          duration
        });
      }
      throw error;
    }
  }, [queryFn, queryKey, enablePerformanceTracking]);

  // Configurações otimizadas baseadas no tipo de dados
  const optimizedOptions = useMemo(() => {
    const baseOptions = {
      cacheTime,
      staleTime,
      retry: (failureCount: number, error: TError) => {
        // Não retry em erros 4xx (client errors)
        if (error && typeof error === 'object' && 'status' in error) {
          const status = (error as any).status;
          if (status >= 400 && status < 500) {
            return false;
          }
        }
        
        // Retry até 3 vezes com backoff exponencial
        return failureCount < 3;
      },
      retryDelay: (attemptIndex: number) => Math.min(1000 * 2 ** attemptIndex, 30000),
      ...queryOptions
    };

    return baseOptions;
  }, [cacheTime, staleTime, queryOptions]);

  return useQuery({
    queryKey,
    queryFn: optimizedQueryFn,
    ...optimizedOptions
  });
};

// Hook para múltiplas queries relacionadas
export const useOptimizedQueries = <T extends Record<string, any>>(
  queries: T,
  options?: {
    enablePerformanceTracking?: boolean;
    enabled?: boolean;
  }
) => {
  const { enablePerformanceTracking = false, enabled = true } = options || {};

  return useMemo(() => {
    const queryResults: Record<keyof T, UseQueryResult> = {} as any;
    
    Object.entries(queries).forEach(([key, queryConfig]) => {
      queryResults[key as keyof T] = useOptimizedQuery(
        queryConfig.queryKey,
        queryConfig.queryFn,
        {
          ...queryConfig.options,
          enablePerformanceTracking,
          enabled: enabled && (queryConfig.options?.enabled !== false)
        }
      );
    });

    return queryResults;
  }, [queries, enablePerformanceTracking, enabled]);
};

// Hook para prefetch inteligente
export const usePrefetchOptimized = () => {
  const { queryClient } = useQuery({ queryKey: ['dummy'], queryFn: () => null, enabled: false });

  const prefetchQuery = useCallback(async <TData>(
    queryKey: unknown[],
    queryFn: () => Promise<TData>,
    options?: {
      staleTime?: number;
      cacheTime?: number;
    }
  ) => {
    const { staleTime = 30 * 1000, cacheTime = 5 * 60 * 1000 } = options || {};
    
    try {
      await queryClient?.prefetchQuery({
        queryKey,
        queryFn,
        staleTime,
        cacheTime
      });
      
      logger.debug('Query prefetched successfully', {
        component: 'usePrefetchOptimized',
        queryKey: JSON.stringify(queryKey)
      });
    } catch (error) {
      logger.warn('Prefetch failed', {
        component: 'usePrefetchOptimized',
        queryKey: JSON.stringify(queryKey),
        error: (error as Error).message
      });
    }
  }, [queryClient]);

  return { prefetchQuery };
};