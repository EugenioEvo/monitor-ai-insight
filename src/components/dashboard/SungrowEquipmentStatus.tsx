import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useSungrowDevices, useSungrowRealtimeData } from '@/hooks/useSungrowData';
import { AlertCircle, CheckCircle, Monitor, Activity, Cpu, Thermometer } from 'lucide-react';
import type { Plant } from '@/types';

interface SungrowEquipmentStatusProps {
  plant: Plant;
}

export const SungrowEquipmentStatus = ({ plant }: SungrowEquipmentStatusProps) => {
  const { data: devices, isLoading: devicesLoading, error: devicesError } = useSungrowDevices(plant);
  const { data: realtimeData, isLoading: realtimeLoading, error: realtimeError } = useSungrowRealtimeData(plant);

  if (devicesError || realtimeError) {
    return (
      <Card className="border-red-200 bg-red-50">
        <CardHeader>
          <CardTitle className="text-red-700 flex items-center gap-2">
            <AlertCircle className="w-5 h-5" />
            Erro nos Dados dos Equipamentos
          </CardTitle>
          <CardDescription className="text-red-600">
            Não foi possível carregar os dados dos equipamentos Sungrow. Verifique as configurações de API.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const getDeviceStatusBadge = (status: number) => {
    switch (status) {
      case 1:
        return <Badge variant="default"><CheckCircle className="w-3 h-3 mr-1" />Online</Badge>;
      case 0:
        return <Badge variant="destructive"><AlertCircle className="w-3 h-3 mr-1" />Offline</Badge>;
      default:
        return <Badge variant="outline">Desconhecido</Badge>;
    }
  };

  const formatDeviceData = (dataList: any[]) => {
    const dataMap = new Map();
    dataList?.forEach(item => {
      dataMap.set(item.key, { value: item.value, unit: item.unit, description: item.description });
    });
    return dataMap;
  };

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Status dos Equipamentos Sungrow</h2>

      <Tabs defaultValue="devices" className="space-y-4">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="devices">
            <Monitor className="w-4 h-4 mr-2" />
            Lista de Dispositivos
          </TabsTrigger>
          <TabsTrigger value="realtime">
            <Activity className="w-4 h-4 mr-2" />
            Dados em Tempo Real
          </TabsTrigger>
        </TabsList>

        <TabsContent value="devices">
          {devicesLoading ? (
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-center h-32">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
                </div>
              </CardContent>
            </Card>
          ) : devices?.list?.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {devices.list.map((device: any) => (
                <Card key={device.device_id}>
                  <CardHeader className="pb-3">
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle className="text-lg">{device.device_name}</CardTitle>
                        <CardDescription>{device.device_type_text}</CardDescription>
                      </div>
                      {getDeviceStatusBadge(device.device_status)}
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <div className="text-muted-foreground">Código</div>
                        <div className="font-medium">{device.device_code}</div>
                      </div>
                      <div>
                        <div className="text-muted-foreground">Potência Nominal</div>
                        <div className="font-medium">{device.nominal_power} kW</div>
                      </div>
                      <div>
                        <div className="text-muted-foreground">Instalação</div>
                        <div className="font-medium">
                          {new Date(device.install_date).toLocaleDateString('pt-BR')}
                        </div>
                      </div>
                      <div>
                        <div className="text-muted-foreground">Última Atualização</div>
                        <div className="font-medium">
                          {new Date(device.last_update_time).toLocaleString('pt-BR')}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="pt-6">
                <div className="text-center text-muted-foreground">
                  Nenhum dispositivo encontrado
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="realtime">
          {realtimeLoading ? (
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-center h-32">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
                </div>
              </CardContent>
            </Card>
          ) : realtimeData?.list?.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {realtimeData.list.map((deviceData: any) => {
                const dataMap = formatDeviceData(deviceData.data_list);
                
                return (
                  <Card key={deviceData.device_id}>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Cpu className="w-5 h-5" />
                        {deviceData.device_name}
                      </CardTitle>
                      <CardDescription>Dados em tempo real do dispositivo</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {deviceData.data_list?.slice(0, 8).map((dataPoint: any, index: number) => (
                        <div key={index} className="flex justify-between items-center">
                          <div className="text-sm text-muted-foreground">
                            {dataPoint.description || dataPoint.key}
                          </div>
                          <div className="font-medium">
                            {dataPoint.value} {dataPoint.unit}
                          </div>
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          ) : (
            <Card>
              <CardContent className="pt-6">
                <div className="text-center text-muted-foreground">
                  Nenhum dado em tempo real disponível
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};