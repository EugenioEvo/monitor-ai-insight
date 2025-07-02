import React, { useEffect, useRef } from 'react';
import { logger } from '@/services/logger';

interface PerformanceMetrics {
  renderTime: number;
  componentName: string;
  propsCount: number;
  memoryUsage?: number;
}

interface PerformanceTrackerProps {
  componentName: string;
  enabled?: boolean;
  children: React.ReactNode;
  logThreshold?: number; // Log apenas se render time > threshold (ms)
}

export const PerformanceTracker: React.FC<PerformanceTrackerProps> = React.memo(({
  componentName,
  enabled = false,
  children,
  logThreshold = 16 // 60fps = 16ms per frame
}) => {
  const renderStartTime = useRef<number>(0);
  const renderCount = useRef<number>(0);

  useEffect(() => {
    if (enabled) {
      renderStartTime.current = performance.now();
    }
  });

  useEffect(() => {
    if (enabled && renderStartTime.current > 0) {
      const renderTime = performance.now() - renderStartTime.current;
      renderCount.current += 1;

      if (renderTime > logThreshold) {
        const metrics: PerformanceMetrics = {
          renderTime,
          componentName,
          propsCount: Object.keys(children?.props || {}).length,
          memoryUsage: (performance as any).memory?.usedJSHeapSize
        };

        logger.warn('Slow render detected', {
          component: 'PerformanceTracker',
          metrics,
          renderCount: renderCount.current
        });
      }

      // Log estatísticas a cada 50 renders
      if (renderCount.current % 50 === 0) {
        logger.info('Performance stats', {
          component: 'PerformanceTracker',
          componentName,
          averageRenderTime: renderTime,
          totalRenders: renderCount.current
        });
      }
    }
  });

  return <>{children}</>;
});

PerformanceTracker.displayName = 'PerformanceTracker';

// Hook para tracking de performance
export const usePerformanceTracking = (componentName: string, enabled: boolean = false) => {
  const renderTimes = useRef<number[]>([]);
  const startTime = useRef<number>(0);

  const startTracking = () => {
    if (enabled) {
      startTime.current = performance.now();
    }
  };

  const endTracking = () => {
    if (enabled && startTime.current > 0) {
      const renderTime = performance.now() - startTime.current;
      renderTimes.current.push(renderTime);

      // Manter apenas os últimos 100 renders
      if (renderTimes.current.length > 100) {
        renderTimes.current.shift();
      }

      // Log se renderização for lenta
      if (renderTime > 16) {
        logger.warn('Slow operation detected', {
          component: componentName,
          renderTime,
          averageTime: renderTimes.current.reduce((a, b) => a + b, 0) / renderTimes.current.length
        });
      }
    }
  };

  const getStats = () => {
    if (renderTimes.current.length === 0) return null;

    const times = renderTimes.current;
    const avg = times.reduce((a, b) => a + b, 0) / times.length;
    const max = Math.max(...times);
    const min = Math.min(...times);

    return { avg, max, min, count: times.length };
  };

  return { startTracking, endTracking, getStats };
};