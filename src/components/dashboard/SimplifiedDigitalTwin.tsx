import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Activity, Zap, Monitor, Wifi, AlertTriangle } from 'lucide-react';

interface Equipment {
  id: string;
  name: string;
  type: string;
  status: string;
  alerts?: any[];
}

interface SimplifiedDigitalTwinProps {
  equipmentData: Equipment[];
  plant: { name: string };
}

export const SimplifiedDigitalTwin = ({ equipmentData, plant }: SimplifiedDigitalTwinProps) => {
  const getTotalPower = () => equipmentData.filter(eq => eq.type === 'Inversor').length * 5.2; // Mock
  const getOnlineCount = () => equipmentData.filter(eq => eq.status === 'online').length;
  const getWarningCount = () => equipmentData.filter(eq => eq.status === 'warning').length;

  const getEquipmentIcon = (type: string) => {
    switch (type) {
      case 'Inversor':
        return <Zap className="w-8 h-8 text-primary" />;
      case 'Otimizador':
        return <Activity className="w-6 h-6 text-blue-500" />;
      case 'Gateway':
        return <Monitor className="w-8 h-8 text-purple-500" />;
      default:
        return <Activity className="w-6 h-6" />;
    }
  };

  const getStatusColor = (status: string) => {
    return status === 'online' ? 'text-green-500' : 'text-red-500';
  };

  return (
    <div className="space-y-6">
      {/* Header com informações gerais */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="w-5 h-5" />
            Digital Twin - SolarEdge (Fallback 2D)
          </CardTitle>
          <CardDescription>
            Visualização 2D dos equipamentos da planta {plant.name}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-primary">{getTotalPower().toFixed(1)} kW</div>
              <div className="text-sm text-muted-foreground">Potência Total</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{getOnlineCount()}</div>
              <div className="text-sm text-muted-foreground">Online</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-yellow-600">{getWarningCount()}</div>
              <div className="text-sm text-muted-foreground">Alertas</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{equipmentData.length}</div>
              <div className="text-sm text-muted-foreground">Total</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Visualização 2D simplificada */}
      <Card>
        <CardHeader>
          <CardTitle>Diagrama dos Equipamentos</CardTitle>
          <CardDescription>
            Representação simplificada da topologia do sistema SolarEdge
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="relative bg-gradient-to-b from-blue-50 to-slate-50 rounded-lg p-8 min-h-[400px]">
            {/* Grid de equipamentos */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 h-full">
              
              {/* Coluna 1: Inversores */}
              <div className="space-y-4">
                <h4 className="text-sm font-semibold text-center">Inversores</h4>
                {equipmentData.filter(eq => eq.type === 'Inversor').map((equipment, index) => (
                  <div key={equipment.id} className="relative">
                    <div className={`bg-white rounded-lg p-4 shadow-md border-2 ${
                      equipment.status === 'online' ? 'border-green-500' : 'border-red-500'
                    }`}>
                      <div className="flex items-center justify-center mb-2">
                        {getEquipmentIcon(equipment.type)}
                      </div>
                      <div className="text-xs text-center font-medium">{equipment.name}</div>
                      <div className={`text-xs text-center ${getStatusColor(equipment.status)}`}>
                        {equipment.status === 'online' ? 'Online' : 'Alerta'}
                      </div>
                      {equipment.alerts && equipment.alerts.length > 0 && (
                        <div className="flex justify-center mt-1">
                          <AlertTriangle className="w-3 h-3 text-red-500" />
                        </div>
                      )}
                    </div>
                    
                    {/* Linha conectando ao centro */}
                    <div className="absolute top-1/2 right-0 w-8 h-px bg-gray-300 transform -translate-y-1/2"></div>
                  </div>
                ))}
              </div>

              {/* Coluna 2: Gateway Central */}
              <div className="flex items-center justify-center">
                {equipmentData.filter(eq => eq.type === 'Gateway').map((equipment) => (
                  <div key={equipment.id} className="relative">
                    <div className={`bg-white rounded-lg p-6 shadow-lg border-2 ${
                      equipment.status === 'online' ? 'border-purple-500' : 'border-red-500'
                    }`}>
                      <div className="flex items-center justify-center mb-3">
                        {getEquipmentIcon(equipment.type)}
                      </div>
                      <div className="text-sm text-center font-medium">{equipment.name}</div>
                      <div className={`text-xs text-center ${getStatusColor(equipment.status)}`}>
                        {equipment.status === 'online' ? 'Online' : 'Alerta'}
                      </div>
                      <div className="flex items-center justify-center mt-2">
                        <Wifi className={`w-4 h-4 ${getStatusColor(equipment.status)}`} />
                      </div>
                      {equipment.alerts && equipment.alerts.length > 0 && (
                        <div className="flex justify-center mt-1">
                          <Badge variant="destructive" className="text-xs">
                            {equipment.alerts.length} alertas
                          </Badge>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Coluna 3: Otimizadores */}
              <div className="space-y-3">
                <h4 className="text-sm font-semibold text-center">Otimizadores</h4>
                <div className="grid grid-cols-2 gap-2">
                  {equipmentData.filter(eq => eq.type === 'Otimizador').slice(0, 8).map((equipment) => (
                    <div key={equipment.id} className="relative">
                      <div className={`bg-white rounded p-2 shadow-sm border ${
                        equipment.status === 'online' ? 'border-blue-500' : 'border-red-500'
                      }`}>
                        <div className="flex items-center justify-center mb-1">
                          {getEquipmentIcon(equipment.type)}
                        </div>
                        <div className="text-xs text-center">{equipment.name}</div>
                        <div className={`text-xs text-center ${getStatusColor(equipment.status)}`}>
                          {equipment.status === 'online' ? '●' : '●'}
                        </div>
                        {equipment.alerts && equipment.alerts.length > 0 && (
                          <div className="flex justify-center">
                            <AlertTriangle className="w-2 h-2 text-red-500" />
                          </div>
                        )}
                      </div>
                      
                      {/* Linha conectando ao centro */}
                      <div className="absolute top-1/2 left-0 w-4 h-px bg-gray-300 transform -translate-y-1/2 -translate-x-full"></div>
                    </div>
                  ))}
                </div>
                
                {equipmentData.filter(eq => eq.type === 'Otimizador').length > 8 && (
                  <div className="text-xs text-center text-muted-foreground">
                    +{equipmentData.filter(eq => eq.type === 'Otimizador').length - 8} outros otimizadores
                  </div>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Info sobre o Digital Twin */}
      <Card className="border-yellow-200 bg-yellow-50">
        <CardHeader>
          <CardTitle className="text-yellow-700">Modo de Compatibilidade</CardTitle>
          <CardDescription className="text-yellow-600">
            Visualização 2D ativada. A visualização 3D não está disponível neste dispositivo.
            Os dados dos equipamentos são atualizados em tempo real.
          </CardDescription>
        </CardHeader>
      </Card>
    </div>
  );
};