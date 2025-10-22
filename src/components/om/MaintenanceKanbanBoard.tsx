import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Clock, User, MapPin, MoreVertical, MessageSquare } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useTickets } from "@/hooks/useTickets";
import { TicketForm } from "@/components/tickets/TicketForm";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

interface KanbanColumn {
  id: string;
  title: string;
  status: string;
  count: number;
}

const columns: KanbanColumn[] = [
  { id: "open", title: "Aberto", status: "open", count: 0 },
  { id: "in_progress", title: "Em Progresso", status: "in_progress", count: 0 },
  { id: "waiting_parts", title: "Aguardando Peças", status: "waiting_parts", count: 0 },
  { id: "completed", title: "Concluído", status: "completed", count: 0 },
];

const priorityColors = {
  low: "bg-blue-500",
  medium: "bg-yellow-500",
  high: "bg-orange-500",
  critical: "bg-red-500",
};

const priorityLabels = {
  low: "Baixa",
  medium: "Média",
  high: "Alta",
  critical: "Crítica",
};

export function MaintenanceKanbanBoard() {
  const { data: tickets, isLoading } = useTickets();
  const [selectedTicket, setSelectedTicket] = useState<any>(null);

  const getTicketsByStatus = (status: string) => {
    return tickets?.filter((ticket) => ticket.status === status) || [];
  };

  const columnsWithCounts = columns.map((col) => ({
    ...col,
    count: getTicketsByStatus(col.status).length,
  }));

  if (isLoading) {
    return <div>Carregando tickets...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {columnsWithCounts.map((column) => (
          <Card key={column.id} className="flex flex-col h-[600px]">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base font-semibold">
                  {column.title}
                </CardTitle>
                <Badge variant="secondary" className="ml-auto">
                  {column.count}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="flex-1 p-3 pt-0">
              <ScrollArea className="h-full pr-3">
                <div className="space-y-3">
                  {getTicketsByStatus(column.status).map((ticket: any) => (
                    <Card
                      key={ticket.id}
                      className="cursor-pointer hover:shadow-md transition-shadow border-l-4"
                      style={{
                        borderLeftColor: `var(--${priorityColors[ticket.priority as keyof typeof priorityColors]})`,
                      }}
                      onClick={() => setSelectedTicket(ticket)}
                    >
                      <CardContent className="p-3">
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex-1">
                            <h4 className="font-medium text-sm line-clamp-2 mb-1">
                              {ticket.title || "Sem título"}
                            </h4>
                            <p className="text-xs text-muted-foreground line-clamp-2">
                              {ticket.description}
                            </p>
                          </div>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                              <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem>Editar</DropdownMenuItem>
                              <DropdownMenuItem>Atribuir</DropdownMenuItem>
                              <DropdownMenuItem className="text-destructive">
                                Deletar
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>

                        <div className="flex flex-wrap gap-2 mt-3">
                          <Badge variant="outline" className="text-xs">
                            {priorityLabels[ticket.priority as keyof typeof priorityLabels]}
                          </Badge>
                          <Badge variant="outline" className="text-xs">
                            {ticket.type}
                          </Badge>
                        </div>

                        <div className="flex items-center gap-3 mt-3 text-xs text-muted-foreground">
                          {ticket.plant && (
                            <div className="flex items-center gap-1">
                              <MapPin className="h-3 w-3" />
                              <span className="truncate max-w-[100px]">
                                {ticket.plant.name}
                              </span>
                            </div>
                          )}
                          <div className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            <span>
                              {formatDistanceToNow(new Date(ticket.opened_at), {
                                addSuffix: true,
                                locale: ptBR,
                              })}
                            </span>
                          </div>
                        </div>

                        {ticket.assigned_to && (
                          <div className="flex items-center gap-1 mt-2 text-xs">
                            <User className="h-3 w-3" />
                            <span className="text-muted-foreground">{ticket.assigned_to}</span>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        ))}
      </div>

      {selectedTicket && (
        <Card className="fixed inset-4 z-50 overflow-auto">
          <CardHeader>
            <CardTitle>{selectedTicket.title || "Detalhes do Ticket"}</CardTitle>
            <Button
              variant="ghost"
              size="sm"
              className="absolute right-4 top-4"
              onClick={() => setSelectedTicket(null)}
            >
              ✕
            </Button>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <h4 className="font-semibold mb-2">Descrição</h4>
                <p className="text-sm text-muted-foreground">{selectedTicket.description}</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h4 className="font-semibold mb-1">Prioridade</h4>
                  <Badge>{selectedTicket.priority}</Badge>
                </div>
                <div>
                  <h4 className="font-semibold mb-1">Status</h4>
                  <Badge>{selectedTicket.status}</Badge>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
