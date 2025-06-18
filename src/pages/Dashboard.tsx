
import { Zap, DollarSign, AlertTriangle, TrendingUp, Sun, Battery } from "lucide-react";
import { MetricCard } from "@/components/dashboard/MetricCard";
import { EnergyChart } from "@/components/dashboard/EnergyChart";
import { AlertsList } from "@/components/dashboard/AlertsList";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function Dashboard() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Dashboard Solar</h1>
          <p className="text-gray-600">Monitoramento em tempo real das suas usinas</p>
        </div>
        <div className="text-right">
          <p className="text-sm text-gray-500">Última atualização</p>
          <p className="font-semibold">18/12/2024 14:30</p>
        </div>
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricCard
          title="Geração Atual"
          value="125 kW"
          change="+12% vs ontem"
          changeType="positive"
          icon={Sun}
          description="2 plantas ativas"
        />
        <MetricCard
          title="Economia Mensal"
          value="R$ 8.947"
          change="+18% vs mês anterior"
          changeType="positive"
          icon={DollarSign}
          description="Até 18/12/2024"
        />
        <MetricCard
          title="Performance"
          value="94.2%"
          change="-5.8% vs meta"
          changeType="negative"
          icon={TrendingUp}
          description="Abaixo da meta"
        />
        <MetricCard
          title="Alertas Ativos"
          value="5"
          change="3 críticos"
          changeType="negative"
          icon={AlertTriangle}
          description="Requer atenção"
        />
      </div>

      {/* Charts and Alerts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Energy Chart */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="w-5 h-5 text-blue-500" />
                Geração vs Consumo (Hoje)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <EnergyChart />
            </CardContent>
          </Card>
        </div>

        {/* Alerts List */}
        <div>
          <AlertsList />
        </div>
      </div>

      {/* Bottom Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Plants Status */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Battery className="w-5 h-5 text-green-500" />
              Status das Plantas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                <div>
                  <p className="font-medium">Usina Solar Nordeste</p>
                  <p className="text-sm text-gray-600">150.5 kWp • Neoenergia PE</p>
                </div>
                <div className="text-right">
                  <p className="text-green-600 font-semibold">98.2%</p>
                  <p className="text-xs text-gray-500">Performance</p>
                </div>
              </div>
              <div className="flex items-center justify-between p-3 bg-yellow-50 rounded-lg">
                <div>
                  <p className="font-medium">Planta Solar Sul</p>
                  <p className="text-sm text-gray-600">89.2 kWp • Copel</p>
                </div>
                <div className="text-right">
                  <p className="text-yellow-600 font-semibold">87.5%</p>
                  <p className="text-xs text-gray-500">Performance</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Compliance Status */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-blue-500" />
              Compliance Lei 14.300/2022
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm">Limite de Potência</span>
                <span className="text-green-600 font-medium">✓ Conforme</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Prazo de Compensação</span>
                <span className="text-green-600 font-medium">✓ 48 meses restantes</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Conexão à Rede</span>
                <span className="text-green-600 font-medium">✓ Aprovada</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Medição Bidirecional</span>
                <span className="text-green-600 font-medium">✓ Instalada</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
