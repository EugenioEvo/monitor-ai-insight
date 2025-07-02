
import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { RefreshCw, AlertCircle, CheckCircle, Clock } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/services/logger';
import type { Plant } from '@/types';

interface SungrowManualSyncProps {
  plant: Plant;
  onSyncComplete?: () => void;
}

export const SungrowManualSync = ({ plant, onSyncComplete }: SungrowManualSyncProps) => {
  const { toast } = useToast();
  const [syncing, setSyncing] = useState(false);
  const [lastSyncResult, setLastSyncResult] = useState<{
    success: boolean;
    message: string;
    timestamp: string;
  } | null>(null);

  const handleManualSync = async () => {
    setSyncing(true);
    try {
      logger.info('Iniciando sincronização manual', { 
        component: 'SungrowManualSync',
        plantId: plant.id,
        plantName: plant.name 
      });

      const { data, error } = await supabase.functions.invoke('sungrow-connector', {
        body: {
          action: 'sync_data',
          plantId: plant.id
        }
      });

      if (error) {
        console.error('Erro na function:', error);
        throw new Error(`Erro na sincronização: ${error.message}`);
      }

      logger.info('Resposta da sincronização recebida', { 
        component: 'SungrowManualSync',
        plantId: plant.id,
        success: data?.success,
        dataPointsSynced: data?.dataPointsSynced 
      });

      if (data.success) {
        const result = {
          success: true,
          message: data.message || 'Sincronização realizada com sucesso',
          timestamp: new Date().toISOString()
        };
        
        setLastSyncResult(result);
        
        toast({
          title: "Sincronização concluída!",
          description: result.message,
        });
        
        // Atualizar timestamp da última sincronização na planta
        await supabase
          .from('plants')
          .update({ last_sync: result.timestamp })
          .eq('id', plant.id);
        
        onSyncComplete?.();
      } else {
        throw new Error(data.error || 'Erro desconhecido na sincronização');
      }
    } catch (error: any) {
      console.error('Falha na sincronização manual:', error);
      
      const result = {
        success: false,
        message: error.message,
        timestamp: new Date().toISOString()
      };
      
      setLastSyncResult(result);
      
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
    if (!lastSyncResult) {
      return <Badge variant="secondary"><Clock className="w-3 h-3 mr-1" />Aguardando</Badge>;
    }
    
    if (lastSyncResult.success) {
      return <Badge variant="default"><CheckCircle className="w-3 h-3 mr-1" />Sucesso</Badge>;
    } else {
      return <Badge variant="destructive"><AlertCircle className="w-3 h-3 mr-1" />Erro</Badge>;
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className="flex items-center gap-2">
              <RefreshCw className="w-5 h-5" />
              Sincronização Manual
            </CardTitle>
            <CardDescription>
              Force a sincronização dos dados da planta Sungrow
            </CardDescription>
          </div>
          {getSyncStatusBadge()}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Informações da última sincronização */}
        {plant.last_sync && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-gray-50 rounded-lg">
            <div>
              <div className="text-sm font-medium text-gray-600">Última Sincronização</div>
              <div className="text-sm">
                {new Date(plant.last_sync).toLocaleString('pt-BR')}
              </div>
            </div>
            <div>
              <div className="text-sm font-medium text-gray-600">Sistema</div>
              <div className="text-sm">Sungrow OpenAPI</div>
            </div>
          </div>
        )}

        {/* Resultado da última tentativa */}
        {lastSyncResult && (
          <div className={`p-4 rounded-lg ${lastSyncResult.success ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
            <div className="flex items-center gap-2 mb-2">
              {lastSyncResult.success ? (
                <CheckCircle className="w-4 h-4 text-green-600" />
              ) : (
                <AlertCircle className="w-4 h-4 text-red-600" />
              )}
              <span className={`text-sm font-medium ${lastSyncResult.success ? 'text-green-800' : 'text-red-800'}`}>
                {lastSyncResult.success ? 'Sincronização Bem-sucedida' : 'Falha na Sincronização'}
              </span>
            </div>
            <div className={`text-sm ${lastSyncResult.success ? 'text-green-700' : 'text-red-700'}`}>
              {lastSyncResult.message}
            </div>
            <div className="text-xs text-gray-500 mt-1">
              {new Date(lastSyncResult.timestamp).toLocaleString('pt-BR')}
            </div>
          </div>
        )}

        {/* Botão de sincronização */}
        <div className="flex gap-2">
          <Button 
            onClick={handleManualSync} 
            disabled={syncing}
            className="flex-1"
          >
            {syncing && <RefreshCw className="w-4 h-4 mr-2 animate-spin" />}
            {syncing ? 'Sincronizando...' : 'Sincronizar Agora'}
          </Button>
        </div>

        {/* Informações adicionais */}
        <div className="text-xs text-gray-500 space-y-1">
          <div>• A sincronização pode levar alguns segundos</div>
          <div>• Dados de energia e potência serão atualizados</div>
          <div>• Verifique as credenciais se houver falhas persistentes</div>
        </div>
      </CardContent>
    </Card>
  );
};
