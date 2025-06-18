
import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, Users } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { BeneficiaryList } from './BeneficiaryList';
import { BeneficiaryForm } from './BeneficiaryForm';
import { AllocationProgress } from './AllocationProgress';
import type { Plant } from '@/types';

interface BeneficiaryManagementProps {
  plant: Plant;
}

interface Beneficiary {
  id: string;
  plant_id: string;
  name: string;
  cnpj: string;
  uc_code: string;
  allocation_percent: number;
  created_at: string;
  updated_at: string;
}

export const BeneficiaryManagement = ({ plant }: BeneficiaryManagementProps) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editingBeneficiary, setEditingBeneficiary] = useState<Beneficiary | null>(null);

  const { data: beneficiaries, isLoading } = useQuery({
    queryKey: ['beneficiaries', plant.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('beneficiaries')
        .select('*')
        .eq('plant_id', plant.id)
        .order('name');
      
      if (error) throw error;
      return data as Beneficiary[];
    }
  });

  const createBeneficiary = useMutation({
    mutationFn: async (beneficiary: Omit<Beneficiary, 'id' | 'created_at' | 'updated_at'>) => {
      const { data, error } = await supabase
        .from('beneficiaries')
        .insert(beneficiary)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['beneficiaries', plant.id] });
      setShowForm(false);
      toast({
        title: "Beneficiário adicionado!",
        description: "O beneficiário foi cadastrado com sucesso.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao adicionar beneficiário",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  const updateBeneficiary = useMutation({
    mutationFn: async (beneficiary: Beneficiary) => {
      const { data, error } = await supabase
        .from('beneficiaries')
        .update({
          name: beneficiary.name,
          cnpj: beneficiary.cnpj,
          uc_code: beneficiary.uc_code,
          allocation_percent: beneficiary.allocation_percent,
          updated_at: new Date().toISOString()
        })
        .eq('id', beneficiary.id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['beneficiaries', plant.id] });
      setEditingBeneficiary(null);
      setShowForm(false);
      toast({
        title: "Beneficiário atualizado!",
        description: "As informações foram atualizadas com sucesso.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao atualizar beneficiário",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  const deleteBeneficiary = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('beneficiaries')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['beneficiaries', plant.id] });
      toast({
        title: "Beneficiário removido!",
        description: "O beneficiário foi removido com sucesso.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao remover beneficiário",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  const handleEdit = (beneficiary: Beneficiary) => {
    setEditingBeneficiary(beneficiary);
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Tem certeza que deseja remover este beneficiário?')) {
      deleteBeneficiary.mutate(id);
    }
  };

  const handleFormSubmit = (beneficiaryData: Omit<Beneficiary, 'id' | 'created_at' | 'updated_at'>) => {
    if (editingBeneficiary) {
      updateBeneficiary.mutate({
        ...editingBeneficiary,
        ...beneficiaryData
      });
    } else {
      createBeneficiary.mutate(beneficiaryData);
    }
  };

  const handleFormCancel = () => {
    setShowForm(false);
    setEditingBeneficiary(null);
  };

  const totalAllocation = beneficiaries?.reduce((sum, b) => sum + b.allocation_percent, 0) || 0;

  if (isLoading) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-32 bg-gray-200 rounded"></div>
        <div className="h-64 bg-gray-200 rounded"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Users className="w-6 h-6" />
            Beneficiários
          </h2>
          <p className="text-muted-foreground">
            Gerencie os beneficiários e a distribuição de energia da planta
          </p>
        </div>
        <Button onClick={() => setShowForm(true)} disabled={showForm}>
          <Plus className="w-4 h-4 mr-2" />
          Adicionar Beneficiário
        </Button>
      </div>

      {/* Allocation Progress */}
      <AllocationProgress 
        totalAllocation={totalAllocation}
        beneficiariesCount={beneficiaries?.length || 0}
      />

      {/* Form */}
      {showForm && (
        <BeneficiaryForm
          plantId={plant.id}
          beneficiary={editingBeneficiary}
          currentAllocation={totalAllocation - (editingBeneficiary?.allocation_percent || 0)}
          onSubmit={handleFormSubmit}
          onCancel={handleFormCancel}
          isLoading={createBeneficiary.isPending || updateBeneficiary.isPending}
        />
      )}

      {/* Beneficiaries List */}
      <BeneficiaryList
        beneficiaries={beneficiaries || []}
        onEdit={handleEdit}
        onDelete={handleDelete}
        isDeleting={deleteBeneficiary.isPending}
      />
    </div>
  );
};
