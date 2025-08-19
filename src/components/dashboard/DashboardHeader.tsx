import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Activity, RefreshCw, Sparkles } from "lucide-react";
import { LiveBadge } from "./LiveBadge";

interface DashboardHeaderProps {
  connected: boolean;
  lastEventAt: Date | null;
  isLoading: boolean;
  onRefresh: () => void;
}

export function DashboardHeader({ 
  connected, 
  lastEventAt, 
  isLoading, 
  onRefresh 
}: DashboardHeaderProps) {
  return (
    <div className="flex items-center justify-between animate-slide-down">
      <div className="space-y-2">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-gradient-solar rounded-2xl flex items-center justify-center shadow-lg">
            <Activity className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-responsive-2xl font-display font-bold tracking-tight">
              Dashboard Solar
            </h1>
            <p className="text-muted-foreground flex items-center gap-2">
              <Sparkles className="w-4 h-4" />
              Monitoramento inteligente em tempo real
            </p>
          </div>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <LiveBadge connected={connected} lastEventAt={lastEventAt} />
        <Button
          variant="outline" 
          size="lg"
          onClick={onRefresh}
          disabled={isLoading}
          className="group"
        >
          <RefreshCw className={`w-4 h-4 mr-2 group-hover:rotate-180 transition-transform duration-500 ${isLoading ? 'animate-spin' : ''}`} />
          Atualizar
        </Button>
      </div>
    </div>
  );
}