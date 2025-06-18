
import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowLeft, Zap, Activity, TrendingUp, Leaf, AlertTriangle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { PlantOverview } from '@/components/dashboard/PlantOverview';
import { ProductionCharts } from '@/components/dashboard/ProductionCharts';
import { PowerFlowDiagram } from '@/components/dashboard/PowerFlowDiagram';
import { EquipmentStatus } from '@/components/dashboard/EquipmentStatus';
import { EnvironmentalBenefits } from '@/components/dashboard/EnvironmentalBenefits';
import { BeneficiaryManagement } from '@/components/beneficiaries/BeneficiaryManagement';
import type { Plant } from '@/types';

export default function PlantDashboard() {
  const { id } = useParams();
  const navigate = useNavigate();

  const { data: plant, isLoading } = useQuery({
    queryKey: ['plant', id],
    queryFn: async () => {
      if (!id) throw new Error('Plant ID não fornecido');
      
      const { data, error } = await supabase
        .from('plants')
        .select('*')
        .eq('id', id)
        .single();
      
      if (error) throw error;
      return data as Plant;
    },
    enabled: !!id
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  if (!plant) {
    return (
      <div className="text-center py-8">
        <h2 className="text-2xl font-bold mb-4">Planta não encontrada</h2>
        <Button onClick={() => navigate('/plants')}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Voltar para Plantas
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => navigate('/plants')}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Voltar
          </Button>
          <div>
            <h1 className="text-3xl font-bold">{plant.name}</h1>
            <p className="text-muted-foreground">
              {plant.capacity_kwp} kWp • {plant.concessionaria}
            </p>
          </div>
        </div>
      </div>

      {/* Dashboard Tabs */}
      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="overview">
            <Activity className="w-4 h-4 mr-2" />
            Visão Geral
          </TabsTrigger>
          <TabsTrigger value="production">
            <TrendingUp className="w-4 h-4 mr-2" />
            Produção
          </TabsTrigger>
          <TabsTrigger value="powerflow">
            <Zap className="w-4 h-4 mr-2" />
            Fluxo de Energia
          </TabsTrigger>
          <TabsTrigger value="equipment">
            <AlertTriangle className="w-4 h-4 mr-2" />
            Equipamentos
          </TabsTrigger>
          <TabsTrigger value="benefits">
            <Leaf className="w-4 h-4 mr-2" />
            Benefícios
          </TabsTrigger>
          <TabsTrigger value="beneficiaries">
            Beneficiários
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <PlantOverview plant={plant} />
        </TabsContent>

        <TabsContent value="production">
          <ProductionCharts plant={plant} />
        </TabsContent>

        <TabsContent value="powerflow">
          <PowerFlowDiagram plant={plant} />
        </TabsContent>

        <TabsContent value="equipment">
          <EquipmentStatus plant={plant} />
        </TabsContent>

        <TabsContent value="benefits">
          <EnvironmentalBenefits plant={plant} />
        </TabsContent>

        <TabsContent value="beneficiaries">
          <BeneficiaryManagement plant={plant} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
