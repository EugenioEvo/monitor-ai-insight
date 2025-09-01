import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RefreshCw, Activity, Sparkles, TrendingUp } from 'lucide-react';
import { LiveBadge } from './LiveBadge';

interface DashboardHeaderProps {
  connected: boolean;
  lastEventAt: Date | null;
  onRefresh: () => void;
  isRefreshing: boolean;
  selectedPeriod: 'today' | 'week' | 'month';
  onPeriodChange: (period: 'today' | 'week' | 'month') => void;
}

const periodLabels = {
  today: 'Hoje',
  week: 'Última Semana', 
  month: 'Este Mês'
};

export function DashboardHeader({
  connected,
  lastEventAt,
  onRefresh,
  isRefreshing,
  selectedPeriod,
  onPeriodChange
}: DashboardHeaderProps) {
  return (
    <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between animate-slide-down">
      {/* Title Section */}
      <div className="space-y-2">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-gradient-to-br from-primary to-primary/80 rounded-2xl flex items-center justify-center shadow-lg">
            <Activity className="w-6 h-6 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-foreground to-muted-foreground bg-clip-text text-transparent">
              Dashboard Solar
            </h1>
            <p className="text-muted-foreground flex items-center gap-2">
              <Sparkles className="w-4 h-4" />
              Monitoramento inteligente em tempo real
            </p>
          </div>
        </div>
      </div>

      {/* Controls Section */}
      <Card className="p-4 bg-card/50 backdrop-blur-sm border-border/50">
        <div className="flex flex-col sm:flex-row items-center gap-4">
          {/* Period Selector */}
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-muted-foreground" />
            <Select value={selectedPeriod} onValueChange={onPeriodChange}>
              <SelectTrigger className="w-40 bg-background/80">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="today">Hoje</SelectItem>
                <SelectItem value="week">Última Semana</SelectItem>
                <SelectItem value="month">Este Mês</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Live Badge */}
          <LiveBadge connected={connected} lastEventAt={lastEventAt} />

          {/* Refresh Button */}
          <Button
            variant="outline"
            size="lg"
            onClick={onRefresh}
            disabled={isRefreshing}
            className="group bg-background/80 hover:bg-background/90"
          >
            <RefreshCw 
              className={`w-4 h-4 mr-2 group-hover:rotate-180 transition-transform duration-500 ${
                isRefreshing ? 'animate-spin' : ''
              }`} 
            />
            Atualizar
          </Button>
        </div>
      </Card>
    </div>
  );
}