import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export type DashboardPeriod = 'today' | 'week' | 'month';

interface ReadingRow {
  timestamp: string;
  energy_kwh: string | number;
}

interface AggregatedPoint {
  time: string;
  geracao: number;
}

const startOfPeriod = (period: DashboardPeriod) => {
  const now = new Date();
  if (period === 'today') {
    const d = new Date(now);
    d.setHours(0, 0, 0, 0);
    return d;
  }
  if (period === 'week') {
    const d = new Date(now);
    d.setDate(d.getDate() - 6);
    d.setHours(0, 0, 0, 0);
    return d;
  }
  const d = new Date(now);
  d.setDate(d.getDate() - 29);
  d.setHours(0, 0, 0, 0);
  return d;
};

const getLabel = (date: Date, period: DashboardPeriod) => {
  if (period === 'today') {
    return `${date.getHours().toString().padStart(2, '0')}:00`;
  }
  // dd/MM for week and month
  return `${date.getDate().toString().padStart(2, '0')}/${(date.getMonth() + 1)
    .toString()
    .padStart(2, '0')}`;
};

const aggregateReadings = (rows: ReadingRow[], period: DashboardPeriod): AggregatedPoint[] => {
  const buckets = new Map<string, number>();

  for (const r of rows) {
    const d = new Date(r.timestamp);
    const label = getLabel(d, period);
    const value = typeof r.energy_kwh === 'string' ? parseFloat(r.energy_kwh) : r.energy_kwh || 0;
    buckets.set(label, (buckets.get(label) || 0) + (isNaN(value) ? 0 : value));
  }

  // Sort labels chronologically
  const labels = Array.from(buckets.keys()).sort((a, b) => {
    const [da, ma] = a.includes(':') ? [0, 0] : a.split('/').map(Number);
    const [db, mb] = b.includes(':') ? [0, 0] : b.split('/').map(Number);
    if (a.includes(':') && b.includes(':')) return a.localeCompare(b);
    if (a.includes(':')) return -1;
    if (b.includes(':')) return 1;
    return da === db ? ma - mb : da - db;
  });

  return labels.map((label) => ({ time: label, geracao: buckets.get(label) || 0 }));
};

export const useAggregateReadings = (period: DashboardPeriod, plantId?: string) => {
  const from = startOfPeriod(period).toISOString();

  return useQuery<AggregatedPoint[]>({
    queryKey: ['readings', 'aggregate', period, plantId],
    queryFn: async () => {
      let query = supabase
        .from('readings')
        .select('timestamp, energy_kwh')
        .gte('timestamp', from)
        .order('timestamp', { ascending: true });

      // Filter by plant if specified
      if (plantId) {
        query = query.eq('plant_id', plantId);
      }

      const { data, error } = await query;

      if (error) throw error;
      const rows = (data || []) as ReadingRow[];
      return aggregateReadings(rows, period);
    },
    staleTime: 30_000,
    refetchInterval: plantId ? 30_000 : 60_000, // More frequent updates for individual plants
    retry: 3,
    retryDelay: attemptIndex => Math.min(1000 * 2 ** attemptIndex, 30000),
  });
};
