
import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Edit, Trash2, Users, Building, Hash } from 'lucide-react';

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

interface BeneficiaryListProps {
  beneficiaries: Beneficiary[];
  onEdit: (beneficiary: Beneficiary) => void;
  onDelete: (id: string) => void;
  isDeleting: boolean;
}

export const BeneficiaryList = ({ beneficiaries, onEdit, onDelete, isDeleting }: BeneficiaryListProps) => {
  const formatCNPJ = (cnpj: string) => {
    const cleaned = cnpj.replace(/\D/g, '');
    if (cleaned.length === 14) {
      return cleaned.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
    }
    if (cleaned.length === 11) {
      return cleaned.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
    }
    return cnpj;
  };

  if (beneficiaries.length === 0) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center h-32">
          <div className="text-center text-muted-foreground">
            <Users className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>Nenhum beneficiário cadastrado</p>
            <p className="text-sm mt-1">Adicione beneficiários para distribuir a energia da planta</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {beneficiaries.map((beneficiary) => (
        <Card key={beneficiary.id}>
          <CardHeader>
            <div className="flex justify-between items-start">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Building className="w-5 h-5" />
                  {beneficiary.name}
                </CardTitle>
                <CardDescription>
                  Alocação: {beneficiary.allocation_percent}% da energia produzida
                </CardDescription>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onEdit(beneficiary)}
                >
                  <Edit className="w-4 h-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onDelete(beneficiary.id)}
                  disabled={isDeleting}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <div className="flex items-center text-sm text-muted-foreground">
                  <Building className="w-4 h-4 mr-2" />
                  CNPJ/CPF
                </div>
                <div className="font-mono text-sm">{formatCNPJ(beneficiary.cnpj)}</div>
              </div>
              
              <div className="space-y-2">
                <div className="flex items-center text-sm text-muted-foreground">
                  <Hash className="w-4 h-4 mr-2" />
                  Código UC
                </div>
                <div className="font-mono text-sm">{beneficiary.uc_code}</div>
              </div>
              
              <div className="space-y-2">
                <div className="text-sm text-muted-foreground">Porcentagem</div>
                <Badge variant="secondary" className="text-base">
                  {beneficiary.allocation_percent}%
                </Badge>
              </div>
            </div>
            
            <div className="mt-4 pt-4 border-t text-xs text-muted-foreground">
              Cadastrado em: {new Date(beneficiary.created_at).toLocaleDateString('pt-BR')}
              {beneficiary.updated_at !== beneficiary.created_at && (
                <span className="ml-4">
                  Atualizado em: {new Date(beneficiary.updated_at).toLocaleDateString('pt-BR')}
                </span>
              )}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};
