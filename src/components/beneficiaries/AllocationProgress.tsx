
import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Users, Percent, AlertTriangle } from 'lucide-react';

interface AllocationProgressProps {
  totalAllocation: number;
  beneficiariesCount: number;
}

export const AllocationProgress = ({ totalAllocation, beneficiariesCount }: AllocationProgressProps) => {
  const remainingAllocation = 100 - totalAllocation;
  const isOverAllocated = totalAllocation > 100;
  const isFullyAllocated = totalAllocation === 100;

  const getStatusColor = () => {
    if (isOverAllocated) return 'text-red-600';
    if (isFullyAllocated) return 'text-green-600';
    return 'text-blue-600';
  };

  const getStatusBadge = () => {
    if (isOverAllocated) {
      return <Badge variant="destructive">Sobre-alocado</Badge>;
    }
    if (isFullyAllocated) {
      return <Badge variant="default">Totalmente Alocado</Badge>;
    }
    return <Badge variant="secondary">Parcialmente Alocado</Badge>;
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Percent className="w-5 h-5" />
              Distribuição de Energia
            </CardTitle>
            <CardDescription>
              Status da alocação entre beneficiários
            </CardDescription>
          </div>
          {getStatusBadge()}
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {/* Progress Bar */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Energia Alocada</span>
              <span className={`font-medium ${getStatusColor()}`}>
                {totalAllocation.toFixed(1)}% / 100%
              </span>
            </div>
            <Progress 
              value={Math.min(totalAllocation, 100)} 
              className="h-3"
            />
            {isOverAllocated && (
              <div className="flex items-center gap-1 text-sm text-red-600">
                <AlertTriangle className="w-4 h-4" />
                Excesso de {(totalAllocation - 100).toFixed(1)}%
              </div>
            )}
          </div>

          {/* Statistics */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center p-4 bg-muted/50 rounded-lg">
              <div className="flex items-center justify-center gap-2 mb-2">
                <Users className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Beneficiários</span>
              </div>
              <div className="text-2xl font-bold">{beneficiariesCount}</div>
            </div>

            <div className="text-center p-4 bg-muted/50 rounded-lg">
              <div className="flex items-center justify-center gap-2 mb-2">
                <Percent className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Alocado</span>
              </div>
              <div className={`text-2xl font-bold ${getStatusColor()}`}>
                {totalAllocation.toFixed(1)}%
              </div>
            </div>

            <div className="text-center p-4 bg-muted/50 rounded-lg">
              <div className="flex items-center justify-center gap-2 mb-2">
                <Percent className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Disponível</span>
              </div>
              <div className={`text-2xl font-bold ${remainingAllocation >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {remainingAllocation.toFixed(1)}%
              </div>
            </div>
          </div>

          {/* Recommendations */}
          {isOverAllocated && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-start gap-2">
                <AlertTriangle className="w-5 h-5 text-red-600 mt-0.5" />
                <div>
                  <h4 className="font-medium text-red-800">Atenção: Sobre-alocação</h4>
                  <p className="text-sm text-red-700 mt-1">
                    A soma das porcentagens excede 100%. Ajuste as alocações dos beneficiários.
                  </p>
                </div>
              </div>
            </div>
          )}

          {beneficiariesCount === 0 && (
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="text-center">
                <Users className="w-8 h-8 text-blue-600 mx-auto mb-2" />
                <h4 className="font-medium text-blue-800">Nenhum beneficiário cadastrado</h4>
                <p className="text-sm text-blue-700 mt-1">
                  Adicione beneficiários para distribuir a energia produzida pela planta.
                </p>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
