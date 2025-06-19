
import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, TrendingUp, TrendingDown, Zap, DollarSign } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useCustomerData } from "@/hooks/useCustomerData";
import { CustomerGenerationTab } from "@/components/customers/dashboard/CustomerGenerationTab";
import { CustomerConsumptionTab } from "@/components/customers/dashboard/CustomerConsumptionTab";
import { CustomerOverviewCards } from "@/components/customers/dashboard/CustomerOverviewCards";
import { CustomerComparisonCharts } from "@/components/customers/dashboard/CustomerComparisonCharts";

const CustomerDashboard = () => {
  const { id: customerId } = useParams();
  const navigate = useNavigate();
  const [selectedPeriod, setSelectedPeriod] = useState("12"); // últimos 12 meses
  
  const { data, isLoading, error } = useCustomerData(customerId!);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg">Carregando dashboard...</div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg text-red-500">Erro ao carregar dados do cliente</div>
      </div>
    );
  }

  const { customer, plants, units, invoices, readings, metrics } = data;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" onClick={() => navigate("/customers")}>
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Dashboard - {customer.name}
          </h1>
          <p className="text-muted-foreground">
            Acompanhe a geração e consumo de energia
          </p>
        </div>
      </div>

      {/* Cards de Resumo */}
      <CustomerOverviewCards 
        plants={plants}
        units={units}
        metrics={metrics}
        selectedPeriod={selectedPeriod}
      />

      {/* Gráficos de Comparação */}
      <CustomerComparisonCharts 
        customerId={customerId!}
        selectedPeriod={selectedPeriod}
        onPeriodChange={setSelectedPeriod}
      />

      {/* Abas Detalhadas */}
      <Card>
        <CardHeader>
          <CardTitle>Dados Detalhados</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="generation" className="space-y-4">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="generation" className="flex items-center gap-2">
                <Zap className="w-4 h-4" />
                Geração
              </TabsTrigger>
              <TabsTrigger value="consumption" className="flex items-center gap-2">
                <TrendingDown className="w-4 h-4" />
                Consumo
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="generation">
              <CustomerGenerationTab 
                customerId={customerId!}
                plants={plants}
                readings={readings}
              />
            </TabsContent>
            
            <TabsContent value="consumption">
              <CustomerConsumptionTab 
                customerId={customerId!}
                units={units}
                invoices={invoices}
              />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};

export default CustomerDashboard;
