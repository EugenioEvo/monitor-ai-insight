
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, UserPlus } from 'lucide-react';

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

interface BeneficiaryFormProps {
  plantId: string;
  beneficiary?: Beneficiary | null;
  currentAllocation: number;
  onSubmit: (beneficiary: Omit<Beneficiary, 'id' | 'created_at' | 'updated_at'>) => void;
  onCancel: () => void;
  isLoading: boolean;
}

export const BeneficiaryForm = ({ 
  plantId, 
  beneficiary, 
  currentAllocation, 
  onSubmit, 
  onCancel, 
  isLoading 
}: BeneficiaryFormProps) => {
  const [formData, setFormData] = useState({
    name: '',
    cnpj: '',
    uc_code: '',
    allocation_percent: 0
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (beneficiary) {
      setFormData({
        name: beneficiary.name,
        cnpj: beneficiary.cnpj,
        uc_code: beneficiary.uc_code,
        allocation_percent: beneficiary.allocation_percent
      });
    }
  }, [beneficiary]);

  const validateCNPJ = (cnpj: string) => {
    const cleaned = cnpj.replace(/\D/g, '');
    if (cleaned.length === 11) {
      // Validação simples de CPF
      return cleaned.length === 11;
    }
    if (cleaned.length === 14) {
      // Validação simples de CNPJ
      return cleaned.length === 14;
    }
    return false;
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Nome é obrigatório';
    }

    if (!formData.cnpj.trim()) {
      newErrors.cnpj = 'CNPJ/CPF é obrigatório';
    } else if (!validateCNPJ(formData.cnpj)) {
      newErrors.cnpj = 'CNPJ/CPF inválido';
    }

    if (!formData.uc_code.trim()) {
      newErrors.uc_code = 'Código UC é obrigatório';
    }

    if (formData.allocation_percent <= 0) {
      newErrors.allocation_percent = 'Porcentagem deve ser maior que 0';
    } else if (formData.allocation_percent > 100) {
      newErrors.allocation_percent = 'Porcentagem não pode ser maior que 100';
    } else if (currentAllocation + formData.allocation_percent > 100) {
      newErrors.allocation_percent = `Porcentagem disponível: ${100 - currentAllocation}%`;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    onSubmit({
      plant_id: plantId,
      name: formData.name.trim(),
      cnpj: formData.cnpj.replace(/\D/g, ''),
      uc_code: formData.uc_code.trim(),
      allocation_percent: formData.allocation_percent
    });
  };

  const handleInputChange = (field: string, value: string | number) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Limpar erro do campo quando o usuário começar a digitar
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const formatCNPJInput = (value: string) => {
    const cleaned = value.replace(/\D/g, '');
    if (cleaned.length <= 11) {
      // CPF format
      return cleaned.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
    } else {
      // CNPJ format
      return cleaned.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
    }
  };

  const maxAllocation = 100 - currentAllocation;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <UserPlus className="w-5 h-5" />
          {beneficiary ? 'Editar Beneficiário' : 'Adicionar Beneficiário'}
        </CardTitle>
        <CardDescription>
          {beneficiary 
            ? 'Atualize as informações do beneficiário'
            : `Cadastre um novo beneficiário. Porcentagem disponível: ${maxAllocation}%`
          }
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nome *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                placeholder="Nome do beneficiário"
                className={errors.name ? 'border-red-500' : ''}
              />
              {errors.name && <p className="text-sm text-red-500">{errors.name}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="cnpj">CNPJ/CPF *</Label>
              <Input
                id="cnpj"
                value={formatCNPJInput(formData.cnpj)}
                onChange={(e) => handleInputChange('cnpj', e.target.value)}
                placeholder="00.000.000/0000-00 ou 000.000.000-00"
                className={errors.cnpj ? 'border-red-500' : ''}
              />
              {errors.cnpj && <p className="text-sm text-red-500">{errors.cnpj}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="uc_code">Código UC *</Label>
              <Input
                id="uc_code"
                value={formData.uc_code}
                onChange={(e) => handleInputChange('uc_code', e.target.value)}
                placeholder="Código da Unidade Consumidora"
                className={errors.uc_code ? 'border-red-500' : ''}
              />
              {errors.uc_code && <p className="text-sm text-red-500">{errors.uc_code}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="allocation_percent">Porcentagem de Alocação (%) *</Label>
              <Input
                id="allocation_percent"
                type="number"
                min="0.1"
                max={maxAllocation}
                step="0.1"
                value={formData.allocation_percent}
                onChange={(e) => handleInputChange('allocation_percent', parseFloat(e.target.value) || 0)}
                placeholder="0.0"
                className={errors.allocation_percent ? 'border-red-500' : ''}
              />
              {errors.allocation_percent && <p className="text-sm text-red-500">{errors.allocation_percent}</p>}
            </div>
          </div>

          <div className="flex gap-2 pt-4">
            <Button type="submit" disabled={isLoading}>
              {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {beneficiary ? 'Atualizar' : 'Adicionar'}
            </Button>
            <Button type="button" variant="outline" onClick={onCancel} disabled={isLoading}>
              Cancelar
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};
