
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AlertTriangle, CheckCircle, X, Eye } from "lucide-react";
import { ValidationError } from "@/types/invoice";

interface InvoiceValidationPanelProps {
  validationErrors: ValidationError[];
  onApprove: () => void;
  onReject: () => void;
  onRequestReview: () => void;
}

export function InvoiceValidationPanel({ 
  validationErrors, 
  onApprove, 
  onReject, 
  onRequestReview 
}: InvoiceValidationPanelProps) {
  const [selectedError, setSelectedError] = useState<string | null>(null);

  const errorCount = validationErrors.filter(e => e.severity === 'error').length;
  const warningCount = validationErrors.filter(e => e.severity === 'warning').length;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {errorCount > 0 ? (
            <AlertTriangle className="w-5 h-5 text-red-500" />
          ) : (
            <CheckCircle className="w-5 h-5 text-green-500" />
          )}
          Validação de Dados
          {errorCount > 0 && (
            <Badge variant="destructive">{errorCount} erros</Badge>
          )}
          {warningCount > 0 && (
            <Badge variant="outline" className="text-yellow-600">
              {warningCount} avisos
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {validationErrors.length === 0 ? (
          <div className="text-center py-4">
            <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-2" />
            <p className="text-green-600 font-medium">Todos os dados foram validados com sucesso!</p>
          </div>
        ) : (
          <div className="space-y-2">
            {validationErrors.map((error, index) => (
              <div 
                key={index}
                className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                  selectedError === `${index}` 
                    ? 'border-blue-500 bg-blue-50' 
                    : 'border-gray-200 hover:border-gray-300'
                }`}
                onClick={() => setSelectedError(selectedError === `${index}` ? null : `${index}`)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className={`w-4 h-4 ${
                      error.severity === 'error' ? 'text-red-500' : 'text-yellow-500'
                    }`} />
                    <span className="font-medium">{error.field_name}</span>
                    <Badge variant={error.severity === 'error' ? 'destructive' : 'outline'}>
                      {error.severity === 'error' ? 'Erro' : 'Aviso'}
                    </Badge>
                  </div>
                </div>
                
                <p className="text-sm text-gray-600 mt-1">{error.message}</p>
                
                {selectedError === `${index}` && error.suggested_fix && (
                  <div className="mt-2 p-2 bg-blue-50 border border-blue-200 rounded">
                    <p className="text-sm text-blue-800">
                      <strong>Sugestão:</strong> {error.suggested_fix}
                    </p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        <div className="flex gap-2 pt-4 border-t">
          {errorCount === 0 && (
            <Button onClick={onApprove} className="flex-1">
              <CheckCircle className="w-4 h-4 mr-2" />
              Aprovar Extração
            </Button>
          )}
          
          {errorCount > 0 && (
            <>
              <Button variant="outline" onClick={onRequestReview} className="flex-1">
                <Eye className="w-4 h-4 mr-2" />
                Solicitar Revisão
              </Button>
              <Button variant="destructive" onClick={onReject}>
                <X className="w-4 h-4 mr-2" />
                Rejeitar
              </Button>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
