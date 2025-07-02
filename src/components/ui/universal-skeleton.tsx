
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

interface UniversalSkeletonProps {
  className?: string;
  variant?: 'card' | 'list' | 'table' | 'dashboard' | 'chart' | 'form' | 'profile';
  rows?: number;
  columns?: number;
  showAvatar?: boolean;
  showHeader?: boolean;
  animated?: boolean;
}

const SkeletonBase = ({ className, animated = true }: { className?: string; animated?: boolean }) => (
  <div className={cn(
    "bg-gray-200 rounded",
    animated && "animate-pulse",
    className
  )} />
);

export function UniversalSkeleton({ 
  className, 
  variant = 'card', 
  rows = 3, 
  columns = 1,
  showAvatar = false,
  showHeader = true,
  animated = true
}: UniversalSkeletonProps) {
  
  const renderCardSkeleton = () => (
    <Card className={cn("w-full", className)}>
      {showHeader && (
        <CardHeader className="space-y-2">
          <SkeletonBase className="h-6 w-3/4" animated={animated} />
          <SkeletonBase className="h-4 w-1/2" animated={animated} />
        </CardHeader>
      )}
      <CardContent className="space-y-3">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="space-y-2">
            <SkeletonBase className="h-4 w-full" animated={animated} />
            <SkeletonBase className="h-4 w-4/5" animated={animated} />
          </div>
        ))}
      </CardContent>
    </Card>
  );

  const renderListSkeleton = () => (
    <div className={cn("space-y-4", className)}>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center space-x-4">
          {showAvatar && (
            <SkeletonBase className="h-12 w-12 rounded-full" animated={animated} />
          )}
          <div className="flex-1 space-y-2">
            <SkeletonBase className="h-4 w-3/4" animated={animated} />
            <SkeletonBase className="h-3 w-1/2" animated={animated} />
          </div>
        </div>
      ))}
    </div>
  );

  const renderTableSkeleton = () => (
    <div className={cn("w-full", className)}>
      {/* Header */}
      <div className="grid gap-4 p-4 border-b" style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}>
        {Array.from({ length: columns }).map((_, i) => (
          <SkeletonBase key={i} className="h-4 w-20" animated={animated} />
        ))}
      </div>
      
      {/* Rows */}
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <div key={rowIndex} className="grid gap-4 p-4 border-b" style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}>
          {Array.from({ length: columns }).map((_, colIndex) => (
            <SkeletonBase key={colIndex} className="h-4 w-full" animated={animated} />
          ))}
        </div>
      ))}
    </div>
  );

  const renderDashboardSkeleton = () => (
    <div className={cn("space-y-6", className)}>
      {/* Header */}
      <div className="space-y-2">
        <SkeletonBase className="h-8 w-1/3" animated={animated} />
        <SkeletonBase className="h-4 w-1/2" animated={animated} />
      </div>
      
      {/* Metric Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i} className="p-6">
            <div className="space-y-3">
              <SkeletonBase className="h-4 w-2/3" animated={animated} />
              <SkeletonBase className="h-8 w-1/2" animated={animated} />
              <SkeletonBase className="h-3 w-1/3" animated={animated} />
            </div>
          </Card>
        ))}
      </div>
      
      {/* Chart Area */}
      <Card className="p-6">
        <div className="space-y-4">
          <SkeletonBase className="h-6 w-1/4" animated={animated} />
          <SkeletonBase className="h-64 w-full" animated={animated} />
        </div>
      </Card>
    </div>
  );

  const renderChartSkeleton = () => (
    <Card className={cn("p-6", className)}>
      <div className="space-y-4">
        {showHeader && (
          <div className="space-y-2">
            <SkeletonBase className="h-6 w-1/3" animated={animated} />
            <SkeletonBase className="h-4 w-1/2" animated={animated} />
          </div>
        )}
        <SkeletonBase className="h-64 w-full" animated={animated} />
        <div className="flex justify-center space-x-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex items-center space-x-2">
              <SkeletonBase className="h-3 w-3 rounded-full" animated={animated} />
              <SkeletonBase className="h-3 w-16" animated={animated} />
            </div>
          ))}
        </div>
      </div>
    </Card>
  );

  const renderFormSkeleton = () => (
    <Card className={cn("p-6", className)}>
      <div className="space-y-6">
        {showHeader && (
          <div className="space-y-2">
            <SkeletonBase className="h-6 w-1/3" animated={animated} />
            <SkeletonBase className="h-4 w-2/3" animated={animated} />
          </div>
        )}
        
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="space-y-2">
            <SkeletonBase className="h-4 w-1/4" animated={animated} />
            <SkeletonBase className="h-10 w-full" animated={animated} />
          </div>
        ))}
        
        <div className="flex space-x-4 pt-4">
          <SkeletonBase className="h-10 w-24" animated={animated} />
          <SkeletonBase className="h-10 w-24" animated={animated} />
        </div>
      </div>
    </Card>
  );

  const renderProfileSkeleton = () => (
    <Card className={cn("p-6", className)}>
      <div className="space-y-6">
        {/* Avatar e nome */}
        <div className="flex items-center space-x-4">
          <SkeletonBase className="h-20 w-20 rounded-full" animated={animated} />
          <div className="space-y-2">
            <SkeletonBase className="h-6 w-48" animated={animated} />
            <SkeletonBase className="h-4 w-32" animated={animated} />
            <SkeletonBase className="h-4 w-24" animated={animated} />
          </div>
        </div>
        
        {/* Informações */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {Array.from({ length: rows }).map((_, i) => (
            <div key={i} className="space-y-2">
              <SkeletonBase className="h-4 w-1/3" animated={animated} />
              <SkeletonBase className="h-6 w-2/3" animated={animated} />
            </div>
          ))}
        </div>
      </div>
    </Card>
  );

  switch (variant) {
    case 'list':
      return renderListSkeleton();
    case 'table':
      return renderTableSkeleton();
    case 'dashboard':
      return renderDashboardSkeleton();
    case 'chart':
      return renderChartSkeleton();
    case 'form':
      return renderFormSkeleton();
    case 'profile':
      return renderProfileSkeleton();
    case 'card':
    default:
      return renderCardSkeleton();
  }
}

// Componentes específicos para uso comum
export const DashboardSkeleton = () => (
  <UniversalSkeleton variant="dashboard" />
);

export const ChartSkeleton = ({ title }: { title?: string }) => (
  <UniversalSkeleton variant="chart" showHeader={Boolean(title)} />
);

export const ListSkeleton = ({ items = 5, showAvatars = false }: { items?: number; showAvatars?: boolean }) => (
  <UniversalSkeleton variant="list" rows={items} showAvatar={showAvatars} />
);

export const TableSkeleton = ({ rows = 5, columns = 4 }: { rows?: number; columns?: number }) => (
  <UniversalSkeleton variant="table" rows={rows} columns={columns} />
);

export const FormSkeleton = ({ fields = 4 }: { fields?: number }) => (
  <UniversalSkeleton variant="form" rows={fields} />
);

export const ProfileSkeleton = () => (
  <UniversalSkeleton variant="profile" rows={6} />
);

// Hook para loading states contextuais
export const useLoadingSkeleton = (loading: boolean, variant: UniversalSkeletonProps['variant'] = 'card') => {
  if (!loading) return null;
  
  return () => <UniversalSkeleton variant={variant} />;
};
