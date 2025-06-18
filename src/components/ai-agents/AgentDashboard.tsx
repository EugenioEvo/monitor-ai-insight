
import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { FileText, Activity, Shield, Calendar, Play, Bot } from "lucide-react";

export function AgentDashboard() {
  const [loading, setLoading] = useState<string | null>(null);
  const { toast } = useToast();

  const runAgent = async (agentName: string, data: any = {}) => {
    setLoading(agentName);
    try {
      const { data: result, error } = await supabase.functions.invoke(agentName, {
        body: data
      });

      if (error) throw error;

      toast({
        title: `${agentName} executado com sucesso`,
        description: `Resultado: ${JSON.stringify(result, null, 2)}`,
      });
    } catch (error) {
      toast({
        title: "Erro ao executar agente",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(null);
    }
  };

  const agents = [
    {
      id: 'invoice-reader',
      name: 'InvoiceReader',
      description: 'Extrai dados de faturas via OCR usando GPT-4o',
      icon: FileText,
      status: 'active',
      trigger: 'Upload de arquivo',
      color: 'bg-blue-500'
    },
    {
      id: 'performance-analyst',
      name: 'PerformanceAnalyst', 
      description: 'Análise diária de performance das plantas',
      icon: Activity,
      status: 'active',
      trigger: 'Execução diária',
      color: 'bg-green-500'
    },
    {
      id: 'compliance-bot',
      name: 'ComplianceBot',
      description: 'Validação de conformidade regulatória',
      icon: Shield,
      status: 'active',
      trigger: 'Novo cadastro/legislação',
      color: 'bg-yellow-500'
    },
    {
      id: 'scheduler',
      name: 'Scheduler',
      description: 'Orquestração de tickets e notificações',
      icon: Calendar,
      status: 'active',
      trigger: 'Alertas P1/P2',
      color: 'bg-purple-500'
    }
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Bot className="w-8 h-8 text-blue-600" />
        <div>
          <h1 className="text-3xl font-bold">Agentes de IA</h1>
          <p className="text-gray-600">Painel de controle dos agentes automatizados</p>
        </div>
      </div>

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Visão Geral</TabsTrigger>
          <TabsTrigger value="logs">Logs de Execução</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-2">
            {agents.map((agent) => (
              <Card key={agent.id} className="relative">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className={`p-2 rounded-lg ${agent.color}`}>
                        <agent.icon className="w-4 h-4 text-white" />
                      </div>
                      <div>
                        <CardTitle className="text-lg">{agent.name}</CardTitle>
                        <Badge 
                          variant={agent.status === 'active' ? 'default' : 'secondary'}
                          className="text-xs"
                        >
                          {agent.status}
                        </Badge>
                      </div>
                    </div>
                  </div>
                  <CardDescription className="text-sm">
                    {agent.description}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="text-sm">
                      <span className="font-medium">Trigger:</span> {agent.trigger}
                    </div>
                    <Button
                      onClick={() => runAgent(agent.id)}
                      disabled={loading === agent.id}
                      className="w-full"
                      size="sm"
                    >
                      {loading === agent.id ? (
                        <div className="flex items-center gap-2">
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          Executando...
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <Play className="w-4 h-4" />
                          Executar Manualmente
                        </div>
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="logs">
          <Card>
            <CardHeader>
              <CardTitle>Logs de Execução</CardTitle>
              <CardDescription>
                Histórico de execuções dos agentes de IA
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-gray-500">
                <Bot className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>Logs serão exibidos aqui após as execuções dos agentes</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
