import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Progress } from '@/components/ui/progress';
import { RefreshCw, Database, Clock, Zap, TrendingUp, Activity } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface CacheEntry {
  id: string;
  cache_key: string;
  cache_data: any;
  created_at: string;
  expires_at: string;
}

interface CacheStats {
  total_entries: number;
  expired_entries: number;
  cache_size_kb: number;
  hit_rate: number;
}

export const MetricsCacheManager: React.FC = () => {
  const [cacheEntries, setCacheEntries] = useState<CacheEntry[]>([]);
  const [stats, setStats] = useState<CacheStats>({
    total_entries: 0,
    expired_entries: 0,
    cache_size_kb: 0,
    hit_rate: 0
  });
  const [loading, setLoading] = useState(false);
  const [optimizing, setOptimizing] = useState(false);
  const { toast } = useToast();

  const fetchCacheData = async () => {
    setLoading(true);
    try {
      // Buscar entradas de cache
      const { data: cacheData, error: cacheError } = await supabase
        .from('metrics_cache')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);

      if (cacheError) throw cacheError;
      setCacheEntries(cacheData || []);

      // Calcular estatísticas
      const now = new Date();
      const totalEntries = cacheData?.length || 0;
      const expiredEntries = cacheData?.filter(entry => 
        new Date(entry.expires_at) < now
      ).length || 0;

      // Estimar tamanho do cache
      const cacheSize = cacheData?.reduce((size, entry) => {
        return size + JSON.stringify(entry.cache_data).length;
      }, 0) || 0;

      setStats({
        total_entries: totalEntries,
        expired_entries: expiredEntries,
        cache_size_kb: Math.round(cacheSize / 1024),
        hit_rate: totalEntries > 0 ? ((totalEntries - expiredEntries) / totalEntries) * 100 : 0
      });

    } catch (error) {
      console.error('Error fetching cache data:', error);
      toast({
        title: "Erro ao carregar cache",
        description: "Não foi possível carregar os dados de cache.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const runCacheOptimization = async () => {
    setOptimizing(true);
    try {
      const { data, error } = await supabase.functions.invoke('cache-optimizer', {
        body: { action: 'optimize_cache' }
      });

      if (error) throw error;

      toast({
        title: "Cache otimizado",
        description: `${data.cache_entries_created} entradas criadas/atualizadas.`,
      });

      // Recarregar dados
      await fetchCacheData();
    } catch (error) {
      console.error('Error optimizing cache:', error);
      toast({
        title: "Erro na otimização",
        description: "Não foi possível otimizar o cache.",
        variant: "destructive",
      });
    } finally {
      setOptimizing(false);
    }
  };

  const clearExpiredCache = async () => {
    try {
      const now = new Date();
      const { error } = await supabase
        .from('metrics_cache')
        .delete()
        .lt('expires_at', now.toISOString());

      if (error) throw error;

      toast({
        title: "Cache limpo",
        description: "Entradas expiradas foram removidas com sucesso.",
      });

      await fetchCacheData();
    } catch (error) {
      console.error('Error clearing expired cache:', error);
      toast({
        title: "Erro na limpeza",
        description: "Não foi possível limpar o cache expirado.",
        variant: "destructive",
      });
    }
  };

  const testCacheEntry = async (cacheKey: string) => {
    try {
      const { data, error } = await supabase.functions.invoke('cache-optimizer', {
        body: { 
          action: 'get_cached_metrics',
          cache_key: cacheKey
        }
      });

      if (error) throw error;

      toast({
        title: "Teste de cache",
        description: data.cached ? "Cache válido encontrado!" : "Cache não encontrado ou expirado.",
        variant: data.cached ? "default" : "destructive",
      });
    } catch (error) {
      console.error('Error testing cache entry:', error);
      toast({
        title: "Erro no teste",
        description: "Não foi possível testar a entrada de cache.",
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    fetchCacheData();
    const interval = setInterval(fetchCacheData, 30000); // Atualizar a cada 30s
    return () => clearInterval(interval);
  }, []);

  const formatCacheKey = (key: string) => {
    return key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  const isExpired = (expiresAt: string) => {
    return new Date(expiresAt) < new Date();
  };

  const getTimeToExpiry = (expiresAt: string) => {
    const now = new Date();
    const expiry = new Date(expiresAt);
    const diffMs = expiry.getTime() - now.getTime();
    
    if (diffMs < 0) return 'Expirado';
    
    const diffMins = Math.floor(diffMs / (1000 * 60));
    if (diffMins < 60) return `${diffMins}min`;
    
    const diffHours = Math.floor(diffMins / 60);
    return `${diffHours}h ${diffMins % 60}min`;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold">Gerenciador de Cache</h2>
          <p className="text-muted-foreground">
            Monitoramento e otimização do cache de métricas
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={clearExpiredCache}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Limpar Expirados
          </Button>
          <Button onClick={runCacheOptimization} disabled={optimizing}>
            <Zap className={`mr-2 h-4 w-4 ${optimizing ? 'animate-pulse' : ''}`} />
            Otimizar Cache
          </Button>
        </div>
      </div>

      {/* Cards de estatísticas */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Entradas</CardTitle>
            <Database className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total_entries}</div>
            <p className="text-xs text-muted-foreground">
              entradas no cache
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Entradas Expiradas</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">{stats.expired_entries}</div>
            <p className="text-xs text-muted-foreground">
              precisam ser limpas
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tamanho do Cache</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.cache_size_kb} KB</div>
            <p className="text-xs text-muted-foreground">
              uso de memória
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Taxa de Acerto</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {Math.round(stats.hit_rate)}%
            </div>
            <Progress value={stats.hit_rate} className="mt-2" />
          </CardContent>
        </Card>
      </div>

      {/* Tabela de entradas de cache */}
      <Card>
        <CardHeader>
          <CardTitle>Entradas de Cache</CardTitle>
          <CardDescription>
            Estado atual das entradas no cache de métricas
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Chave do Cache</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Criado em</TableHead>
                <TableHead>Expira em</TableHead>
                <TableHead>Tempo Restante</TableHead>
                <TableHead>Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {cacheEntries.map((entry) => (
                <TableRow key={entry.id}>
                  <TableCell className="font-medium">
                    {formatCacheKey(entry.cache_key)}
                  </TableCell>
                  <TableCell>
                    <Badge variant={isExpired(entry.expires_at) ? 'destructive' : 'default'}>
                      {isExpired(entry.expires_at) ? 'Expirado' : 'Válido'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {format(new Date(entry.created_at), 'dd/MM/yyyy HH:mm', { locale: ptBR })}
                  </TableCell>
                  <TableCell>
                    {format(new Date(entry.expires_at), 'dd/MM/yyyy HH:mm', { locale: ptBR })}
                  </TableCell>
                  <TableCell>
                    <span className={isExpired(entry.expires_at) ? 'text-destructive' : 'text-green-600'}>
                      {getTimeToExpiry(entry.expires_at)}
                    </span>
                  </TableCell>
                  <TableCell>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => testCacheEntry(entry.cache_key)}
                    >
                      <Zap className="h-3 w-3 mr-1" />
                      Testar
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {cacheEntries.length === 0 && !loading && (
            <div className="text-center py-8 text-muted-foreground">
              Nenhuma entrada de cache encontrada.
              <br />
              <Button variant="outline" onClick={runCacheOptimization} className="mt-2">
                Criar cache inicial
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};