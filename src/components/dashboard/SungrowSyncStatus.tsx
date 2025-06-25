
import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { RefreshCw, CheckCircle, AlertCircle, Clock, Activity } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import type { Plant } from '@/types';

interface SungrowSyncStatusProps {
  plant: Plant;
  onUpdate?: () => void;
}

export const SungrowSyncStatus = ({ plant, onUpdate }: SungrowSyncStatusProps) => {
  const { toast } = useToast();
  const [syncing, setSyncing] = useState(false);

  const handleManualSync = async () => {
    setSyncing(true);
    try {
      console.log('Starting manual sync for plant:', plant.id);

      const { data, error } = await supabase.functions.invoke('sungrow-connector', {
        body: {
          action: 'sync_data',
          plantId: plant.id
        }
      });

      if (error) {
        console.error('Sync error:', error);
        throw new Error(`Erro na sincronização: ${error.message}`);
      }

      if (data.success) {
        toast({
          title: "Sincronização concluída!",
          description: data.message || "Dados sincronizados com sucesso.",
        });
        onUpdate?.();
      } else {
        throw new Error(data.error || 'Erro desconhecido na sincronização');
      }
    } catch (error: any) {
      console.error('Manual sync failed:', error);
      toast({
        title: "Erro na sincronização",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setSyncing(false);
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

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className="flex items-center gap-2">
              <RefreshCw className="w-5 h-5" />
              Status de Sincronização Sungrow
            </CardTitle>
            <CardDescription>
              Monitoramento da sincronização automática de dados
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
            <div className="font-medium">
              <Badge variant="outline">Sungrow OpenAPI</Badge>
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
        </div>

        {plant.last_sync && (
          <div className="text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4" />
              Próxima sincronização automática: {plant.sync_enabled ? 'em 15 minutos' : 'Desabilitada'}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
