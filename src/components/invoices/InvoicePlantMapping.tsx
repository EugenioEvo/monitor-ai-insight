import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { LinkIcon, CheckCircle, AlertTriangle } from 'lucide-react';

interface Invoice {
  id: string;
  uc_code: string;
  reference_month: string;
  total_r$: number;
  energy_kwh: number;
  status: string;
}

interface Plant {
  id: string;
  name: string;
  consumer_unit_code: string | null;
}

interface Beneficiary {
  id: string;
  plant_id: string;
  uc_code: string;
  name: string;
  allocation_percent: number;
}

export const InvoicePlantMapping = () => {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [plants, setPlants] = useState<Plant[]>([]);
  const [beneficiaries, setBeneficiaries] = useState<Beneficiary[]>([]);
  const [mappings, setMappings] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [invoicesData, plantsData, beneficiariesData] = await Promise.all([
        supabase.from('invoices').select('id, uc_code, reference_month, total_r$, energy_kwh, status'),
        supabase.from('plants').select('id, name, consumer_unit_code'),
        supabase.from('beneficiaries').select('id, plant_id, uc_code, name, allocation_percent')
      ]);

      if (invoicesData.error) throw invoicesData.error;
      if (plantsData.error) throw plantsData.error;
      if (beneficiariesData.error) throw beneficiariesData.error;

      setInvoices(invoicesData.data || []);
      setPlants(plantsData.data || []);
      setBeneficiaries(beneficiariesData.data || []);

      // Criar mapeamentos automáticos baseados em UCs existentes
      const autoMappings: Record<string, string> = {};
      (invoicesData.data || []).forEach(invoice => {
        const matchingBeneficiary = (beneficiariesData.data || []).find(b => b.uc_code === invoice.uc_code);
        if (matchingBeneficiary) {
          autoMappings[invoice.id] = matchingBeneficiary.plant_id;
        }
      });
      setMappings(autoMappings);

    } catch (error: any) {
      console.error('Erro ao carregar dados:', error);
      toast({
        title: "Erro",
        description: "Falha ao carregar dados de mapeamento",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleMappingChange = (invoiceId: string, plantId: string) => {
    setMappings(prev => ({ ...prev, [invoiceId]: plantId }));
  };

  const saveMappings = async () => {
    setIsSaving(true);
    try {
      // Atualizar UCs das plantas com base nos mapeamentos
      const updates = Object.entries(mappings).map(async ([invoiceId, plantId]) => {
        const invoice = invoices.find(i => i.id === invoiceId);
        if (!invoice) return;

        await supabase
          .from('plants')
          .update({ consumer_unit_code: invoice.uc_code })
          .eq('id', plantId);
      });

      await Promise.all(updates);

      toast({
        title: "Mapeamentos Salvos",
        description: "Plantas foram associadas às unidades consumidoras com sucesso",
      });

      loadData(); // Recarregar dados
    } catch (error: any) {
      console.error('Erro ao salvar mapeamentos:', error);
      toast({
        title: "Erro",
        description: "Falha ao salvar mapeamentos",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const getInvoiceStatus = (invoice: Invoice) => {
    const hasMapping = mappings[invoice.id];
    const hasExistingBeneficiary = beneficiaries.some(b => b.uc_code === invoice.uc_code);
    
    if (hasExistingBeneficiary) return 'mapped';
    if (hasMapping) return 'pending';
    return 'unmapped';
  };

  const unmappedInvoices = invoices.filter(i => getInvoiceStatus(i) === 'unmapped');
  const mappedInvoices = invoices.filter(i => getInvoiceStatus(i) === 'mapped');
  const pendingInvoices = invoices.filter(i => getInvoiceStatus(i) === 'pending');

  if (isLoading) {
    return <div>Carregando mapeamentos...</div>;
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <LinkIcon className="h-5 w-5" />
            Mapeamento Faturas ↔ Plantas
          </CardTitle>
          <CardDescription>
            Conecte faturas de energia às plantas geradoras para cálculos precisos de economia
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{mappedInvoices.length}</div>
              <div className="text-sm text-muted-foreground">Mapeadas</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-yellow-600">{pendingInvoices.length}</div>
              <div className="text-sm text-muted-foreground">Pendentes</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-red-600">{unmappedInvoices.length}</div>
              <div className="text-sm text-muted-foreground">Não Mapeadas</div>
            </div>
          </div>

          {pendingInvoices.length > 0 && (
            <div className="flex justify-end mb-4">
              <Button onClick={saveMappings} disabled={isSaving}>
                {isSaving ? 'Salvando...' : 'Salvar Mapeamentos'}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {unmappedInvoices.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-red-600">Faturas Não Mapeadas</CardTitle>
            <CardDescription>
              Estas faturas precisam ser associadas a plantas existentes
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {unmappedInvoices.map(invoice => (
                <div key={invoice.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">UC: {invoice.uc_code}</Badge>
                      <Badge variant="secondary">{invoice.reference_month}</Badge>
                    </div>
                    <div className="text-sm text-muted-foreground mt-1">
                      R$ {invoice.total_r$.toFixed(2)} • {invoice.energy_kwh.toFixed(0)} kWh
                    </div>
                  </div>
                  <div className="w-64">
                    <Select
                      value={mappings[invoice.id] || ''}
                      onValueChange={(value) => handleMappingChange(invoice.id, value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecionar planta..." />
                      </SelectTrigger>
                      <SelectContent>
                        {plants.map(plant => (
                          <SelectItem key={plant.id} value={plant.id}>
                            {plant.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {mappedInvoices.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-green-600 flex items-center gap-2">
              <CheckCircle className="h-5 w-5" />
              Faturas Mapeadas
            </CardTitle>
            <CardDescription>
              Estas faturas já estão conectadas às plantas através de beneficiários
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {mappedInvoices.slice(0, 5).map(invoice => {
                const beneficiary = beneficiaries.find(b => b.uc_code === invoice.uc_code);
                const plant = plants.find(p => p.id === beneficiary?.plant_id);
                
                return (
                  <div key={invoice.id} className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">UC: {invoice.uc_code}</Badge>
                      <span className="text-sm">→</span>
                      <Badge variant="default">{plant?.name}</Badge>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {invoice.reference_month} • R$ {invoice.total_r$.toFixed(2)}
                    </div>
                  </div>
                );
              })}
              {mappedInvoices.length > 5 && (
                <div className="text-center text-sm text-muted-foreground">
                  +{mappedInvoices.length - 5} faturas mapeadas
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {plants.length === 0 && (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            Nenhuma planta cadastrada. Cadastre plantas primeiro para poder mapear faturas.
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
};