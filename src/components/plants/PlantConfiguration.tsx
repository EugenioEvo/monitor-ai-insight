
import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { User, Building, DollarSign, MapPin, FileText, Edit3, Save, X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { concessionarias } from '@/utils/concessionarias';
import { useCustomers } from '@/hooks/useCustomers';
import type { Plant } from '@/types';

interface PlantConfigurationProps {
  plant: Plant;
  onUpdate: () => void;
}

export const PlantConfiguration = ({ plant, onUpdate }: PlantConfigurationProps) => {
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const { data: customers } = useCustomers();

  const { register, handleSubmit, setValue, watch, formState: { errors } } = useForm({
    defaultValues: {
      customer_id: plant.customer_id || '',
      initial_investment: plant.initial_investment || '',
      generator_address_street: plant.generator_address_street || '',
      generator_address_number: plant.generator_address_number || '',
      generator_address_complement: plant.generator_address_complement || '',
      generator_address_neighborhood: plant.generator_address_neighborhood || '',
      generator_address_city: plant.generator_address_city || '',
      generator_address_state: plant.generator_address_state || '',
      generator_address_zip_code: plant.generator_address_zip_code || '',
      consumer_unit_code: plant.consumer_unit_code || '',
      concessionaria: plant.concessionaria || '',
      project_assumptions: plant.project_assumptions ? JSON.stringify(plant.project_assumptions, null, 2) : ''
    }
  });

  const selectedCustomerId = watch('customer_id');
  const selectedCustomer = customers?.find(c => c.id === selectedCustomerId);

  const onSubmit = async (data: any) => {
    setIsLoading(true);
    try {
      const updateData = {
        ...data,
        initial_investment: data.initial_investment ? parseFloat(data.initial_investment) : null,
        project_assumptions: data.project_assumptions ? JSON.parse(data.project_assumptions) : null
      };

      const { error } = await supabase
        .from('plants')
        .update(updateData)
        .eq('id', plant.id);

      if (error) throw error;

      toast({
        title: "Configurações salvas",
        description: "As configurações da planta foram atualizadas com sucesso."
      });

      setIsEditing(false);
      onUpdate();
    } catch (error) {
      console.error('Erro ao salvar configurações:', error);
      toast({
        variant: "destructive",
        title: "Erro ao salvar",
        description: "Não foi possível salvar as configurações."
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    setIsEditing(false);
    // Reset form to original values
    setValue('customer_id', plant.customer_id || '');
    setValue('initial_investment', plant.initial_investment || '');
    setValue('generator_address_street', plant.generator_address_street || '');
    setValue('generator_address_number', plant.generator_address_number || '');
    setValue('generator_address_complement', plant.generator_address_complement || '');
    setValue('generator_address_neighborhood', plant.generator_address_neighborhood || '');
    setValue('generator_address_city', plant.generator_address_city || '');
    setValue('generator_address_state', plant.generator_address_state || '');
    setValue('generator_address_zip_code', plant.generator_address_zip_code || '');
    setValue('consumer_unit_code', plant.consumer_unit_code || '');
    setValue('concessionaria', plant.concessionaria || '');
    setValue('project_assumptions', plant.project_assumptions ? JSON.stringify(plant.project_assumptions, null, 2) : '');
  };

  return (
    <div className="space-y-6">
      {/* Header com botões de ação */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Configurações da Planta</h2>
          <p className="text-muted-foreground">
            Gerencie as informações de proprietário, investimento e dados técnicos
          </p>
        </div>
        <div className="flex gap-2">
          {!isEditing ? (
            <Button onClick={() => setIsEditing(true)}>
              <Edit3 className="w-4 h-4 mr-2" />
              Editar
            </Button>
          ) : (
            <>
              <Button variant="outline" onClick={handleCancel}>
                <X className="w-4 h-4 mr-2" />
                Cancelar
              </Button>
              <Button onClick={handleSubmit(onSubmit)} disabled={isLoading}>
                <Save className="w-4 h-4 mr-2" />
                {isLoading ? 'Salvando...' : 'Salvar'}
              </Button>
            </>
          )}
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Proprietário */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="w-5 h-5" />
              Proprietário
            </CardTitle>
            <CardDescription>
              Selecione o cliente proprietário desta instalação solar
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="customer_id">Cliente Proprietário</Label>
              {isEditing ? (
                <Select value={watch('customer_id')} onValueChange={(value) => setValue('customer_id', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o cliente proprietário" />
                  </SelectTrigger>
                  <SelectContent>
                    {customers?.map((customer) => (
                      <SelectItem key={customer.id} value={customer.id}>
                        {customer.name} - {customer.document}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <Input
                  value={selectedCustomer ? `${selectedCustomer.name} - ${selectedCustomer.document}` : 'Nenhum cliente selecionado'}
                  disabled={true}
                  placeholder="Nenhum cliente selecionado"
                />
              )}
            </div>

            {/* Exibir dados do cliente selecionado */}
            {selectedCustomer && (
              <div className="mt-4 p-4 bg-muted rounded-lg">
                <h4 className="font-medium mb-2">Dados do Cliente</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                  <div><strong>Email:</strong> {selectedCustomer.email}</div>
                  <div><strong>Telefone:</strong> {selectedCustomer.phone}</div>
                  <div><strong>Data de Nascimento:</strong> {new Date(selectedCustomer.birth_date).toLocaleDateString('pt-BR')}</div>
                  {selectedCustomer.address_street && (
                    <div className="md:col-span-2">
                      <strong>Endereço:</strong> {selectedCustomer.address_street}, {selectedCustomer.address_number} - {selectedCustomer.address_neighborhood}, {selectedCustomer.address_city}/{selectedCustomer.address_state}
                    </div>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Informações de Investimento */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="w-5 h-5" />
              Informações de Investimento
            </CardTitle>
            <CardDescription>
              Dados financeiros do projeto
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="initial_investment">Investimento Inicial (R$)</Label>
                <Input
                  id="initial_investment"
                  type="number"
                  step="0.01"
                  {...register('initial_investment')}
                  disabled={!isEditing}
                  placeholder="0,00"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Endereço da Unidade Geradora */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="w-5 h-5" />
              Endereço da Unidade Geradora
            </CardTitle>
            <CardDescription>
              Localização física da instalação solar
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="md:col-span-2">
                <Label htmlFor="generator_address_street">Logradouro</Label>
                <Input
                  id="generator_address_street"
                  {...register('generator_address_street')}
                  disabled={!isEditing}
                  placeholder="Rua, Avenida, etc."
                />
              </div>
              <div>
                <Label htmlFor="generator_address_number">Número</Label>
                <Input
                  id="generator_address_number"
                  {...register('generator_address_number')}
                  disabled={!isEditing}
                  placeholder="123"
                />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="generator_address_complement">Complemento</Label>
                <Input
                  id="generator_address_complement"
                  {...register('generator_address_complement')}
                  disabled={!isEditing}
                  placeholder="Apartamento, Bloco, etc."
                />
              </div>
              <div>
                <Label htmlFor="generator_address_neighborhood">Bairro</Label>
                <Input
                  id="generator_address_neighborhood"
                  {...register('generator_address_neighborhood')}
                  disabled={!isEditing}
                  placeholder="Nome do bairro"
                />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="generator_address_city">Cidade</Label>
                <Input
                  id="generator_address_city"
                  {...register('generator_address_city')}
                  disabled={!isEditing}
                  placeholder="Nome da cidade"
                />
              </div>
              <div>
                <Label htmlFor="generator_address_state">Estado</Label>
                <Input
                  id="generator_address_state"
                  {...register('generator_address_state')}
                  disabled={!isEditing}
                  placeholder="UF"
                  maxLength={2}
                />
              </div>
              <div>
                <Label htmlFor="generator_address_zip_code">CEP</Label>
                <Input
                  id="generator_address_zip_code"
                  {...register('generator_address_zip_code')}
                  disabled={!isEditing}
                  placeholder="00000-000"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Dados Técnicos */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building className="w-5 h-5" />
              Dados Técnicos
            </CardTitle>
            <CardDescription>
              Informações técnicas da instalação
            </CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="consumer_unit_code">Código da Unidade Consumidora</Label>
              <Input
                id="consumer_unit_code"
                {...register('consumer_unit_code')}
                disabled={!isEditing}
                placeholder="Código UC"
              />
            </div>
            <div>
              <Label htmlFor="concessionaria">Concessionária</Label>
              {isEditing ? (
                <Select value={watch('concessionaria')} onValueChange={(value) => setValue('concessionaria', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione a concessionária" />
                  </SelectTrigger>
                  <SelectContent>
                    {concessionarias.map((concessionaria) => (
                      <SelectItem key={concessionaria} value={concessionaria}>
                        {concessionaria}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <Input
                  value={watch('concessionaria')}
                  disabled={true}
                  placeholder="Concessionária não selecionada"
                />
              )}
            </div>
          </CardContent>
        </Card>

        {/* Premissas do Projeto */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Premissas do Projeto
            </CardTitle>
            <CardDescription>
              Informações técnicas e premissas utilizadas no projeto (formato JSON)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div>
              <Label htmlFor="project_assumptions">Premissas (JSON)</Label>
              <Textarea
                id="project_assumptions"
                {...register('project_assumptions')}
                disabled={!isEditing}
                placeholder='{"irradiacao_media": 5.2, "fator_performance": 0.85, "degradacao_anual": 0.5}'
                rows={6}
                className="font-mono text-sm"
              />
            </div>
          </CardContent>
        </Card>
      </form>
    </div>
  );
};
