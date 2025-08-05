import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Plus, Loader2, Calendar, User, Clock } from 'lucide-react';
import { useCreateTicket, type Ticket } from '@/hooks/useTickets';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface TicketFormProps {
  plantId?: string;
  onSuccess?: () => void;
}

export const TicketForm: React.FC<TicketFormProps> = ({ plantId, onSuccess }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [formData, setFormData] = useState({
    plant_id: plantId || '',
    title: '',
    description: '',
    priority: 'medium' as Ticket['priority'],
    type: 'maintenance' as Ticket['type'],
    assigned_to: '',
    due_date: '',
    estimated_hours: ''
  });

  const createTicket = useCreateTicket();

  // Buscar plantas disponíveis
  const { data: plants } = useQuery({
    queryKey: ['plants'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('plants')
        .select('id, name, status')
        .eq('status', 'active')
        .order('name');
      
      if (error) throw error;
      return data;
    }
  });

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.plant_id || !formData.title || !formData.description) {
      return;
    }

    try {
      const ticketData: Omit<Ticket, 'id' | 'created_at' | 'updated_at' | 'opened_at'> = {
        ...formData,
        status: 'open',
        estimated_hours: formData.estimated_hours ? parseInt(formData.estimated_hours) : undefined,
        due_date: formData.due_date || undefined,
        closed_at: undefined
      };

      await createTicket.mutateAsync(ticketData);
      
      // Reset form
      setFormData({
        plant_id: plantId || '',
        title: '',
        description: '',
        priority: 'medium',
        type: 'maintenance',
        assigned_to: '',
        due_date: '',
        estimated_hours: ''
      });
      
      setIsOpen(false);
      onSuccess?.();
    } catch (error) {
      console.error('Error creating ticket:', error);
    }
  };

  const priorityColors = {
    low: 'bg-green-100 text-green-800',
    medium: 'bg-yellow-100 text-yellow-800',
    high: 'bg-orange-100 text-orange-800',
    critical: 'bg-red-100 text-red-800'
  };

  const typeLabels = {
    maintenance: 'Manutenção',
    repair: 'Reparo',
    inspection: 'Inspeção',
    upgrade: 'Upgrade'
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button className="w-full md:w-auto">
          <Plus className="mr-2 h-4 w-4" />
          Criar Ticket
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Criar Novo Ticket</DialogTitle>
          <DialogDescription>
            Crie um ticket de manutenção para uma das suas plantas solares
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Planta */}
            <div className="space-y-2">
              <Label htmlFor="plant_id">Planta *</Label>
              <Select 
                value={formData.plant_id} 
                onValueChange={(value) => handleInputChange('plant_id', value)}
                disabled={!!plantId}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione uma planta" />
                </SelectTrigger>
                <SelectContent>
                  {plants?.map((plant) => (
                    <SelectItem key={plant.id} value={plant.id}>
                      {plant.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Tipo */}
            <div className="space-y-2">
              <Label htmlFor="type">Tipo *</Label>
              <Select 
                value={formData.type} 
                onValueChange={(value: Ticket['type']) => handleInputChange('type', value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(typeLabels).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Título */}
          <div className="space-y-2">
            <Label htmlFor="title">Título *</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => handleInputChange('title', e.target.value)}
              placeholder="Ex: Limpeza de painéis solares"
              required
            />
          </div>

          {/* Descrição */}
          <div className="space-y-2">
            <Label htmlFor="description">Descrição *</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => handleInputChange('description', e.target.value)}
              placeholder="Descreva detalhadamente o que precisa ser feito..."
              rows={4}
              required
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Prioridade */}
            <div className="space-y-2">
              <Label htmlFor="priority">Prioridade</Label>
              <Select 
                value={formData.priority} 
                onValueChange={(value: Ticket['priority']) => handleInputChange('priority', value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">
                    <div className="flex items-center gap-2">
                      <Badge className={priorityColors.low}>Baixa</Badge>
                    </div>
                  </SelectItem>
                  <SelectItem value="medium">
                    <div className="flex items-center gap-2">
                      <Badge className={priorityColors.medium}>Média</Badge>
                    </div>
                  </SelectItem>
                  <SelectItem value="high">
                    <div className="flex items-center gap-2">
                      <Badge className={priorityColors.high}>Alta</Badge>
                    </div>
                  </SelectItem>
                  <SelectItem value="critical">
                    <div className="flex items-center gap-2">
                      <Badge className={priorityColors.critical}>Crítica</Badge>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Data Limite */}
            <div className="space-y-2">
              <Label htmlFor="due_date">
                <Calendar className="inline mr-1 h-4 w-4" />
                Data Limite
              </Label>
              <Input
                id="due_date"
                type="date"
                value={formData.due_date}
                onChange={(e) => handleInputChange('due_date', e.target.value)}
                min={new Date().toISOString().split('T')[0]}
              />
            </div>

            {/* Horas Estimadas */}
            <div className="space-y-2">
              <Label htmlFor="estimated_hours">
                <Clock className="inline mr-1 h-4 w-4" />
                Horas Estimadas
              </Label>
              <Input
                id="estimated_hours"
                type="number"
                min="1"
                max="168"
                value={formData.estimated_hours}
                onChange={(e) => handleInputChange('estimated_hours', e.target.value)}
                placeholder="Ex: 4"
              />
            </div>
          </div>

          {/* Responsável */}
          <div className="space-y-2">
            <Label htmlFor="assigned_to">
              <User className="inline mr-1 h-4 w-4" />
              Atribuído a
            </Label>
            <Input
              id="assigned_to"
              value={formData.assigned_to}
              onChange={(e) => handleInputChange('assigned_to', e.target.value)}
              placeholder="Nome do técnico responsável"
            />
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => setIsOpen(false)}
              disabled={createTicket.isPending}
            >
              Cancelar
            </Button>
            <Button 
              type="submit" 
              disabled={createTicket.isPending || !formData.plant_id || !formData.title || !formData.description}
            >
              {createTicket.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Criando...
                </>
              ) : (
                'Criar Ticket'
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};