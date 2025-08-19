import React from 'react';
import { LucideIcon } from 'lucide-react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface ModernMetricCardProps {
  title: string;
  value: string;
  change: string;
  changeType: 'positive' | 'negative' | 'neutral';
  icon: LucideIcon;
  description?: string;
  trend?: number[];
  className?: string;
}

export function ModernMetricCard({
  title,
  value,
  change,
  changeType,
  icon: Icon,
  description,
  trend,
  className
}: ModernMetricCardProps) {
  const getChangeColor = () => {
    switch (changeType) {
      case 'positive':
        return 'text-success';
      case 'negative':
        return 'text-destructive';
      default:
        return 'text-muted-foreground';
    }
  };

  const getIconColor = () => {
    switch (changeType) {
      case 'positive':
        return 'text-success bg-success/10';
      case 'negative':
        return 'text-destructive bg-destructive/10';
      default:
        return 'text-primary bg-primary/10';
    }
  };

  return (
    <Card className={cn(
      "group relative overflow-hidden hover-lift transition-all duration-500",
      "bg-gradient-to-br from-card to-card/50 border-0 shadow-xl",
      className
    )}>
      {/* Background Pattern */}
      <div className="absolute inset-0 bg-gradient-to-br from-transparent via-white/5 to-white/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
      
      {/* Glow Effect */}
      <div className={cn(
        "absolute -inset-1 bg-gradient-to-br opacity-0 group-hover:opacity-20 transition-opacity duration-500 blur-xl",
        changeType === 'positive' ? 'from-success to-success/50' :
        changeType === 'negative' ? 'from-destructive to-destructive/50' :
        'from-primary to-primary/50'
      )} />
      
      <CardHeader className="relative pb-3">
        <div className="flex items-center justify-between">
          <div className={cn(
            "w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-300 group-hover:scale-110",
            getIconColor()
          )}>
            <Icon className="w-6 h-6" />
          </div>
          
          {trend && (
            <div className="w-20 h-8 relative overflow-hidden">
              <svg className="w-full h-full" viewBox="0 0 80 32" preserveAspectRatio="none">
                <path
                  d={`M 0 ${32 - (trend[0] * 24)} ${trend.map((point, index) => 
                    `L ${(index * 80) / (trend.length - 1)} ${32 - (point * 24)}`
                  ).join(' ')}`}
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  className={cn(
                    "opacity-60 transition-all duration-300 group-hover:opacity-100",
                    getChangeColor()
                  )}
                />
              </svg>
            </div>
          )}
        </div>
        
        <div className="space-y-1">
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          <div className="flex items-baseline gap-2">
            <p className="text-3xl font-bold font-display tracking-tight">{value}</p>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="relative pt-0">
        <div className="space-y-2">
          <div className={cn("text-sm font-medium", getChangeColor())}>
            {change}
          </div>
          {description && (
            <p className="text-xs text-muted-foreground leading-relaxed">
              {description}
            </p>
          )}
        </div>
        
        {/* Bottom accent line */}
        <div className={cn(
          "absolute bottom-0 left-0 h-1 bg-gradient-to-r transition-all duration-500 w-0 group-hover:w-full",
          changeType === 'positive' ? 'from-success to-success/50' :
          changeType === 'negative' ? 'from-destructive to-destructive/50' :
          'from-primary to-primary/50'
        )} />
      </CardContent>
    </Card>
  );
}