import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Zap } from 'lucide-react';
import { EnergyChart } from './EnergyChart';
import { AlertsList } from './AlertsList';

interface DashboardOverviewProps {
  selectedPeriod: 'today' | 'week' | 'month';
}

const getPeriodLabel = (period: 'today' | 'week' | 'month') => {
  switch (period) {
    case 'today': return 'Hoje';
    case 'week': return 'Última Semana';
    case 'month': return 'Este Mês';
  }
};

export function DashboardOverview({ selectedPeriod }: DashboardOverviewProps) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      {/* Energy Chart */}
      <div className="lg:col-span-2">
        <Card className="shadow-lg border-border/50 bg-card/50 backdrop-blur-sm hover:shadow-xl transition-all duration-300">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-primary to-primary/80 rounded-xl flex items-center justify-center shadow-lg">
                <Zap className="w-5 h-5 text-primary-foreground" />
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xl font-bold">Geração vs Consumo</span>
                <Badge 
                  variant="secondary" 
                  className="bg-primary/10 text-primary border-primary/20 font-medium"
                >
                  {getPeriodLabel(selectedPeriod)}
                </Badge>
              </div>
            </CardTitle>
            <CardDescription className="text-muted-foreground">
              Comparativo inteligente entre energia gerada e consumida
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-0">
            <EnergyChart period={selectedPeriod} />
          </CardContent>
        </Card>
      </div>

      {/* Alerts List */}
      <div className="space-y-6">
        <AlertsList />
      </div>
    </div>
  );
}