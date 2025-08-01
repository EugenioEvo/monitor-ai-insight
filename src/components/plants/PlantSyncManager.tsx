import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { RefreshCw, Play, AlertTriangle, CheckCircle, Clock } from 'lucide-react';
import type { Plant } from '@/types';

interface PlantSyncManagerProps {
  plants: Plant[];
  onRefresh?: () => void;
}

export const PlantSyncManager = ({ plants, onRefresh }: PlantSyncManagerProps) => {
  const [isRunningSync, setIsRunningSync] = useState(false);
  const [lastSyncResults, setLastSyncResults] = useState<any>(null);
  const { toast } = useToast();

  const handleManualSync = async () => {
    setIsRunningSync(true);
    try {
      console.log('🔄 Iniciando sincronização manual...');
      
      const { data, error } = await supabase.functions.invoke('scheduler', {
        body: {}
      });

      if (error) {
        console.error('Erro na sincronização:', error);
        toast({
          title: "Erro na Sincronização",
          description: `Falha ao executar sincronização: ${error.message}`,
          variant: "destructive",
        });
        return;
      }

      console.log('Resultado da sincronização:', data);
      setLastSyncResults(data);
      
      toast({
        title: "Sincronização Concluída",
        description: `${data.successfulSyncs}/${data.totalPlants} plantas sincronizadas com sucesso`,
        variant: data.failedSyncs === 0 ? "default" : "destructive",
      });

      onRefresh?.();
    } catch (error: any) {
      console.error('Exceção durante sincronização:', error);
      toast({
        title: "Erro na Sincronização",
        description: `Exceção: ${error.message}`,
        variant: "destructive",
      });
    } finally {
      setIsRunningSync(false);
    }
  };

  const enabledPlants = plants.filter(p => p.sync_enabled);
  const sungrowPlants = enabledPlants.filter(p => p.monitoring_system === 'sungrow');
  const solaredgePlants = enabledPlants.filter(p => p.monitoring_system === 'solaredge');

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <RefreshCw className="h-5 w-5" />
            Gerenciador de Sincronização
          </CardTitle>
          <CardDescription>
            Controle e monitore a sincronização automática de dados das plantas
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-primary">{enabledPlants.length}</div>
              <div className="text-sm text-muted-foreground">Plantas Habilitadas</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{sungrowPlants.length}</div>
              <div className="text-sm text-muted-foreground">Sungrow</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{solaredgePlants.length}</div>
              <div className="text-sm text-muted-foreground">SolarEdge</div>
            </div>
          </div>

          <div className="flex gap-2">
            <Button 
              onClick={handleManualSync} 
              disabled={isRunningSync || enabledPlants.length === 0}
              className="flex items-center gap-2"
            >
              {isRunningSync ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  Sincronizando...
                </>
              ) : (
                <>
                  <Play className="h-4 w-4" />
                  Executar Sincronização Manual
                </>
              )}
            </Button>
          </div>

          {enabledPlants.length === 0 && (
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                Nenhuma planta habilitada para sincronização. Habilite plantas no gerenciamento de plantas.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {lastSyncResults && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Último Resultado de Sincronização
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Badge variant={lastSyncResults.failedSyncs === 0 ? "default" : "destructive"}>
                  {lastSyncResults.successfulSyncs}/{lastSyncResults.totalPlants} Sucessos
                </Badge>
                {lastSyncResults.failedSyncs > 0 && (
                  <Badge variant="destructive">
                    {lastSyncResults.failedSyncs} Falhas
                  </Badge>
                )}
              </div>

              <div className="space-y-2">
                {lastSyncResults.results?.map((result: any) => (
                  <div key={result.plantId} className="flex items-center justify-between p-2 border rounded">
                    <div className="flex items-center gap-2">
                      {result.success ? (
                        <CheckCircle className="h-4 w-4 text-green-500" />
                      ) : (
                        <AlertTriangle className="h-4 w-4 text-red-500" />
                      )}
                      <span className="font-medium">{result.plantName}</span>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {result.success ? (
                        `${result.dataPointsSynced || 0} pontos sincronizados`
                      ) : (
                        result.error
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};