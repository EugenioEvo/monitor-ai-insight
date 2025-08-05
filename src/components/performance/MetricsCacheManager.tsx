import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Database, HardDrive, Clock, Trash2, RefreshCw, Settings } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useMetricsCache, useAdvancedAnalytics } from '@/hooks/useAdvancedAnalytics';

interface CacheEntry {
  id: string;
  cache_key: string;
  cache_data: any;
  created_at: string;
  expires_at: string;
}

interface CacheStats {
  totalEntries: number;
  activeEntries: number;
  expiredEntries: number;
  hitRate: number;
  totalSizeKB: number;
}

export const MetricsCacheManager: React.FC = () => {
  const [cacheEntries, setCacheEntries] = useState<CacheEntry[]>([]);
  const [stats, setStats] = useState<CacheStats>({
    totalEntries: 0,
    activeEntries: 0,
    expiredEntries: 0,
    hitRate: 0,
    totalSizeKB: 0
  });
  const [isOptimizing, setIsOptimizing] = useState(false);
  const { toast } = useToast();
  const { optimizeCache } = useAdvancedAnalytics();
  const { data: metricsCache, refetch: refetchCache } = useMetricsCache();

  useEffect(() => {
    fetchCacheStats();
  }, []);

  // Buscar estatísticas do cache
  const fetchCacheStats = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('cache-optimizer', {
        body: { action: 'get_cache_stats' }
      });

      if (error) throw error;
      
      const cacheData = data?.cache_entries || [];
      setCacheEntries(cacheData);
      
      // Usar estatísticas do servidor se disponíveis
      if (data?.stats) {
        setStats(data.stats);
      } else {
        // Calcular estatísticas localmente
        const now = new Date();
        const expired = cacheData.filter(entry => new Date(entry.expires_at) < now).length;
        const active = cacheData.length - expired;
        const hitRate = cacheData.length ? ((active / cacheData.length) * 100) : 0;
        const totalSize = cacheData.reduce((acc, entry) => acc + JSON.stringify(entry.cache_data).length, 0);

        setStats({
          totalEntries: cacheData.length,
          activeEntries: active,
          expiredEntries: expired,
          hitRate: Math.round(hitRate),
          totalSizeKB: Math.round(totalSize / 1024)
        });
      }
    } catch (error) {
      console.error('Erro ao buscar estatísticas do cache:', error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as estatísticas do cache.",
        variant: "destructive",
      });
    }
  };

  // Otimizar cache
  const runOptimization = async () => {
    setIsOptimizing(true);
    try {
      await optimizeCache();
      await fetchCacheStats();
      refetchCache();
    } finally {
      setIsOptimizing(false);
    }
  };

  // Limpar cache expirado
  const clearExpiredCache = async () => {
    try {
      const { error } = await supabase.functions.invoke('cache-optimizer', {
        body: { action: 'cleanup_expired' }
      });

      if (error) throw error;
      
      toast({
        title: "Sucesso",
        description: "Cache expirado removido com sucesso.",
      });
      
      fetchCacheStats();
    } catch (error) {
      console.error('Erro ao limpar cache:', error);
      toast({
        title: "Erro",
        description: "Não foi possível limpar o cache expirado.",
        variant: "destructive",
      });
    }
  };

  // Verificar se entrada está expirada
  const isExpired = (expiresAt: string) => {
    return new Date(expiresAt) < new Date();
  };

  // Formatar tamanho do cache
  const formatCacheSize = (data: any) => {
    const sizeBytes = JSON.stringify(data).length;
    if (sizeBytes < 1024) return `${sizeBytes}B`;
    if (sizeBytes < 1024 * 1024) return `${Math.round(sizeBytes / 1024)}KB`;
    return `${Math.round(sizeBytes / (1024 * 1024))}MB`;
  };

  // Calcular tempo restante até expiração
  const getTimeUntilExpiry = (expiresAt: string) => {
    const now = new Date();
    const expiry = new Date(expiresAt);
    const diffMs = expiry.getTime() - now.getTime();
    
    if (diffMs <= 0) return 'Expirado';
    
    const diffMinutes = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMinutes / 60);
    const diffDays = Math.floor(diffHours / 24);
    
    if (diffDays > 0) return `${diffDays}d`;
    if (diffHours > 0) return `${diffHours}h`;
    return `${diffMinutes}m`;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Gerenciador de Cache</h2>
          <p className="text-muted-foreground">
            Monitoramento e otimização do cache de métricas
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={fetchCacheStats}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Atualizar
          </Button>
          <Button variant="outline" onClick={clearExpiredCache}>
            <Trash2 className="h-4 w-4 mr-2" />
            Limpar Expirados
          </Button>
          <Button onClick={runOptimization} disabled={isOptimizing}>
            {isOptimizing ? (
              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Settings className="h-4 w-4 mr-2" />
            )}
            {isOptimizing ? 'Otimizando...' : 'Otimizar Cache'}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Entradas</CardTitle>
            <Database className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalEntries}</div>
            <p className="text-xs text-muted-foreground">
              Entradas no cache
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Entradas Ativas</CardTitle>
            <Clock className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.activeEntries}</div>
            <p className="text-xs text-muted-foreground">
              Não expiradas
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Entradas Expiradas</CardTitle>
            <Clock className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{stats.expiredEntries}</div>
            <p className="text-xs text-muted-foreground">
              Para limpeza
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Taxa de Acerto</CardTitle>
            <Database className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.hitRate}%</div>
            <Progress value={stats.hitRate} className="h-2 mt-2" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tamanho Total</CardTitle>
            <HardDrive className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalSizeKB}KB</div>
            <p className="text-xs text-muted-foreground">
              Memória utilizada
            </p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Visão Geral</TabsTrigger>
          <TabsTrigger value="active">Ativas ({stats.activeEntries})</TabsTrigger>
          <TabsTrigger value="expired">Expiradas ({stats.expiredEntries})</TabsTrigger>
          <TabsTrigger value="all">Todas ({stats.totalEntries})</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Distribuição do Cache</CardTitle>
                <CardDescription>
                  Análise das entradas ativas vs expiradas
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Entradas Ativas</span>
                    <span className="text-sm font-medium">{stats.activeEntries}</span>
                  </div>
                  <Progress 
                    value={stats.totalEntries > 0 ? (stats.activeEntries / stats.totalEntries) * 100 : 0} 
                    className="h-2"
                  />
                  
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Entradas Expiradas</span>
                    <span className="text-sm font-medium">{stats.expiredEntries}</span>
                  </div>
                  <Progress 
                    value={stats.totalEntries > 0 ? (stats.expiredEntries / stats.totalEntries) * 100 : 0} 
                    className="h-2"
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Performance do Cache</CardTitle>
                <CardDescription>
                  Métricas de eficiência do sistema de cache
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Taxa de Acerto</span>
                    <Badge variant={stats.hitRate > 80 ? "default" : stats.hitRate > 50 ? "secondary" : "destructive"}>
                      {stats.hitRate}%
                    </Badge>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Uso de Memória</span>
                    <Badge variant={stats.totalSizeKB < 1000 ? "default" : "secondary"}>
                      {stats.totalSizeKB}KB
                    </Badge>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Total de Entradas</span>
                    <Badge variant="outline">
                      {stats.totalEntries}
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="active" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Entradas Ativas do Cache</CardTitle>
              <CardDescription>
                Entradas válidas que podem ser utilizadas
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {cacheEntries
                  .filter(entry => !isExpired(entry.expires_at))
                  .map((entry) => (
                    <div key={entry.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-1">
                          <Badge variant="default">Ativa</Badge>
                          <span className="text-sm font-medium">{entry.cache_key}</span>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Criada: {new Date(entry.created_at).toLocaleString('pt-BR')} • 
                          Expira em: {getTimeUntilExpiry(entry.expires_at)} • 
                          Tamanho: {formatCacheSize(entry.cache_data)}
                        </p>
                      </div>
                      <Clock className="h-4 w-4 text-green-500" />
                    </div>
                  ))}
                {cacheEntries.filter(entry => !isExpired(entry.expires_at)).length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    Nenhuma entrada ativa no cache.
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="expired" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Entradas Expiradas do Cache</CardTitle>
              <CardDescription>
                Entradas que precisam ser removidas para otimizar o cache
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {cacheEntries
                  .filter(entry => isExpired(entry.expires_at))
                  .map((entry) => (
                    <div key={entry.id} className="flex items-center justify-between p-4 border rounded-lg opacity-75">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-1">
                          <Badge variant="destructive">Expirada</Badge>
                          <span className="text-sm font-medium">{entry.cache_key}</span>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Criada: {new Date(entry.created_at).toLocaleString('pt-BR')} • 
                          Expirou: {new Date(entry.expires_at).toLocaleString('pt-BR')} • 
                          Tamanho: {formatCacheSize(entry.cache_data)}
                        </p>
                      </div>
                      <Clock className="h-4 w-4 text-red-500" />
                    </div>
                  ))}
                {cacheEntries.filter(entry => isExpired(entry.expires_at)).length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    Nenhuma entrada expirada no cache.
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="all" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Todas as Entradas do Cache</CardTitle>
              <CardDescription>
                Visão completa de todas as entradas do sistema de cache
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {cacheEntries.map((entry) => (
                  <div key={entry.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-1">
                        <Badge variant={isExpired(entry.expires_at) ? "destructive" : "default"}>
                          {isExpired(entry.expires_at) ? 'Expirada' : 'Ativa'}
                        </Badge>
                        <span className="text-sm font-medium">{entry.cache_key}</span>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Criada: {new Date(entry.created_at).toLocaleString('pt-BR')} • 
                        Expira: {new Date(entry.expires_at).toLocaleString('pt-BR')} • 
                        Tamanho: {formatCacheSize(entry.cache_data)}
                      </p>
                    </div>
                    <Clock className={`h-4 w-4 ${isExpired(entry.expires_at) ? 'text-red-500' : 'text-green-500'}`} />
                  </div>
                ))}
                {cacheEntries.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    Nenhuma entrada encontrada no cache.
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};