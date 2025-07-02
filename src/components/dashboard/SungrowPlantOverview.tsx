
import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { MetricCard } from '@/components/dashboard/MetricCard';
import { Zap, Sun, TrendingUp, Calendar, MapPin, Activity, AlertTriangle } from 'lucide-react';
import { useSungrowOverview } from '@/hooks/useSungrowData';
import { ErrorBoundary } from '@/components/ui/error-boundary';
import type { Plant } from '@/types';

interface SungrowPlantOverviewProps {
  plant: Plant;
}

const SungrowPlantOverviewContent = ({ plant }: SungrowPlantOverviewProps) => {
  const { data: overview, isLoading, error } = useSungrowOverview(plant);

  const getStatusBadge = () => {
    if (plant.status === 'active') {
      return <Badge variant="default">Ativa</Badge>;
    } else if (plant.status === 'maintenance') {
      return <Badge variant="outline">Manutenção</Badge>;
    }
    return <Badge variant="destructive">Inativa</Badge>;
  };

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i} className="animate-pulse">
            <CardHeader className="pb-2">
              <div className="h-4 bg-gray-200 rounded w-1/2"></div>
            </CardHeader>
            <CardContent>
              <div className="h-8 bg-gray-200 rounded mb-2"></div>
              <div className="h-3 bg-gray-200 rounded w-1/3"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Error Display */}
      {error && (
        <Card className="border-red-200 bg-red-50">
          <CardHeader>
            <CardTitle className="text-red-700 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5" />
              Erro na Conexão Sungrow
            </CardTitle>
            <CardDescription className="text-red-600">
              Não foi possível conectar com o Sungrow. Verifique as configurações de API.
            </CardDescription>
          </CardHeader>
        </Card>
      )}

      {/* Plant Info Card */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-start">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Sun className="w-5 h-5" />
                Informações da Planta Sungrow
              </CardTitle>
              <CardDescription>
                Dados gerais e status atual da instalação
              </CardDescription>
            </div>
            {getStatusBadge()}
          </div>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="space-y-2">
            <div className="flex items-center text-sm text-muted-foreground">
              <Zap className="w-4 h-4 mr-2" />
              Capacidade Instalada
            </div>
            <div className="text-2xl font-bold">{plant.capacity_kwp} kWp</div>
          </div>
          
          <div className="space-y-2">
            <div className="flex items-center text-sm text-muted-foreground">
              <MapPin className="w-4 h-4 mr-2" />
              Concessionária
            </div>
            <div className="text-lg font-medium">{plant.concessionaria}</div>
          </div>
          
          <div className="space-y-2">
            <div className="flex items-center text-sm text-muted-foreground">
              <Calendar className="w-4 h-4 mr-2" />
              Data de Início
            </div>
            <div className="text-lg font-medium">
              {new Date(plant.start_date).toLocaleDateString('pt-BR')}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Metrics Grid */}
      {overview && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <MetricCard
            title="Potência Atual"
            value={`${(overview.p83022 || 0).toFixed(2)} kW`}
            icon={Zap}
            description="Geração agora"
          />
          
          <MetricCard
            title="Energia Hoje"
            value={`${((overview.p83025 || 0)).toFixed(1)} kWh`}
            icon={Sun}
            description="Produção diária"
          />
          
          <MetricCard
            title="Energia Mensal"
            value={`${((overview.p83030 || 0) / 1000).toFixed(1)} MWh`}
            icon={Activity}
            description="Produção mensal"
          />
          
          <MetricCard
            title="Energia Total"
            value={`${((overview.p83106 || 0) / 1000000).toFixed(1)} MWh`}
            icon={TrendingUp}
            description="Desde o início"
          />
        </div>
      )}

      {/* Connection Status */}
      {plant.monitoring_system === 'sungrow' && !overview && !isLoading && !error && (
        <Card className="border-yellow-200 bg-yellow-50">
          <CardHeader>
            <CardTitle className="text-yellow-700">Aguardando Dados</CardTitle>
            <CardDescription className="text-yellow-600">
              Conectado ao Sungrow, aguardando primeira sincronização de dados.
            </CardDescription>
          </CardHeader>
        </Card>
      )}
    </div>
  );
};

export const SungrowPlantOverview = ({ plant }: SungrowPlantOverviewProps) => {
  return (
    <ErrorBoundary fallback={
      <Card className="border-red-200 bg-red-50">
        <CardHeader>
          <CardTitle className="text-red-700">Erro no Dashboard Sungrow</CardTitle>
          <CardDescription className="text-red-600">
            Ocorreu um erro ao carregar os dados da planta. Tente recarregar a página.
          </CardDescription>
        </CardHeader>
      </Card>
    }>
      <SungrowPlantOverviewContent plant={plant} />
    </ErrorBoundary>
  );
};
