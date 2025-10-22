import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LucideIcon, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface OMMetricsCardProps {
  title: string;
  value: string | number;
  unit?: string;
  trend?: 'up' | 'down' | 'stable';
  trendLabel?: string;
  icon: LucideIcon;
  description?: string;
  status?: 'good' | 'warning' | 'critical';
}

export function OMMetricsCard({ 
  title, 
  value, 
  unit, 
  trend, 
  trendLabel,
  icon: Icon, 
  description,
  status = 'good'
}: OMMetricsCardProps) {
  const statusColors = {
    good: 'from-success/20 to-success/5 border-success/30',
    warning: 'from-warning/20 to-warning/5 border-warning/30',
    critical: 'from-destructive/20 to-destructive/5 border-destructive/30'
  };

  const iconColors = {
    good: 'text-success',
    warning: 'text-warning',
    critical: 'text-destructive'
  };

  const getTrendIcon = () => {
    if (trend === 'up') return <TrendingUp className="h-3 w-3" />;
    if (trend === 'down') return <TrendingDown className="h-3 w-3" />;
    return <Minus className="h-3 w-3" />;
  };

  const getTrendColor = () => {
    // Para custos, down é bom. Para MTBF e disponibilidade, up é bom
    if (title.toLowerCase().includes('custo')) {
      return trend === 'down' ? 'text-success' : trend === 'up' ? 'text-destructive' : 'text-muted-foreground';
    }
    return trend === 'up' ? 'text-success' : trend === 'down' ? 'text-destructive' : 'text-muted-foreground';
  };

  return (
    <Card className={`hover:shadow-lg transition-all duration-300 border bg-gradient-to-br ${statusColors[status]}`}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        <div className={`w-10 h-10 rounded-xl bg-gradient-to-br from-card to-card/50 flex items-center justify-center shadow-sm ${iconColors[status]}`}>
          <Icon className="h-5 w-5" />
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold text-foreground">{value}</span>
            {unit && <span className="text-sm text-muted-foreground">{unit}</span>}
          </div>
          
          {trend && trendLabel && (
            <div className={`flex items-center gap-1 text-xs font-medium ${getTrendColor()}`}>
              {getTrendIcon()}
              <span>{trendLabel}</span>
            </div>
          )}
          
          {description && (
            <p className="text-xs text-muted-foreground mt-1">{description}</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
