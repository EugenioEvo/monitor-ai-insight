
import { useState, useEffect } from "react";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, AlertCircle, Clock, Eye } from "lucide-react";
import { InvoiceProcessingStatus } from "@/types/invoice";

interface InvoiceProcessingStatusProps {
  processingStatus: InvoiceProcessingStatus[];
}

const statusColors = {
  uploaded: 'bg-blue-100 text-blue-800',
  processing: 'bg-yellow-100 text-yellow-800',
  extracted: 'bg-purple-100 text-purple-800', 
  validated: 'bg-green-100 text-green-800',
  reviewed: 'bg-indigo-100 text-indigo-800',
  completed: 'bg-green-100 text-green-800',
  error: 'bg-red-100 text-red-800'
};

const statusIcons = {
  uploaded: Clock,
  processing: Clock,
  extracted: CheckCircle,
  validated: CheckCircle,
  reviewed: Eye,
  completed: CheckCircle,
  error: AlertCircle
};

const statusLabels = {
  uploaded: 'Carregado',
  processing: 'Processando',
  extracted: 'Extraído',
  validated: 'Validado',
  reviewed: 'Revisado',
  completed: 'Concluído',
  error: 'Erro'
};

export function InvoiceProcessingStatus({ processingStatus }: InvoiceProcessingStatusProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Status de Processamento</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {processingStatus.map((status) => {
          const StatusIcon = statusIcons[status.status];
          
          return (
            <div key={status.id} className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <StatusIcon className="w-4 h-4" />
                  <span className="font-medium">Fatura {status.id.slice(0, 8)}</span>
                  <Badge className={statusColors[status.status]}>
                    {statusLabels[status.status]}
                  </Badge>
                  {status.requires_review && (
                    <Badge variant="outline" className="text-orange-600 border-orange-600">
                      Revisão Necessária
                    </Badge>
                  )}
                </div>
                {status.confidence_score && (
                  <span className="text-sm text-gray-600">
                    Confiança: {(status.confidence_score * 100).toFixed(1)}%
                  </span>
                )}
              </div>
              
              <Progress value={status.progress} className="h-2" />
              
              {status.current_step && (
                <p className="text-sm text-gray-600">{status.current_step}</p>
              )}
              
              {status.error_message && (
                <p className="text-sm text-red-600">{status.error_message}</p>
              )}
              
              {status.processing_time_ms && (
                <p className="text-xs text-gray-500">
                  Processado em {status.processing_time_ms}ms
                </p>
              )}
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
