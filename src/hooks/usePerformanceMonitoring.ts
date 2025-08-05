import { useEffect } from 'react';
import { useMonitoringStore, usePerformanceTracker } from '@/stores/monitoringStore';
import { logger } from '@/services/logger';

interface PerformanceObserver {
  observe: (options: { entryTypes: string[] }) => void;
  disconnect: () => void;
}

declare global {
  interface Window {
    PerformanceObserver?: {
      new (callback: (list: any) => void): PerformanceObserver;
    };
  }
}

export const usePerformanceMonitoring = () => {
  const { trackApiCall, trackRender, trackNavigation } = usePerformanceTracker();
  const updateHealthCheck = useMonitoringStore(state => state.updateHealthCheck);

  useEffect(() => {
    // Monitor navigation performance
    if (window.PerformanceObserver) {
      const observer = new window.PerformanceObserver((list) => {
        list.getEntries().forEach((entry: any) => {
          switch (entry.entryType) {
            case 'navigation':
              trackNavigation(window.location.pathname, entry.duration);
              break;
            case 'measure':
              if (entry.name.startsWith('render_')) {
                trackRender(entry.name.replace('render_', ''), entry.duration);
              }
              break;
            case 'resource':
              if (entry.name.includes('/functions/')) {
                const functionName = entry.name.split('/functions/')[1].split('?')[0];
                trackApiCall(functionName, entry.duration);
              }
              break;
          }
        });
      });

      observer.observe({ entryTypes: ['navigation', 'measure', 'resource'] });

      return () => observer.disconnect();
    }
  }, [trackApiCall, trackRender, trackNavigation]);

  // Monitor system health
  useEffect(() => {
    const checkSystemHealth = async () => {
      try {
        // Check Supabase connection
        const start = performance.now();
        const response = await fetch('/rest/v1/', {
          method: 'HEAD',
          headers: {
            'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY || ''
          }
        });
        const duration = performance.now() - start;

        updateHealthCheck('supabase', {
          status: response.ok ? 'healthy' : 'down',
          responseTime: duration,
          error: response.ok ? undefined : `HTTP ${response.status}`
        });

      } catch (error) {
        updateHealthCheck('supabase', {
          status: 'down',
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    };

    // Check health every 30 seconds
    const interval = setInterval(checkSystemHealth, 30000);
    checkSystemHealth(); // Check immediately

    return () => clearInterval(interval);
  }, [updateHealthCheck]);

  // Component render tracking
  const trackComponentRender = (componentName: string) => {
    const start = performance.now();
    
    return () => {
      const duration = performance.now() - start;
      trackRender(componentName, duration);
      
      // Log slow renders
      if (duration > 100) {
        logger.warn('Slow component render detected', {
          component: componentName,
          duration,
          threshold: 100
        });
      }
    };
  };

  // API call tracking
  const trackApiCallWrapper = async (
    apiCall: () => Promise<any>,
    endpoint: string
  ) => {
    const start = performance.now();
    
    try {
      const result = await apiCall();
      const duration = performance.now() - start;
      
      trackApiCall(endpoint, duration);
      
      // Log slow API calls
      if (duration > 2000) {
        logger.warn('Slow API call detected', {
          endpoint,
          duration,
          threshold: 2000
        });
      }
      
      return result;
    } catch (error) {
      const duration = performance.now() - start;
      trackApiCall(endpoint, duration);
      
      logger.error('API call failed', {
        endpoint,
        duration,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      
      throw error;
    }
  };

  return {
    trackComponentRender,
    trackApiCallWrapper
  };
};

// Hook for measuring React component performance
export const useComponentPerformance = (componentName: string) => {
  const { trackComponentRender } = usePerformanceMonitoring();

  useEffect(() => {
    const endTracking = trackComponentRender(componentName);
    return endTracking;
  }, [componentName, trackComponentRender]);
};