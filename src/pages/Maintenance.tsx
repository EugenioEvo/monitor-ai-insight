import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { 
  AlertTriangle, 
  Clock, 
  CheckCircle, 
  XCircle, 
  Plus,
  Search,
  Filter,
  Activity,
  Database,
  Zap,
  Shield
} from "lucide-react";
import { useAlerts } from "@/hooks/useAlerts";
import { useTickets } from "@/hooks/useTickets";
import RealTimeSystemMonitor from "@/components/monitoring/RealTimeSystemMonitor";
import BackupManager from "@/components/backup/BackupManager";
import DataOptimizer from "@/components/optimization/DataOptimizer";
import { AdvancedAnalytics } from "@/components/analytics/AdvancedAnalytics";
import { SmartAlertsManager } from "@/components/alerts/SmartAlertsManager";
import { MetricsCacheManager } from "@/components/performance/MetricsCacheManager";
import { AutomatedReportsPanel } from "@/components/reports/AutomatedReportsPanel";

const statusColors = {
  open: 'bg-red-100 text-red-800',
  in_progress: 'bg-yellow-100 text-yellow-800',
  waiting_parts: 'bg-blue-100 text-blue-800',
  completed: 'bg-green-100 text-green-800',
  cancelled: 'bg-gray-100 text-gray-800'
};

const priorityColors = {
  low: 'bg-blue-100 text-blue-800',
  medium: 'bg-yellow-100 text-yellow-800',
  high: 'bg-orange-100 text-orange-800',
  critical: 'bg-red-100 text-red-800'
};

const severityColors = {
  low: 'bg-blue-100 text-blue-800',
  medium: 'bg-yellow-100 text-yellow-800',
  high: 'bg-orange-100 text-orange-800',
  critical: 'bg-red-100 text-red-800'
};

export default function Maintenance() {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  
  const { data: alerts, isLoading: alertsLoading } = useAlerts();
  const { data: tickets, isLoading: ticketsLoading } = useTickets();

  const filteredTickets = tickets?.filter(ticket => {
    const matchesSearch = ticket.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         ticket.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "all" || ticket.status === statusFilter;
    return matchesSearch && matchesStatus;
  }) || [];

  const openAlerts = alerts?.filter(alert => alert.status === 'open') || [];
  const openTickets = tickets?.filter(ticket => ['open', 'in_progress'].includes(ticket.status)) || [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Operação & Manutenção</h1>
          <p className="text-muted-foreground">
            Gerencie alertas e tickets de manutenção das usinas
          </p>
        </div>
        <Button>
          <Plus className="w-4 h-4 mr-2" />
          Novo Ticket
        </Button>
      </div>

      {/* Cards de Resumo */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Alertas Ativos</CardTitle>
            <AlertTriangle className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{openAlerts.length}</div>
            <p className="text-xs text-muted-foreground">
              Requerem atenção
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tickets Abertos</CardTitle>
            <Clock className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{openTickets.length}</div>
            <p className="text-xs text-muted-foreground">
              Em andamento
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Concluídos Hoje</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {tickets?.filter(t => 
                t.status === 'completed' && 
                t.closed_at && 
                new Date(t.closed_at).toDateString() === new Date().toDateString()
              ).length || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              Tickets finalizados
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">SLA Crítico</CardTitle>
            <XCircle className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {tickets?.filter(t => 
                t.priority === 'critical' && 
                ['open', 'in_progress'].includes(t.status)
              ).length || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              Atenção urgente
            </p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="tickets" className="space-y-4">
        <TabsList className="grid w-full grid-cols-9">
          <TabsTrigger value="tickets">Tickets</TabsTrigger>
          <TabsTrigger value="alerts">Alertas</TabsTrigger>
          <TabsTrigger value="monitor">
            <Activity className="h-4 w-4 mr-1" />
            Monitor
          </TabsTrigger>
          <TabsTrigger value="backup">
            <Database className="h-4 w-4 mr-1" />
            Backup
          </TabsTrigger>
          <TabsTrigger value="optimizer">
            <Zap className="h-4 w-4 mr-1" />
            Otimizar
          </TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
          <TabsTrigger value="smart-alerts">Alertas IA</TabsTrigger>
          <TabsTrigger value="cache">Cache</TabsTrigger>
          <TabsTrigger value="reports">Relatórios</TabsTrigger>
        </TabsList>

        <TabsContent value="tickets" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Tickets de Manutenção</CardTitle>
                <div className="flex items-center space-x-2">
                  <div className="relative">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Buscar tickets..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-8 w-[250px]"
                    />
                  </div>
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="px-3 py-2 border rounded-md text-sm"
                  >
                    <option value="all">Todos os Status</option>
                    <option value="open">Aberto</option>
                    <option value="in_progress">Em Progresso</option>
                    <option value="waiting_parts">Aguardando Peças</option>
                    <option value="completed">Concluído</option>
                  </select>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {ticketsLoading ? (
                <div className="text-center py-8">Carregando tickets...</div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>ID</TableHead>
                      <TableHead>Título</TableHead>
                      <TableHead>Usina</TableHead>
                      <TableHead>Prioridade</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Responsável</TableHead>
                      <TableHead>Criado em</TableHead>
                      <TableHead>Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredTickets.map((ticket) => (
                      <TableRow key={ticket.id}>
                        <TableCell className="font-mono text-xs">
                          {ticket.id.slice(0, 8)}
                        </TableCell>
                        <TableCell>
                          <div className="font-medium">{ticket.title}</div>
                          <div className="text-sm text-muted-foreground">
                            {ticket.description.slice(0, 50)}...
                          </div>
                        </TableCell>
                        <TableCell>
                          {ticket.plants?.name || 'N/A'}
                        </TableCell>
                        <TableCell>
                          <Badge className={priorityColors[ticket.priority as keyof typeof priorityColors]}>
                            {ticket.priority}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge className={statusColors[ticket.status as keyof typeof statusColors]}>
                            {ticket.status.replace('_', ' ')}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {ticket.assigned_to || 'Não atribuído'}
                        </TableCell>
                        <TableCell>
                          {new Date(ticket.created_at).toLocaleDateString('pt-BR')}
                        </TableCell>
                        <TableCell>
                          <Button variant="outline" size="sm">
                            Ver Detalhes
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="alerts" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Alertas Ativos</CardTitle>
            </CardHeader>
            <CardContent>
              {alertsLoading ? (
                <div className="text-center py-8">Carregando alertas...</div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Severidade</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Mensagem</TableHead>
                      <TableHead>Usina</TableHead>
                      <TableHead>Data</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {alerts?.map((alert) => (
                      <TableRow key={alert.id}>
                        <TableCell>
                          <Badge className={severityColors[alert.severity as keyof typeof severityColors]}>
                            {alert.severity}
                          </Badge>
                        </TableCell>
                        <TableCell>{alert.type}</TableCell>
                        <TableCell>{alert.message}</TableCell>
                        <TableCell>
                          {alert.plants?.name || 'N/A'}
                        </TableCell>
                        <TableCell>
                          {new Date(alert.timestamp).toLocaleString('pt-BR')}
                        </TableCell>
                        <TableCell>
                          <Badge variant={alert.status === 'open' ? 'destructive' : 'default'}>
                            {alert.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Button variant="outline" size="sm">
                            Reconhecer
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="monitor">
          <RealTimeSystemMonitor />
        </TabsContent>

        <TabsContent value="backup">
          <BackupManager />
        </TabsContent>

        <TabsContent value="optimizer">
          <DataOptimizer />
        </TabsContent>

        <TabsContent value="analytics">
          <AdvancedAnalytics />
        </TabsContent>

        <TabsContent value="smart-alerts">
          <SmartAlertsManager />
        </TabsContent>

        <TabsContent value="cache">
          <MetricsCacheManager />
        </TabsContent>

        <TabsContent value="reports">
          <AutomatedReportsPanel />
        </TabsContent>
      </Tabs>
    </div>
  );
}