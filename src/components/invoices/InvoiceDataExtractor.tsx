
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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

  const basicFields = [
    { key: 'uc_code', label: 'Código UC', type: 'text' },
    { key: 'reference_month', label: 'Mês Referência', type: 'text' },
    { key: 'energy_kwh', label: 'Energia (kWh)', type: 'number' },
    { key: 'demand_kw', label: 'Demanda (kW)', type: 'number' },
    { key: 'total_r$', label: 'Valor Total (R$)', type: 'number' },
    { key: 'taxes_r$', label: 'Tributos (R$)', type: 'number' },
  ];

  const consumptionFields = [
    { key: 'subgrupo_tensao', label: 'Subgrupo Tensão', type: 'text' },
    { key: 'consumo_fp_te_kwh', label: 'Consumo FP TE (kWh)', type: 'number' },
    { key: 'consumo_p_te_kwh', label: 'Consumo P TE (kWh)', type: 'number' },
    { key: 'demanda_tusd_kw', label: 'Demanda TUSD (kW)', type: 'number' },
    { key: 'demanda_te_kw', label: 'Demanda TE (kW)', type: 'number' },
    { key: 'classe_subclasse', label: 'Classe/Subclasse', type: 'text' },
    { key: 'modalidade_tarifaria', label: 'Modalidade Tarifária', type: 'text' },
    { key: 'fator_potencia', label: 'Fator de Potência', type: 'number' },
  ];

  const taxFields = [
    { key: 'icms_valor', label: 'ICMS Valor (R$)', type: 'number' },
    { key: 'icms_aliquota', label: 'ICMS Alíquota (%)', type: 'number' },
    { key: 'pis_valor', label: 'PIS Valor (R$)', type: 'number' },
    { key: 'pis_aliquota', label: 'PIS Alíquota (%)', type: 'number' },
    { key: 'cofins_valor', label: 'COFINS Valor (R$)', type: 'number' },
    { key: 'cofins_aliquota', label: 'COFINS Alíquota (%)', type: 'number' },
    { key: 'contrib_ilum_publica', label: 'Contrib. Ilum. Pública (R$)', type: 'number' },
    { key: 'issqn_valor', label: 'ISSQN (R$)', type: 'number' },
    { key: 'outras_taxas', label: 'Outras Taxas (R$)', type: 'number' },
  ];

  const tariffFields = [
    { key: 'bandeira_tipo', label: 'Bandeira Tipo', type: 'text' },
    { key: 'bandeira_valor', label: 'Bandeira Valor (R$)', type: 'number' },
    { key: 'tarifa_te_tusd', label: 'Tarifa TE TUSD', type: 'number' },
    { key: 'tarifa_te_te', label: 'Tarifa TE TE', type: 'number' },
    { key: 'tarifa_demanda_tusd', label: 'Tarifa Demanda TUSD', type: 'number' },
    { key: 'tarifa_demanda_te', label: 'Tarifa Demanda TE', type: 'number' },
  ];

  const compensationFields = [
    { key: 'energia_injetada_kwh', label: 'Energia Injetada (kWh)', type: 'number' },
    { key: 'energia_compensada_kwh', label: 'Energia Compensada (kWh)', type: 'number' },
    { key: 'saldo_creditos_kwh', label: 'Saldo de Créditos (kWh)', type: 'number' },
    { key: 'valor_tusd', label: 'Valor TUSD (R$)', type: 'number' },
    { key: 'valor_te', label: 'Valor TE (R$)', type: 'number' },
    { key: 'valor_demanda_tusd', label: 'Valor Demanda TUSD (R$)', type: 'number' },
    { key: 'valor_demanda_te', label: 'Valor Demanda TE (R$)', type: 'number' },
  ];

  const readingFields = [
    { key: 'data_leitura', label: 'Data Leitura', type: 'date' },
    { key: 'data_emissao', label: 'Data Emissão', type: 'date' },
    { key: 'data_vencimento', label: 'Data Vencimento', type: 'date' },
    { key: 'leitura_atual', label: 'Leitura Atual', type: 'number' },
    { key: 'leitura_anterior', label: 'Leitura Anterior', type: 'number' },
    { key: 'multiplicador', label: 'Multiplicador', type: 'number' },
    { key: 'dias_faturamento', label: 'Dias de Faturamento', type: 'number' },
  ];

  const renderFieldGroup = (fields: any[], title: string) => (
    <div className="space-y-4">
      <h4 className="font-semibold text-lg text-gray-900">{title}</h4>
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
                  value={String(editedData[field.key as keyof InvoiceExtractedData] || '')}
                  onChange={(e) => setEditedData(prev => ({
                    ...prev,
                    [field.key]: field.type === 'number' ? Number(e.target.value) : e.target.value
                  }))}
                  className="h-8"
                />
              ) : (
                <div className="p-2 bg-gray-50 rounded text-sm min-h-[32px] flex items-center">
                  {value ? (field.type === 'number' ? Number(value).toLocaleString('pt-BR') : String(value)) : '-'}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );

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
            {extractedData.processing_time_ms && (
              <Badge variant="secondary">
                {extractedData.processing_time_ms}ms
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
        <Tabs defaultValue="basic" className="space-y-4">
          <TabsList className="grid w-full grid-cols-6">
            <TabsTrigger value="basic">Básico</TabsTrigger>
            <TabsTrigger value="consumption">Consumo</TabsTrigger>
            <TabsTrigger value="taxes">Tributos</TabsTrigger>
            <TabsTrigger value="tariffs">Tarifas</TabsTrigger>
            <TabsTrigger value="compensation">Compensação</TabsTrigger>
            <TabsTrigger value="readings">Leituras</TabsTrigger>
          </TabsList>

          <TabsContent value="basic">
            {renderFieldGroup(basicFields, "Informações Básicas")}
          </TabsContent>

          <TabsContent value="consumption">
            {renderFieldGroup(consumptionFields, "Dados de Consumo")}
          </TabsContent>

          <TabsContent value="taxes">
            {renderFieldGroup(taxFields, "Tributos e Taxas")}
          </TabsContent>

          <TabsContent value="tariffs">
            {renderFieldGroup(tariffFields, "Tarifas Aplicadas")}
          </TabsContent>

          <TabsContent value="compensation">
            {renderFieldGroup(compensationFields, "Compensação Energética")}
          </TabsContent>

          <TabsContent value="readings">
            {renderFieldGroup(readingFields, "Leituras e Datas")}
          </TabsContent>
        </Tabs>

        {extractedData.validation_errors && extractedData.validation_errors.length > 0 && (
          <div className="mt-6 p-3 bg-red-50 border border-red-200 rounded">
            <p className="text-sm font-medium text-red-800 mb-2">Erros de Validação:</p>
            <ul className="text-sm text-red-700 space-y-1">
              {extractedData.validation_errors.map((error, index) => (
                <li key={index}>• {error}</li>
              ))}
            </ul>
          </div>
        )}

        {extractedData.observacoes && (
          <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded">
            <p className="text-sm font-medium text-blue-800 mb-1">Observações:</p>
            <p className="text-sm text-blue-700">{extractedData.observacoes}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
