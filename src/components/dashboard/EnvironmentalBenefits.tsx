
import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Leaf, TreePine, Car, Home } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { MetricCard } from '@/components/dashboard/MetricCard';
import type { Plant } from '@/types';
import type { SolarEdgeConfig } from '@/types/monitoring';

interface EnvironmentalBenefitsProps {
  plant: Plant;
}

export const EnvironmentalBenefits = ({ plant }: EnvironmentalBenefitsProps) => {
  const { data: benefits, isLoading } = useQuery({
    queryKey: ['environmental-benefits', plant.id],
    queryFn: async () => {
      if (plant.monitoring_system !== 'solaredge' || !plant.api_credentials) {
        return null;
      }

      const { data, error } = await supabase.functions.invoke('solaredge-connector', {
        body: {
          action: 'get_environmental_benefits',
          config: plant.api_credentials as SolarEdgeConfig
        }
      });

      if (error) throw error;
      return data.success ? data.data : null;
    },
    enabled: plant.monitoring_system === 'solaredge' && !!plant.api_credentials
  });

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

  if (!benefits) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Leaf className="w-5 h-5" />
            Benefícios Ambientais
          </CardTitle>
          <CardDescription>
            Impacto ambiental positivo da energia solar
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-32 text-muted-foreground">
            <div className="text-center">
              <Leaf className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>Dados de benefícios ambientais não disponíveis</p>
              {plant.monitoring_system === 'manual' && (
                <p className="text-sm mt-2">Configure um sistema de monitoramento para visualizar benefícios</p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const formatNumber = (num: number) => {
    if (num >= 1000000) {
      return `${(num / 1000000).toFixed(1)}M`;
    }
    if (num >= 1000) {
      return `${(num / 1000).toFixed(1)}K`;
    }
    return num.toFixed(1);
  };

  return (
    <div className="space-y-6">
      {/* Main Benefits Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricCard
          title="CO₂ Evitado"
          value={`${formatNumber(benefits.co2EmissionSaved || 0)} kg`}
          icon={Leaf}
          description="Emissão evitada total"
        />
        
        <MetricCard
          title="Árvores Plantadas"
          value={`${formatNumber(benefits.treesPlanted || 0)}`}
          icon={TreePine}
          description="Equivalente em árvores"
        />
        
        <MetricCard
          title="Carros fora de Circulação"
          value={`${formatNumber(benefits.lightBulbs || 0)}`}
          icon={Car}
          description="Equivalente em veículos"
        />
        
        <MetricCard
          title="Casas Alimentadas"
          value={`${formatNumber(benefits.co2EmissionSaved / 7300 || 0)}`}
          icon={Home}
          description="Por um ano (estimativa)"
        />
      </div>

      {/* Detailed Environmental Impact */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Leaf className="w-5 h-5" />
            Impacto Ambiental Detalhado
          </CardTitle>
          <CardDescription>
            Benefícios ambientais acumulados desde o início da operação
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* CO2 Reduction */}
            <div className="space-y-4">
              <h4 className="font-semibold text-lg flex items-center gap-2">
                <Leaf className="w-5 h-5 text-green-600" />
                Redução de Carbono
              </h4>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">CO₂ Total Evitado:</span>
                  <span className="font-medium">{(benefits.co2EmissionSaved || 0).toLocaleString()} kg</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Equivalente em Toneladas:</span>
                  <span className="font-medium">{((benefits.co2EmissionSaved || 0) / 1000).toFixed(2)} t</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Redução Mensal Média:</span>
                  <span className="font-medium">
                    {(((benefits.co2EmissionSaved || 0) / 12) / 1000).toFixed(2)} t/mês
                  </span>
                </div>
              </div>
            </div>

            {/* Forest Impact */}
            <div className="space-y-4">
              <h4 className="font-semibold text-lg flex items-center gap-2">
                <TreePine className="w-5 h-5 text-green-600" />
                Impacto Florestal
              </h4>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Árvores Equivalentes:</span>
                  <span className="font-medium">{(benefits.treesPlanted || 0).toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Área de Floresta:</span>
                  <span className="font-medium">
                    {((benefits.treesPlanted || 0) * 10).toLocaleString()} m²
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Oxigênio Produzido:</span>
                  <span className="font-medium">
                    {((benefits.treesPlanted || 0) * 260).toLocaleString()} kg/ano
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Progress Bars */}
          <div className="mt-8 pt-6 border-t">
            <h4 className="font-medium mb-4">Progresso de Sustentabilidade</h4>
            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span>Meta Anual de CO₂ (10 toneladas)</span>
                  <span>{Math.min(100, ((benefits.co2EmissionSaved || 0) / 10000) * 100).toFixed(1)}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-green-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${Math.min(100, ((benefits.co2EmissionSaved || 0) / 10000) * 100)}%` }}
                  ></div>
                </div>
              </div>
              
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span>Meta de Árvores (1000 equivalentes)</span>
                  <span>{Math.min(100, ((benefits.treesPlanted || 0) / 1000) * 100).toFixed(1)}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-green-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${Math.min(100, ((benefits.treesPlanted || 0) / 1000) * 100)}%` }}
                  ></div>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
