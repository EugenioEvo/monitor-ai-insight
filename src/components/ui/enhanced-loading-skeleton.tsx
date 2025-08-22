import { cn } from "@/lib/utils";

interface EnhancedLoadingSkeletonProps {
  className?: string;
  rows?: number;
  avatar?: boolean;
  variant?: 'default' | 'card' | 'metrics' | 'chart';
}

export function EnhancedLoadingSkeleton({ 
  className, 
  rows = 3, 
  avatar = false, 
  variant = 'default' 
}: EnhancedLoadingSkeletonProps) {
  if (variant === 'metrics') {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="animate-pulse bg-card rounded-xl p-6 border shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-muted rounded-xl"></div>
              <div className="w-16 h-4 bg-muted rounded"></div>
            </div>
            <div className="space-y-2">
              <div className="h-4 bg-muted rounded w-3/4"></div>
              <div className="h-8 bg-muted rounded w-1/2"></div>
              <div className="h-3 bg-muted rounded w-full"></div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (variant === 'chart') {
    return (
      <div className={cn("animate-pulse", className)}>
        <div className="space-y-3">
          <div className="h-4 bg-muted rounded w-20"></div>
          <div className="h-64 bg-muted rounded"></div>
          <div className="flex justify-between">
            <div className="h-3 bg-muted rounded w-12"></div>
            <div className="h-3 bg-muted rounded w-12"></div>
            <div className="h-3 bg-muted rounded w-12"></div>
            <div className="h-3 bg-muted rounded w-12"></div>
          </div>
        </div>
      </div>
    );
  }

  if (variant === 'card') {
    return (
      <div className={cn("animate-pulse bg-card rounded-xl p-6 border shadow-sm", className)}>
        <div className="space-y-4">
          <div className="flex items-center space-x-4">
            <div className="rounded-full bg-muted h-10 w-10"></div>
            <div className="flex-1 space-y-2">
              <div className="h-4 bg-muted rounded w-3/4"></div>
              <div className="h-3 bg-muted rounded w-1/2"></div>
            </div>
          </div>
          <div className="space-y-2">
            {Array.from({ length: rows }).map((_, i) => (
              <div key={i} className="h-4 bg-muted rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("animate-pulse", className)}>
      {avatar && (
        <div className="flex items-center space-x-4 mb-4">
          <div className="rounded-full bg-muted h-10 w-10"></div>
          <div className="flex-1 space-y-2">
            <div className="h-4 bg-muted rounded w-3/4"></div>
            <div className="h-3 bg-muted rounded w-1/2"></div>
          </div>
        </div>
      )}
      <div className="space-y-3">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="space-y-2">
            <div className="h-4 bg-muted rounded"></div>
            <div className="h-4 bg-muted rounded w-5/6"></div>
          </div>
        ))}
      </div>
    </div>
  );
}