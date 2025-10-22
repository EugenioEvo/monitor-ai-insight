import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Wrench, Calendar, Clock, DollarSign, FileText } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useState } from "react";

interface MaintenanceRecord {
  id: string;
  equipment_id: string;
  equipment_type: string;
  equipment_name?: string;
  maintenance_type: 'preventive' | 'corrective' | 'predictive';
  performed_at: string;
  performed_by?: string;
  duration_hours?: number;
  cost_brl?: number;
  notes?: string;
  parts_used?: any[];
}

export function EquipmentHistoryViewer({ plantId, equipmentId }: { plantId?: string; equipmentId?: string }) {
  const [filterType, setFilterType] = useState<string>('all');

  const { data: maintenanceHistory, isLoading } = useQuery({
    queryKey: ['equipment-history', plantId, equipmentId, filterType],
    queryFn: async (): Promise<MaintenanceRecord[]> => {
      let query = supabase
        .from('equipment_maintenance_history')
        .select('*')
        .order('performed_at', { ascending: false })
        .limit(50);

      if (plantId) query = query.eq('plant_id', plantId);
      if (equipmentId) query = query.eq('equipment_id', equipmentId);
      if (filterType !== 'all') query = query.eq('maintenance_type', filterType);

      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as MaintenanceRecord[];
    },
    staleTime: 2 * 60 * 1000,
  });

  const getMaintenanceTypeConfig = (type: string) => {
    switch (type) {
      case 'preventive':
        return { icon: '🛡️', color: 'bg-success text-success-foreground', label: 'Preventiva' };
      case 'corrective':
        return { icon: '🔧', color: 'bg-warning text-warning-foreground', label: 'Corretiva' };
      case 'predictive':
        return { icon: '🤖', color: 'bg-info text-info-foreground', label: 'Preditiva' };
      default:
        return { icon: '⚙️', color: 'bg-secondary text-secondary-foreground', label: 'Outro' };
    }
  };

  const formatCurrency = (value?: number) => {
    if (!value) return 'N/A';
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wrench className="w-5 h-5" />
            Histórico de Manutenções
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-40">
            <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        </CardContent>
      </Card>
    );
  }

  const totalCost = maintenanceHistory?.reduce((sum, m) => sum + (m.cost_brl || 0), 0) || 0;
  const totalHours = maintenanceHistory?.reduce((sum, m) => sum + (m.duration_hours || 0), 0) || 0;

  return (
    <Card className="hover:shadow-lg transition-all duration-300">
      <CardHeader>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-warning to-warning/80 rounded-xl flex items-center justify-center shadow-lg">
              <Wrench className="w-5 h-5 text-warning-foreground" />
            </div>
            <div>
              <CardTitle className="text-xl">Histórico de Manutenções</CardTitle>
              <CardDescription>
                {maintenanceHistory?.length || 0} registros • {formatCurrency(totalCost)} total
              </CardDescription>
            </div>
          </div>

          <Select value={filterType} onValueChange={setFilterType}>
            <SelectTrigger className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os Tipos</SelectItem>
              <SelectItem value="preventive">Preventiva</SelectItem>
              <SelectItem value="corrective">Corretiva</SelectItem>
              <SelectItem value="predictive">Preditiva</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent>
        {/* Summary Cards */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          <Card className="bg-muted/50">
            <CardContent className="p-3 text-center">
              <div className="text-xs text-muted-foreground mb-1">Total Registros</div>
              <div className="text-xl font-bold">{maintenanceHistory?.length || 0}</div>
            </CardContent>
          </Card>
          <Card className="bg-muted/50">
            <CardContent className="p-3 text-center">
              <div className="text-xs text-muted-foreground mb-1">Horas Totais</div>
              <div className="text-xl font-bold">{totalHours.toFixed(1)}h</div>
            </CardContent>
          </Card>
          <Card className="bg-muted/50">
            <CardContent className="p-3 text-center">
              <div className="text-xs text-muted-foreground mb-1">Custo Total</div>
              <div className="text-xl font-bold">{formatCurrency(totalCost)}</div>
            </CardContent>
          </Card>
        </div>

        {/* Timeline */}
        <ScrollArea className="h-[400px] pr-4">
          <div className="relative">
            <div className="absolute left-[19px] top-0 bottom-0 w-0.5 bg-border" />

            <div className="space-y-4">
              {maintenanceHistory && maintenanceHistory.length > 0 ? (
                maintenanceHistory.map((record) => {
                  const config = getMaintenanceTypeConfig(record.maintenance_type);
                  return (
                    <div key={record.id} className="relative pl-12">
                      <div className={`absolute left-0 w-10 h-10 rounded-xl bg-card border-2 flex items-center justify-center shadow-sm`}>
                        <span className="text-xl">{config.icon}</span>
                      </div>

                      <Card className="hover:shadow-md transition-all">
                        <CardContent className="p-4">
                          <div className="space-y-3">
                            {/* Header */}
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 flex-wrap mb-2">
                                  <Badge className={config.color}>{config.label}</Badge>
                                  <span className="font-semibold text-sm">
                                    {record.equipment_name || record.equipment_type}
                                  </span>
                                  <span className="text-xs text-muted-foreground">
                                    {record.equipment_id}
                                  </span>
                                </div>
                              </div>
                            </div>

                            {/* Metrics */}
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                              <div className="space-y-1">
                                <div className="flex items-center gap-1 text-muted-foreground">
                                  <Calendar className="w-3 h-3" />
                                  <span>Data</span>
                                </div>
                                <div className="font-semibold text-sm">
                                  {format(new Date(record.performed_at), "dd/MM/yy", { locale: ptBR })}
                                </div>
                              </div>
                              {record.duration_hours && (
                                <div className="space-y-1">
                                  <div className="flex items-center gap-1 text-muted-foreground">
                                    <Clock className="w-3 h-3" />
                                    <span>Duração</span>
                                  </div>
                                  <div className="font-semibold text-sm">
                                    {record.duration_hours}h
                                  </div>
                                </div>
                              )}
                              {record.cost_brl && (
                                <div className="space-y-1">
                                  <div className="flex items-center gap-1 text-muted-foreground">
                                    <DollarSign className="w-3 h-3" />
                                    <span>Custo</span>
                                  </div>
                                  <div className="font-semibold text-sm">
                                    {formatCurrency(record.cost_brl)}
                                  </div>
                                </div>
                              )}
                              {record.performed_by && (
                                <div className="space-y-1">
                                  <div className="flex items-center gap-1 text-muted-foreground">
                                    <Wrench className="w-3 h-3" />
                                    <span>Técnico</span>
                                  </div>
                                  <div className="font-semibold text-sm truncate">
                                    {record.performed_by}
                                  </div>
                                </div>
                              )}
                            </div>

                            {/* Notes */}
                            {record.notes && (
                              <div className="bg-muted/50 rounded-lg p-2">
                                <div className="flex items-start gap-1 text-xs">
                                  <FileText className="w-3 h-3 mt-0.5 text-muted-foreground flex-shrink-0" />
                                  <p className="text-xs text-muted-foreground">{record.notes}</p>
                                </div>
                              </div>
                            )}

                            {/* Parts Used */}
                            {record.parts_used && record.parts_used.length > 0 && (
                              <div className="space-y-1">
                                <div className="text-xs font-medium text-muted-foreground">Peças Utilizadas:</div>
                                <div className="flex flex-wrap gap-1">
                                  {record.parts_used.map((part: any, idx: number) => (
                                    <Badge key={idx} variant="outline" className="text-xs">
                                      {part.name || part}
                                    </Badge>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                  );
                })
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  <Wrench className="w-16 h-16 mx-auto mb-4 opacity-50" />
                  <p className="text-sm">Nenhum histórico de manutenção encontrado</p>
                </div>
              )}
            </div>
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
