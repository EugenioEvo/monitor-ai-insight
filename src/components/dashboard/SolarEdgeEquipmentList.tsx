import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, AlertTriangle, Zap, Wifi, Activity, Monitor } from 'lucide-react';

interface Equipment {
  id: string;
  name: string;
  type: string;
  status: string;
  serialNumber: string;
  manufacturer?: string;
  model?: string;
  communicationMethod?: string;
  connectedOptimizers?: number;
  connection?: string;
  // Dados técnicos reais
  currentPower?: number;
  voltage?: number;
  current?: number;
  temperature?: number;
  frequency?: number;
  alerts?: any[];
  lastUpdate: Date;
}

interface SolarEdgeEquipmentListProps {
  equipmentList: Equipment[];
}

export const SolarEdgeEquipmentList = ({ equipmentList }: SolarEdgeEquipmentListProps) => {
  const getStatusIcon = (status: string) => {
    return status === 'online' ? 
      <CheckCircle className="w-4 h-4 text-green-500" /> : 
      <AlertTriangle className="w-4 h-4 text-red-500" />;
  };

  const getStatusBadge = (status: string) => {
    return status === 'online' ? 
      <Badge variant="default">Online</Badge> : 
      <Badge variant="destructive">Alerta</Badge>;
  };

  return (
    <div className="space-y-6">
      {/* Seção Inversores */}
      {equipmentList.filter(eq => eq.type === 'Inversor').length > 0 && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Zap className="w-5 h-5" />
            Inversores ({equipmentList.filter(eq => eq.type === 'Inversor').length})
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {equipmentList.filter(eq => eq.type === 'Inversor').map((equipment) => (
              <Card key={equipment.id}>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg flex items-center gap-2">
                      {getStatusIcon(equipment.status)}
                      {equipment.name}
                      {equipment.alerts && equipment.alerts.length > 0 && (
                        <Badge variant="destructive" className="ml-2">
                          {equipment.alerts.length} alertas
                        </Badge>
                      )}
                    </CardTitle>
                    {getStatusBadge(equipment.status)}
                  </div>
                  <CardDescription>
                    {equipment.manufacturer} {equipment.model} | SN: {equipment.serialNumber}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <div className="text-sm text-muted-foreground">Potência Atual</div>
                      <div className="font-medium">{(equipment.currentPower || 0).toFixed(1)} kW</div>
                    </div>
                    <div>
                      <div className="text-sm text-muted-foreground">Tensão</div>
                      <div className="font-medium">{(equipment.voltage || 0).toFixed(0)} V</div>
                    </div>
                    <div>
                      <div className="text-sm text-muted-foreground">Corrente</div>
                      <div className="font-medium">{(equipment.current || 0).toFixed(1)} A</div>
                    </div>
                    <div>
                      <div className="text-sm text-muted-foreground">Temperatura</div>
                      <div className="font-medium">{(equipment.temperature || 25).toFixed(0)}°C</div>
                    </div>
                  </div>

                  {equipment.alerts && equipment.alerts.length > 0 && (
                    <div className="space-y-2">
                      <div className="text-sm font-medium text-destructive">Alertas:</div>
                      {equipment.alerts.slice(0, 2).map((alert: any, idx: number) => (
                        <div key={idx} className="text-xs p-2 bg-destructive/10 rounded border-l-2 border-destructive">
                          {alert.message || alert.type}
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="text-xs text-muted-foreground">
                    Última atualização: {equipment.lastUpdate.toLocaleString('pt-BR')}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Seção Otimizadores */}
      {equipmentList.filter(eq => eq.type === 'Otimizador').length > 0 && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Activity className="w-5 h-5" />
            Otimizadores ({equipmentList.filter(eq => eq.type === 'Otimizador').length})
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {equipmentList.filter(eq => eq.type === 'Otimizador').map((equipment) => (
              <Card key={equipment.id}>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm flex items-center gap-1">
                      {getStatusIcon(equipment.status)}
                      {equipment.name}
                    </CardTitle>
                    {getStatusBadge(equipment.status)}
                  </div>
                  <CardDescription className="text-xs">
                    SN: {equipment.serialNumber}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <div className="text-muted-foreground">Tensão</div>
                      <div className="font-medium">{(equipment.voltage || 0).toFixed(0)}V</div>
                    </div>
                    <div>
                      <div className="text-muted-foreground">Corrente</div>
                      <div className="font-medium">{(equipment.current || 0).toFixed(1)}A</div>
                    </div>
                  </div>
                  {equipment.alerts && equipment.alerts.length > 0 && (
                    <Badge variant="destructive" className="text-xs">
                      {equipment.alerts.length} alertas
                    </Badge>
                  )}
                  <div className="text-xs text-muted-foreground">
                    {equipment.lastUpdate.toLocaleString('pt-BR')}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Seção Gateway */}
      {equipmentList.filter(eq => eq.type === 'Gateway').length > 0 && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Monitor className="w-5 h-5" />
            Gateway de Monitoramento
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {equipmentList.filter(eq => eq.type === 'Gateway').map((equipment) => (
              <Card key={equipment.id}>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg flex items-center gap-2">
                      {getStatusIcon(equipment.status)}
                      {equipment.name}
                    </CardTitle>
                    {getStatusBadge(equipment.status)}
                  </div>
                  <CardDescription>
                    SN: {equipment.serialNumber}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center text-sm text-muted-foreground mb-1">
                    <Wifi className="w-3 h-3 mr-1" />
                    Conexão: {equipment.connection}
                  </div>

                  {equipment.alerts && equipment.alerts.length > 0 && (
                    <div className="space-y-2">
                      <div className="text-sm font-medium text-destructive">Alertas:</div>
                      {equipment.alerts.slice(0, 2).map((alert: any, idx: number) => (
                        <div key={idx} className="text-xs p-2 bg-destructive/10 rounded border-l-2 border-destructive">
                          {alert.message || alert.type}
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="text-xs text-muted-foreground">
                    Última atualização: {equipment.lastUpdate.toLocaleString('pt-BR')}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {equipmentList.length === 0 && (
        <Card className="border-yellow-200 bg-yellow-50">
          <CardHeader>
            <CardTitle className="text-yellow-700">Nenhum Equipamento Encontrado</CardTitle>
            <CardDescription className="text-yellow-600">
              Não foram encontrados equipamentos na resposta da API SolarEdge. 
              Verifique se a planta possui equipamentos configurados.
            </CardDescription>
          </CardHeader>
        </Card>
      )}
    </div>
  );
};