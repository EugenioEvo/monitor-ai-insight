
import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search } from 'lucide-react';

type Severity = 'low' | 'medium' | 'high' | 'critical' | '';

interface Plant { id: string; name: string }

interface AlertsFiltersProps {
  plants?: Plant[];
  plantId: string;
  status: string;
  severity: Severity;
  searchTerm: string;
  onChangePlant: (v: string) => void;
  onChangeStatus: (v: string) => void;
  onChangeSeverity: (v: Severity) => void;
  onChangeSearch: (v: string) => void;
  onClear: () => void;
}

export const AlertsFilters: React.FC<AlertsFiltersProps> = ({
  plants,
  plantId,
  status,
  severity,
  searchTerm,
  onChangePlant,
  onChangeStatus,
  onChangeSeverity,
  onChangeSearch,
  onClear,
}) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Filtros</CardTitle>
        <CardDescription>Refine os alertas exibidos</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <div className="space-y-1">
            <Label>Planta</Label>
            <Select value={plantId} onValueChange={(v) => onChangePlant(v === 'all' ? '' : v)}>
              <SelectTrigger>
                <SelectValue placeholder="Todas" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={'all'}>Todas</SelectItem>
                {plants?.map((p) => (
                  <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <Label>Status</Label>
            <Select value={status} onValueChange={(v) => onChangeStatus(v === 'all' ? '' : v)}>
              <SelectTrigger>
                <SelectValue placeholder="Todos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={'all'}>Todos</SelectItem>
                <SelectItem value="open">Aberto</SelectItem>
                <SelectItem value="acknowledged">Reconhecido</SelectItem>
                <SelectItem value="resolved">Resolvido</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <Label>Severidade</Label>
            <Select value={severity} onValueChange={(v) => onChangeSeverity(v === 'all' ? '' as Severity : (v as Severity))}>
              <SelectTrigger>
                <SelectValue placeholder="Todas" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={'all'}>Todas</SelectItem>
                <SelectItem value="low">Baixa</SelectItem>
                <SelectItem value="medium">Média</SelectItem>
                <SelectItem value="high">Alta</SelectItem>
                <SelectItem value="critical">Crítica</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1 md:col-span-2">
            <Label>Busca</Label>
            <div className="flex items-center gap-2">
              <Search className="w-4 h-4 text-muted-foreground" />
              <Input placeholder="Mensagem ou tipo" value={searchTerm} onChange={(e) => onChangeSearch(e.target.value)} />
            </div>
          </div>
        </div>

        <div className="mt-4 flex gap-2">
          <Button variant="outline" onClick={onClear}>Limpar</Button>
        </div>
      </CardContent>
    </Card>
  );
};
