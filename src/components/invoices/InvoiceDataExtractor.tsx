
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { InvoiceExtractedData } from "@/types/invoice";
import { Edit2, Save, X } from "lucide-react";

interface InvoiceDataExtractorProps {
  extractedData: InvoiceExtractedData;
  onSave: (data: InvoiceExtractedData) => void;
  readonly?: boolean;
}

export function InvoiceDataExtractor({ 
  extractedData, 
  onSave, 
  readonly = false 
}: InvoiceDataExtractorProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editedData, setEditedData] = useState<InvoiceExtractedData>(extractedData);

  const handleSave = () => {
    onSave(editedData);
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditedData(extractedData);
    setIsEditing(false);
  };

  const getConfidenceColor = (score?: number) => {
    if (!score) return 'bg-gray-100 text-gray-800';
    if (score >= 0.9) return 'bg-green-100 text-green-800';
    if (score >= 0.7) return 'bg-yellow-100 text-yellow-800';
    return 'bg-red-100 text-red-800';
  };

  const fields = [
    { key: 'uc_code', label: 'Código UC', type: 'text' },
    { key: 'reference_month', label: 'Mês Referência', type: 'text' },
    { key: 'energy_kwh', label: 'Energia (kWh)', type: 'number' },
    { key: 'demand_kw', label: 'Demanda (kW)', type: 'number' },
    { key: 'total_r$', label: 'Valor Total (R$)', type: 'number' },
    { key: 'taxes_r$', label: 'Tributos (R$)', type: 'number' },
    { key: 'subgrupo_tensao', label: 'Subgrupo Tensão', type: 'text' },
    { key: 'icms_valor', label: 'ICMS (R$)', type: 'number' },
    { key: 'icms_aliquota', label: 'ICMS Alíquota (%)', type: 'number' },
    { key: 'bandeira_tipo', label: 'Bandeira Tipo', type: 'text' },
    { key: 'bandeira_valor', label: 'Bandeira Valor (R$)', type: 'number' },
  ];

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            Dados Extraídos
            {extractedData.confidence_score && (
              <Badge className={getConfidenceColor(extractedData.confidence_score)}>
                {(extractedData.confidence_score * 100).toFixed(1)}% confiança
              </Badge>
            )}
            {extractedData.extraction_method && (
              <Badge variant="outline">
                {extractedData.extraction_method.toUpperCase()}
              </Badge>
            )}
          </CardTitle>
          
          {!readonly && (
            <div className="flex gap-2">
              {isEditing ? (
                <>
                  <Button size="sm" onClick={handleSave}>
                    <Save className="w-4 h-4 mr-1" />
                    Salvar
                  </Button>
                  <Button size="sm" variant="outline" onClick={handleCancel}>
                    <X className="w-4 h-4 mr-1" />
                    Cancelar
                  </Button>
                </>
              ) : (
                <Button size="sm" variant="outline" onClick={() => setIsEditing(true)}>
                  <Edit2 className="w-4 h-4 mr-1" />
                  Editar
                </Button>
              )}
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {fields.map((field) => {
            const value = extractedData[field.key as keyof InvoiceExtractedData];
            
            return (
              <div key={field.key} className="space-y-1">
                <Label htmlFor={field.key} className="text-sm font-medium">
                  {field.label}
                </Label>
                {isEditing ? (
                  <Input
                    id={field.key}
                    type={field.type}
                    value={editedData[field.key as keyof InvoiceExtractedData] || ''}
                    onChange={(e) => setEditedData(prev => ({
                      ...prev,
                      [field.key]: field.type === 'number' ? Number(e.target.value) : e.target.value
                    }))}
                    className="h-8"
                  />
                ) : (
                  <div className="p-2 bg-gray-50 rounded text-sm min-h-[32px] flex items-center">
                    {value ? String(value) : '-'}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {extractedData.validation_errors && extractedData.validation_errors.length > 0 && (
          <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded">
            <p className="text-sm font-medium text-red-800 mb-2">Erros de Validação:</p>
            <ul className="text-sm text-red-700 space-y-1">
              {extractedData.validation_errors.map((error, index) => (
                <li key={index}>• {error}</li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
