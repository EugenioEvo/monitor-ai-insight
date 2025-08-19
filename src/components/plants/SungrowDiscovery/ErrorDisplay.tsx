import React from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { XCircle, RefreshCw, AlertCircle } from 'lucide-react';

interface ErrorDisplayProps {
  error: string | null;
  errorCooldown: boolean;
  onReset: () => void;
}

export const ErrorDisplay: React.FC<ErrorDisplayProps> = ({
  error,
  errorCooldown,
  onReset
}) => {
  if (errorCooldown) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          Muitas tentativas falharam. Aguarde 30 segundos antes de tentar novamente ou verifique suas credenciais.
        </AlertDescription>
      </Alert>
    );
  }

  if (!error) return null;

  return (
    <Alert variant="destructive">
      <XCircle className="h-4 w-4" />
      <AlertDescription className="flex items-center justify-between">
        <span>{error}</span>
        <Button size="sm" variant="outline" onClick={onReset}>
          <RefreshCw className="w-3 h-3 mr-1" />
          Limpar
        </Button>
      </AlertDescription>
    </Alert>
  );
};