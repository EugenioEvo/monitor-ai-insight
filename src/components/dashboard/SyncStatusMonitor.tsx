import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { RefreshCw, AlertCircle, CheckCircle, Clock, Activity, Settings, Database } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { syncService } from '@/services/syncService';
import type { Plant } from '@/types';

interface SyncStatusMonitorProps {
  plant: Plant;
  onUpdate?: () => void;
}

export const SyncStatusMonitor = ({ plant, onUpdate }: SyncStatusMonitorProps) => {
  const { toast } = useToast();
  const [syncing, setSyncing] = useState(false);
  const [toggling, setToggling] = useState(false);

  // Buscar logs de sincronização
  const { data: syncLogs, refetch: refetchLogs } = useQuery({
    queryKey: ['sync-logs', plant.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('sync_logs')
        .select('*')
        .eq('plant_id', plant.id)
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) {
        console.error('Erro ao buscar logs de sincronização:', error);
        return [];
      }
      return data || [];
    },
    refetchInterval: 30000, // Atualizar a cada 30 segundos
  });

  const handleManualSync = async () => {
    setSyncing(true);
    try {
      console.log('Iniciando sincronização manual para planta:', plant.id);

      const result = await syncService.performSync(plant);
      
      // Log do resultado
      await syncService.logSyncResult(plant, result);

      if (result.success) {
        toast({
          title: "Sincronização concluída!",
          description: result.message || "Dados sincronizados com sucesso.",
        });
        
        // Atualizar timestamp da última sincronização
        await syncService.updateLastSyncTimestamp(plant);
        
        // Recarregar logs
        refetchLogs();
        onUpdate?.();
      } else {
        throw new Error(result.error || 'Erro desconhecido na sincronização');
      }
    } catch (error: any) {
      console.error('Falha na sincronização manual:', error);
      
      toast({
        title: "Erro na sincronização",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setSyncing(false);
    }
  };

  const toggleAutoSync = async () => {
    setToggling(true);
    try {
      const { error } = await supabase
        .from('plants')
        .update({ sync_enabled: !plant.sync_enabled })
        .eq('id', plant.id);

      if (error) {
        throw new Error(`Erro ao alterar configuração: ${error.message}`);
      }

      toast({
        title: plant.sync_enabled ? "Sincronização automática desabilitada" : "Sincronização automática habilitada",
        description: plant.sync_enabled 
          ? "A sincronização automática foi desabilitada para esta planta."
          : "A sincronização automática foi habilitada. Dados serão sincronizados a cada 15 minutos.",
      });
      onUpdate?.();
    } catch (error: any) {
      toast({
        title: "Erro na configuração",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setToggling(false);
    }
  };

  const getSyncStatusBadge = () => {
    const lastSync = plant.last_sync;
    
    if (!lastSync) {
      return <Badge variant="secondary"><Clock className="w-3 h-3 mr-1" />Nunca sincronizado</Badge>;
    }

    const lastSyncDate = new Date(lastSync);
    const hoursSinceSync = (Date.now() - lastSyncDate.getTime()) / (1000 * 60 * 60);
    
    if (hoursSinceSync < 1) {
      return <Badge variant="default"><CheckCircle className="w-3 h-3 mr-1" />Recente</Badge>;
    } else if (hoursSinceSync < 6) {
      return <Badge variant="outline"><Activity className="w-3 h-3 mr-1" />Normal</Badge>;
    } else {
      return <Badge variant="destructive"><AlertCircle className="w-3 h-3 mr-1" />Atrasado</Badge>;
    }
  };

  const getLogStatusBadge = (status: string) => {
    if (status === 'success') {
      return <Badge variant="default" className="text-xs">Sucesso</Badge>;
    } else if (status === 'error') {
      return <Badge variant="destructive" className="text-xs">Erro</Badge>;
    } else {
      return <Badge variant="secondary" className="text-xs">Pendente</Badge>;
    }
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex justify-between items-start">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Database className="w-5 h-5" />
                Monitor de Sincronização
              </CardTitle>
              <CardDescription>
                Monitoramento e controle da sincronização de dados
              </CardDescription>
            </div>
            {getSyncStatusBadge()}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <div className="text-sm text-muted-foreground">Sincronização Automática</div>
              <div className="font-medium">
                {plant.sync_enabled ? (
                  <span className="text-green-600 flex items-center gap-1">
                    <CheckCircle className="w-4 h-4" />
                    Habilitada
                  </span>
                ) : (
                  <span className="text-yellow-600 flex items-center gap-1">
                    <AlertCircle className="w-4 h-4" />
                    Desabilitada
                  </span>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <div className="text-sm text-muted-foreground">Última Sincronização</div>
              <div className="font-medium">
                {plant.last_sync ? 
                  new Date(plant.last_sync).toLocaleString('pt-BR') : 
                  'Nunca sincronizado'
                }
              </div>
            </div>

            <div className="space-y-2">
              <div className="text-sm text-muted-foreground">Sistema</div>
              <div className="flex flex-col gap-1">
                <Badge variant="outline">{plant.monitoring_system}</Badge>
                {plant.sync_enabled && (
                  <Badge variant="outline" className="text-green-600">
                    <Activity className="w-3 h-3 mr-1" />
                    Auto-Sync Ativo
                  </Badge>
                )}
              </div>
            </div>
          </div>

          <div className="flex gap-2 pt-4 border-t">
            <Button 
              onClick={handleManualSync} 
              disabled={syncing}
              size="sm"
            >
              {syncing && <RefreshCw className="w-4 h-4 mr-2 animate-spin" />}
              {syncing ? 'Sincronizando...' : 'Sincronizar Agora'}
            </Button>
            
            <Button 
              onClick={toggleAutoSync}
              disabled={toggling}
              variant="outline"
              size="sm"
            >
              {toggling && <RefreshCw className="w-4 h-4 mr-2 animate-spin" />}
              <Settings className="w-4 h-4 mr-2" />
              {plant.sync_enabled ? 'Desabilitar Auto-Sync' : 'Habilitar Auto-Sync'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Logs de Sincronização */}
      {syncLogs && syncLogs.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Histórico de Sincronização</CardTitle>
            <CardDescription>
              Últimas 10 tentativas de sincronização
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {syncLogs.map((log: any) => (
                <div key={log.id} className="flex items-center justify-between p-2 bg-gray-50 rounded text-sm">
                  <div className="flex items-center gap-2">
                    {getLogStatusBadge(log.status)}
                    <span className="font-medium">
                      {new Date(log.created_at).toLocaleString('pt-BR')}
                    </span>
                  </div>
                  <div className="text-right">
                    <div className="text-xs text-muted-foreground">
                      {log.data_points_synced} pontos
                    </div>
                    {log.sync_duration_ms && (
                      <div className="text-xs text-muted-foreground">
                        {log.sync_duration_ms}ms
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
