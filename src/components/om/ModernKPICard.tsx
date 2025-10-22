import { Card, CardContent } from "@/components/ui/card";
import { ArrowDown, ArrowUp, Minus } from "lucide-react";
import { cn } from "@/lib/utils";

interface ModernKPICardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  trend?: "up" | "down" | "stable";
  trendValue?: string;
  icon?: React.ReactNode;
  variant?: "default" | "success" | "warning" | "danger";
  sparklineData?: number[];
}

export function ModernKPICard({
  title,
  value,
  subtitle,
  trend,
  trendValue,
  icon,
  variant = "default",
  sparklineData,
}: ModernKPICardProps) {
  const getTrendIcon = () => {
    switch (trend) {
      case "up":
        return <ArrowUp className="h-4 w-4" />;
      case "down":
        return <ArrowDown className="h-4 w-4" />;
      case "stable":
        return <Minus className="h-4 w-4" />;
      default:
        return null;
    }
  };

  const variantStyles = {
    default: "border-border",
    success: "border-green-500/20 bg-green-500/5",
    warning: "border-yellow-500/20 bg-yellow-500/5",
    danger: "border-red-500/20 bg-red-500/5",
  };

  const trendStyles = {
    up: "text-green-600 dark:text-green-400",
    down: "text-red-600 dark:text-red-400",
    stable: "text-muted-foreground",
  };

  return (
    <Card className={cn("hover:shadow-lg transition-all", variantStyles[variant])}>
      <CardContent className="p-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <p className="text-sm font-medium text-muted-foreground mb-1">{title}</p>
            <div className="flex items-baseline gap-2">
              <h3 className="text-3xl font-bold">{value}</h3>
              {trend && trendValue && (
                <div className={cn("flex items-center gap-1 text-sm font-medium", trendStyles[trend])}>
                  {getTrendIcon()}
                  <span>{trendValue}</span>
                </div>
              )}
            </div>
            {subtitle && (
              <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>
            )}
          </div>
          {icon && (
            <div className="text-muted-foreground">
              {icon}
            </div>
          )}
        </div>

        {sparklineData && sparklineData.length > 0 && (
          <div className="h-12 flex items-end gap-1">
            {sparklineData.map((value, index) => (
              <div
                key={index}
                className="flex-1 bg-primary/20 rounded-t transition-all hover:bg-primary/40"
                style={{ height: `${(value / Math.max(...sparklineData)) * 100}%` }}
              />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
