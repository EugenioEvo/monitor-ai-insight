
import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Activity } from 'lucide-react';

interface LiveBadgeProps {
  connected: boolean;
  lastEventAt: Date | null;
}

export const LiveBadge: React.FC<LiveBadgeProps> = ({ connected, lastEventAt }) => {
  const timeLabel = lastEventAt
    ? ` • Último evento ${lastEventAt.toLocaleTimeString('pt-BR')}`
    : '';

  return (
    <Badge variant="outline" className="flex items-center gap-1.5">
      <span
        className={`h-2 w-2 rounded-full ${
          connected ? 'bg-green-500 animate-pulse' : 'bg-gray-400'
        }`}
      />
      <Activity className="h-3.5 w-3.5 text-muted-foreground" />
      <span className="text-xs">{connected ? 'Ao vivo' : 'Offline'}{timeLabel}</span>
    </Badge>
  );
};
