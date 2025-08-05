import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Loader2, Database, Trash2, Play, CheckCircle, AlertTriangle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

export const TestDataManager = () => {
  const [isPopulating, setIsPopulating] = useState(false);
  const [isClearing, setIsClearing] = useState(false);
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [lastResult, setLastResult] = useState<any>(null);
  const { toast } = useToast();

  const populateTestData = async () => {
    setIsPopulating(true);
    setStatus('idle');
    
    try {
      const { data, error } = await supabase.functions.invoke('populate-test-data', {
        body: { action: 'populate_all' }
      });

      if (error) throw error;

      setLastResult(data);
      setStatus('success');
      toast({
        title: "Dados de teste populados",
        description: "Base de dados populada com dados de teste com sucesso.",
      });
    } catch (error) {
      console.error('Error populating test data:', error);
      setStatus('error');
      toast({
        title: "Erro ao popular dados",
        description: "Não foi possível popular a base de dados.",
        variant: "destructive",
      });
    } finally {
      setIsPopulating(false);
    }
  };

  const clearTestData = async () => {
    if (!confirm('Tem certeza que deseja limpar todos os dados de teste? Esta ação não pode ser desfeita.')) {
      return;
    }

    setIsClearing(true);
    setStatus('idle');
    
    try {
      const { data, error } = await supabase.functions.invoke('populate-test-data', {
        body: { action: 'clear_data' }
      });

      if (error) throw error;

      setLastResult(data);
      setStatus('success');
      toast({
        title: "Dados limpos",
        description: "Dados de teste removidos com sucesso.",
      });
    } catch (error) {
      console.error('Error clearing test data:', error);
      setStatus('error');
      toast({
        title: "Erro ao limpar dados",
        description: "Não foi possível limpar os dados de teste.",
        variant: "destructive",
      });
    } finally {
      setIsClearing(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Gerenciador de Dados de Teste
          </CardTitle>
          <CardDescription>
            Popule ou limpe dados de teste para validar o funcionamento do sistema
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {status === 'success' && lastResult && (
            <Alert>
              <CheckCircle className="h-4 w-4" />
              <AlertDescription>
                <div className="space-y-2">
                  <p><strong>Operação concluída com sucesso!</strong></p>
                  {lastResult.summary && (
                    <div className="text-sm">
                      <p>• Plantas processadas: {lastResult.summary.plants_processed}</p>
                      <p>• Leituras inseridas: {lastResult.summary.readings_inserted}</p>
                      <p>• Dias cobertos: {lastResult.summary.days_covered}</p>
                    </div>
                  )}
                  {lastResult.results && (
                    <div className="text-sm">
                      <p>Tabelas processadas:</p>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {lastResult.results.map((result: any, index: number) => (
                          <Badge 
                            key={index} 
                            variant={result.success ? "default" : "destructive"}
                          >
                            {result.table}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </AlertDescription>
            </Alert>
          )}

          {status === 'error' && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                Ocorreu um erro durante a operação. Verifique os logs para mais detalhes.
              </AlertDescription>
            </Alert>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">Popular Dados</CardTitle>
                <CardDescription>
                  Gera dados de teste para leituras, alertas, tendências e relatórios
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button 
                  onClick={populateTestData} 
                  disabled={isPopulating || isClearing}
                  className="w-full"
                >
                  {isPopulating ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Populando...
                    </>
                  ) : (
                    <>
                      <Play className="mr-2 h-4 w-4" />
                      Popular Dados de Teste
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">Limpar Dados</CardTitle>
                <CardDescription>
                  Remove todos os dados de teste do sistema (mantém plantas)
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button 
                  onClick={clearTestData} 
                  disabled={isPopulating || isClearing}
                  variant="destructive"
                  className="w-full"
                >
                  {isClearing ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Limpando...
                    </>
                  ) : (
                    <>
                      <Trash2 className="mr-2 h-4 w-4" />
                      Limpar Dados de Teste
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          </div>

          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <strong>Importante:</strong> Os dados de teste incluem leituras dos últimos 30 dias, 
              alertas simulados e tendências calculadas. Use esta funcionalidade apenas em 
              ambientes de desenvolvimento e teste.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    </div>
  );
};