
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { useCustomerConsumptionData } from "@/hooks/useCustomerDashboard";
import type { CustomerUnit, Invoice } from "@/types";

interface CustomerConsumptionTabProps {
  customerId: string;
  units: CustomerUnit[];
  invoices: Invoice[];
}

export const CustomerConsumptionTab = ({ 
  customerId, 
  units, 
  invoices 
}: CustomerConsumptionTabProps) => {
  const { data: consumptionData } = useCustomerConsumptionData(customerId);

  // Cores para o gráfico de pizza
  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];

  // Calcular consumo por UC para o gráfico de pizza
  const consumptionByUnit = units.map(unit => {
    const unitInvoices = invoices.filter(inv => inv.customer_unit_id === unit.id);
    const totalConsumption = unitInvoices.reduce((sum, inv) => sum + inv.energy_kWh, 0);
    return {
      name: unit.unit_name || unit.uc_code,
      value: totalConsumption,
      uc_code: unit.uc_code
    };
  }).filter(item => item.value > 0);

  const getInvoiceStatusColor = (status: string) => {
    switch (status) {
      case 'processed':
        return 'bg-green-500';
      case 'pending':
        return 'bg-yellow-500';
      case 'error':
        return 'bg-red-500';
      default:
        return 'bg-gray-500';
    }
  };

  const getInvoiceStatusText = (status: string) => {
    switch (status) {
      case 'processed':
        return 'Processada';
      case 'pending':
        return 'Pendente';
      case 'error':
        return 'Erro';
      default:
        return 'Desconhecido';
    }
  };

  return (
    <div className="space-y-6">
      {/* Lista de Unidades Consumidoras */}
      <Card>
        <CardHeader>
          <CardTitle>Unidades Consumidoras</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {units.map((unit) => {
              const unitInvoices = invoices.filter(inv => inv.customer_unit_id === unit.id);
              const totalConsumption = unitInvoices.reduce((sum, inv) => sum + inv.energy_kWh, 0);
              const totalCost = unitInvoices.reduce((sum, inv) => sum + inv.total_R$, 0);

              return (
                <Card key={unit.id} className="border border-gray-200">
                  <CardContent className="p-4">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <h4 className="font-semibold">{unit.unit_name || 'UC sem nome'}</h4>
                        <p className="text-sm text-muted-foreground">UC: {unit.uc_code}</p>
                      </div>
                      <Badge className={unit.is_active ? 'bg-green-500' : 'bg-gray-500'}>
                        {unit.is_active ? 'Ativa' : 'Inativa'}
                      </Badge>
                    </div>
                    <div className="space-y-1 text-sm">
                      <p>Consumo Total: {totalConsumption.toLocaleString('pt-BR')} kWh</p>
                      <p>Custo Total: R$ {totalCost.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                      <p>Faturas: {unitInvoices.length}</p>
                    </div>
                    {unit.address_city && (
                      <p className="text-xs text-muted-foreground mt-2">
                        {unit.address_city}, {unit.address_state}
                      </p>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Gráfico de Consumo Mensal */}
        {consumptionData && (
          <Card>
            <CardHeader>
              <CardTitle>Consumo e Custo Mensal</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={consumptionData.chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis yAxisId="left" />
                  <YAxis yAxisId="right" orientation="right" />
                  <Tooltip 
                    formatter={(value: number, name: string) => [
                      name === 'consumption' 
                        ? `${value.toLocaleString('pt-BR')} kWh`
                        : `R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
                      name === 'consumption' ? 'Consumo' : 'Custo'
                    ]}
                  />
                  <Legend 
                    formatter={(value: string) => value === 'consumption' ? 'Consumo (kWh)' : 'Custo (R$)'}
                  />
                  <Line 
                    yAxisId="left"
                    type="monotone" 
                    dataKey="consumption" 
                    stroke="#ef4444" 
                    strokeWidth={2}
                  />
                  <Line 
                    yAxisId="right"
                    type="monotone" 
                    dataKey="cost" 
                    stroke="#f59e0b" 
                    strokeWidth={2}
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {/* Gráfico de Pizza - Distribuição de Consumo */}
        {consumptionByUnit.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Distribuição de Consumo por UC</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={consumptionByUnit}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={(entry) => `${entry.name}: ${entry.value.toLocaleString('pt-BR')} kWh`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {consumptionByUnit.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    formatter={(value: number) => [`${value.toLocaleString('pt-BR')} kWh`, 'Consumo']}
                  />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Histórico de Faturas */}
      <Card>
        <CardHeader>
          <CardTitle>Histórico de Faturas</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {invoices.slice(0, 20).map((invoice) => {
              const unit = units.find(u => u.id === invoice.customer_unit_id);
              return (
                <div key={invoice.id} className="flex justify-between items-center p-3 border rounded-lg">
                  <div>
                    <p className="font-medium">UC: {invoice.uc_code}</p>
                    <p className="text-sm text-muted-foreground">
                      {unit?.unit_name && `${unit.unit_name} - `}
                      {invoice.reference_month}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-medium">{invoice.energy_kWh.toLocaleString('pt-BR')} kWh</p>
                    <p className="text-sm">R$ {invoice.total_R$.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                  </div>
                  <Badge className={getInvoiceStatusColor(invoice.status)}>
                    {getInvoiceStatusText(invoice.status)}
                  </Badge>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
