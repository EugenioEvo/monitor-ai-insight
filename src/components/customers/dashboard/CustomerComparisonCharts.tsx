
import { useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, BarChart, Bar } from "recharts";
import { useCustomerGenerationData, useCustomerConsumptionData } from "@/hooks/useCustomerDashboard";

interface CustomerComparisonChartsProps {
  customerId: string;
  selectedPeriod: string;
  onPeriodChange: (period: string) => void;
}

export const CustomerComparisonCharts = ({ 
  customerId, 
  selectedPeriod, 
  onPeriodChange 
}: CustomerComparisonChartsProps) => {
  const { data: generationData } = useCustomerGenerationData(customerId);
  const { data: consumptionData } = useCustomerConsumptionData(customerId);

  // Combinar dados de geração e consumo por mês
  const combinedData = generationData?.chartData?.map(genData => {
    const consData = consumptionData?.chartData?.find(c => c.month === genData.month);
    return {
      month: genData.month,
      generation: genData.total || 0,
      consumption: consData?.consumption || 0,
      cost: consData?.cost || 0,
      savings: (genData.total || 0) * 0.85, // Estimativa de economia baseada na geração
    };
  }) || [];

  // Filtrar dados pelo período selecionado
  const filteredData = combinedData.slice(-parseInt(selectedPeriod));

  return (
    <div className="space-y-6">
      {/* Seletor de Período */}
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Análise Comparativa</h2>
        <Select value={selectedPeriod} onValueChange={onPeriodChange}>
          <SelectTrigger className="w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="6">Últimos 6 meses</SelectItem>
            <SelectItem value="12">Últimos 12 meses</SelectItem>
            <SelectItem value="24">Últimos 24 meses</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Gráfico de Geração vs Consumo */}
        <Card>
          <CardHeader>
            <CardTitle>Geração vs Consumo (kWh)</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={filteredData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip 
                  formatter={(value: number, name: string) => [
                    `${value.toLocaleString('pt-BR')} kWh`,
                    name === 'generation' ? 'Geração' : 'Consumo'
                  ]}
                />
                <Legend 
                  formatter={(value: string) => value === 'generation' ? 'Geração' : 'Consumo'}
                />
                <Line 
                  type="monotone" 
                  dataKey="generation" 
                  stroke="#22c55e" 
                  strokeWidth={2}
                  name="generation"
                />
                <Line 
                  type="monotone" 
                  dataKey="consumption" 
                  stroke="#ef4444" 
                  strokeWidth={2}
                  name="consumption"
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Gráfico de Economia Mensal */}
        <Card>
          <CardHeader>
            <CardTitle>Economia Financeira (R$)</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={filteredData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip 
                  formatter={(value: number) => [
                    `R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
                    'Economia'
                  ]}
                />
                <Bar dataKey="savings" fill="#22c55e" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Análise de ROI */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Análise de Retorno Financeiro</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">
                  R$ {filteredData.reduce((sum, data) => sum + data.savings, 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </div>
                <p className="text-sm text-muted-foreground">Economia Acumulada</p>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">
                  {filteredData.length > 0 ? (filteredData.reduce((sum, data) => sum + data.savings, 0) / filteredData.length).toFixed(0) : 0}
                </div>
                <p className="text-sm text-muted-foreground">Economia Média Mensal (R$)</p>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-600">
                  {filteredData.reduce((sum, data) => sum + data.generation, 0).toLocaleString('pt-BR')}
                </div>
                <p className="text-sm text-muted-foreground">Total Gerado (kWh)</p>
              </div>
            </div>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={filteredData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip 
                  formatter={(value: number) => [
                    `R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
                    'Economia Acumulada'
                  ]}
                />
                <Line 
                  type="monotone" 
                  dataKey="savings" 
                  stroke="#8b5cf6" 
                  strokeWidth={3}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
