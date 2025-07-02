import { create } from 'zustand';
import { logger } from '@/services/logger';

interface PerformanceMetric {
  name: string;
  value: number;
  timestamp: string;
  category: 'api' | 'render' | 'navigation' | 'sync';
}

interface HealthCheck {
  service: string;
  status: 'healthy' | 'degraded' | 'down';
  responseTime?: number;
  error?: string;
  lastCheck: string;
}

interface Alert {
  id: string;
  type: 'error' | 'warning' | 'info';
  message: string;
  details?: string;
  timestamp: string;
  acknowledged: boolean;
  source: string;
}

interface MonitoringState {
  // Performance
  metrics: PerformanceMetric[];
  
  // Health
  healthChecks: Record<string, HealthCheck>;
  
  // Alerts
  alerts: Alert[];
  
  // Status
  systemHealth: 'healthy' | 'degraded' | 'down';
  
  // Actions
  addMetric: (metric: Omit<PerformanceMetric, 'timestamp'>) => void;
  updateHealthCheck: (service: string, check: Omit<HealthCheck, 'service' | 'lastCheck'>) => void;
  addAlert: (alert: Omit<Alert, 'id' | 'timestamp' | 'acknowledged'>) => void;
  acknowledgeAlert: (alertId: string) => void;
  clearOldMetrics: () => void;
  getSystemHealth: () => 'healthy' | 'degraded' | 'down';
}

export const useMonitoringStore = create<MonitoringState>((set, get) => ({
  metrics: [],
  healthChecks: {},
  alerts: [],
  systemHealth: 'healthy',

  addMetric: (metric) => {
    const newMetric: PerformanceMetric = {
      ...metric,
      timestamp: new Date().toISOString()
    };

    set((state) => ({
      metrics: [...state.metrics.slice(-99), newMetric] // Keep last 100 metrics
    }));

    // Log slow operations
    if (metric.value > 5000) { // > 5 seconds
      logger.warn('Slow operation detected', {
        component: 'MonitoringStore',
        metric: metric.name,
        value: metric.value,
        category: metric.category
      });
    }
  },

  updateHealthCheck: (service, check) => {
    const healthCheck: HealthCheck = {
      ...check,
      service,
      lastCheck: new Date().toISOString()
    };

    set((state) => ({
      healthChecks: {
        ...state.healthChecks,
        [service]: healthCheck
      }
    }));

    // Auto-create alerts for service issues
    if (check.status === 'down') {
      get().addAlert({
        type: 'error',
        message: `Service ${service} is down`,
        details: check.error,
        source: 'health-monitor'
      });
    }
  },

  addAlert: (alert) => {
    const newAlert: Alert = {
      ...alert,
      id: `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date().toISOString(),
      acknowledged: false
    };

    set((state) => ({
      alerts: [newAlert, ...state.alerts.slice(0, 49)] // Keep last 50 alerts
    }));

    logger.info('Alert created', {
      component: 'MonitoringStore',
      alertId: newAlert.id,
      type: newAlert.type,
      source: newAlert.source
    });
  },

  acknowledgeAlert: (alertId) => {
    set((state) => ({
      alerts: state.alerts.map(alert =>
        alert.id === alertId ? { ...alert, acknowledged: true } : alert
      )
    }));
  },

  clearOldMetrics: () => {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    
    set((state) => ({
      metrics: state.metrics.filter(metric => metric.timestamp > oneHourAgo)
    }));
  },

  getSystemHealth: () => {
    const { healthChecks } = get();
    const services = Object.values(healthChecks);
    
    if (services.length === 0) return 'healthy';
    
    const downServices = services.filter(s => s.status === 'down');
    const degradedServices = services.filter(s => s.status === 'degraded');
    
    if (downServices.length > 0) return 'down';
    if (degradedServices.length > 0) return 'degraded';
    
    return 'healthy';
  }
}));

// Performance monitoring hooks
export const usePerformanceTracker = () => {
  const addMetric = useMonitoringStore(state => state.addMetric);

  const trackApiCall = (endpoint: string, duration: number) => {
    addMetric({
      name: `api_${endpoint}`,
      value: duration,
      category: 'api'
    });
  };

  const trackRender = (component: string, duration: number) => {
    addMetric({
      name: `render_${component}`,
      value: duration,
      category: 'render'
    });
  };

  const trackNavigation = (route: string, duration: number) => {
    addMetric({
      name: `navigation_${route}`,
      value: duration,
      category: 'navigation'
    });
  };

  const trackSync = (plantId: string, duration: number) => {
    addMetric({
      name: `sync_${plantId}`,
      value: duration,
      category: 'sync'
    });
  };

  return {
    trackApiCall,
    trackRender,
    trackNavigation,
    trackSync
  };
};