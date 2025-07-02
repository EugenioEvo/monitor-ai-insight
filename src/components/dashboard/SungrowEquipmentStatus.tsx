
import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, CheckCircle, Zap, Thermometer, Activity } from 'lucide-react';
import { useSungrowDevices, useSungrowRealtimeData } from '@/hooks/useSungrowData';
import type { Plant } from '@/types';
import type { SungrowRealtimeData } from '@/types/api';

interface SungrowEquipmentStatusProps {
  plant: Plant;
}

export const SungrowEquipmentStatus = ({ plant }: SungrowEquipmentStatusProps) => {
  const { data: devices, isLoading: devicesLoading } = useSungrowDevices(plant);
  const { data: realtimeData, isLoading: realtimeLoading } = useSungrowRealtimeData(plant);

  if (devicesLoading || realtimeLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {[1, 2, 3].map((i) => (
          <Card key={i} className="animate-pulse">
            <CardHeader>
              <div className="h-4 bg-gray-200 rounded w-1/2"></div>
            </CardHeader>
            <CardContent>
              <div className="h-6 bg-gray-200 rounded mb-2"></div>
              <div className="h-4 bg-gray-200 rounded w-1/3"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const getDeviceStatusIcon = (status: number | string) => {
    if (status === 1 || status === 'Online' || status === 'Normal') {
      return <CheckCircle className="w-4 h-4 text-green-500" />;
    }
    return <AlertTriangle className="w-4 h-4 text-red-500" />;
  };

  const getDeviceStatusBadge = (status: number | string) => {
    if (status === 1 || status === 'Online' || status === 'Normal') {
      return <Badge variant="default">Online</Badge>;
    }
    return <Badge variant="destructive">Offline</Badge>;
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="w-5 h-5" />
            Status dos Equipamentos Sungrow
          </CardTitle>
          <CardDescription>
            Monitoramento em tempo real dos dispositivos da planta
          </CardDescription>
        </CardHeader>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Dispositivos */}
        {devices && devices.length > 0 ? (
          devices.map((device: any, index: number) => (
            <Card key={device.device_sn || index}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg flex items-center gap-2">
                    {getDeviceStatusIcon(device.device_status)}
                    {device.device_name || `Dispositivo ${index + 1}`}
                  </CardTitle>
                  {getDeviceStatusBadge(device.device_status)}
                </div>
                <CardDescription>
                  SN: {device.device_sn || 'N/A'} | Tipo: {device.device_type_name || 'Inversor'}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="flex items-center text-sm text-muted-foreground mb-1">
                      <Zap className="w-3 h-3 mr-1" />
                      Potência
                    </div>
                    <div className="font-medium">
                      {device.power ? `${device.power} kW` : 'N/A'}
                    </div>
                  </div>
                  <div>
                    <div className="flex items-center text-sm text-muted-foreground mb-1">
                      <Activity className="w-3 h-3 mr-1" />
                      Energia Hoje
                    </div>
                    <div className="font-medium">
                      {device.today_energy ? `${device.today_energy} kWh` : 'N/A'}
                    </div>
                  </div>
                </div>
                
                {device.last_update_time && (
                  <div className="text-xs text-muted-foreground">
                    Última atualização: {new Date(device.last_update_time).toLocaleString('pt-BR')}
                  </div>
                )}
              </CardContent>
            </Card>
          ))
        ) : (
          <Card className="col-span-full">
            <CardContent className="pt-6">
              <div className="text-center text-muted-foreground">
                <Activity className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>Nenhum dispositivo encontrado</p>
                <p className="text-sm mt-2">Verifique a configuração da API Sungrow</p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Dados em tempo real */}
        {realtimeData && realtimeData.length > 0 && (
          <Card className="col-span-full">
            <CardHeader>
              <CardTitle>Dados em Tempo Real</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {realtimeData.slice(0, 4).map((data: SungrowRealtimeData, index: number) => (
                  <div key={index} className="text-center">
                     <div className="text-sm text-muted-foreground">
                       {data.deviceSn || `Inversor ${index + 1}`}
                     </div>
                     <div className="font-medium">
                       {data.parameters?.power?.value ? `${data.parameters.power.value} ${data.parameters.power.unit}` : 'N/A'}
                     </div>
                     <div className="text-xs text-muted-foreground">
                       {data.timestamp ? 
                         new Date(data.timestamp).toLocaleTimeString('pt-BR') : 
                         'N/A'
                       }
                     </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};
