import React from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertTriangle, RefreshCw, CheckCircle, Info, AlertCircle } from 'lucide-react';

export type FeedbackType = 'success' | 'error' | 'warning' | 'info';

interface FeedbackMessageProps {
  type: FeedbackType;
  title: string;
  message: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  onDismiss?: () => void;
  className?: string;
}

const FeedbackIcons = {
  success: CheckCircle,
  error: AlertTriangle,
  warning: AlertCircle,
  info: Info
};

const FeedbackColors = {
  success: 'text-green-600 dark:text-green-400',
  error: 'text-red-600 dark:text-red-400',
  warning: 'text-yellow-600 dark:text-yellow-400',
  info: 'text-blue-600 dark:text-blue-400'
};

export const FeedbackMessage = ({ 
  type, 
  title, 
  message, 
  action, 
  onDismiss,
  className = '' 
}: FeedbackMessageProps) => {
  const Icon = FeedbackIcons[type];
  const iconColor = FeedbackColors[type];

  return (
    <Alert className={`border-l-4 ${className}`} variant={type === 'error' ? 'destructive' : 'default'}>
      <Icon className={`h-4 w-4 ${iconColor}`} />
      <div className="flex-1">
        <AlertDescription>
          <div className="font-medium mb-1">{title}</div>
          <div className="text-sm">{message}</div>
          {action && (
            <Button 
              size="sm" 
              variant="outline" 
              onClick={action.onClick}
              className="mt-2"
            >
              {action.label}
            </Button>
          )}
        </AlertDescription>
      </div>
      {onDismiss && (
        <Button size="sm" variant="ghost" onClick={onDismiss}>
          ×
        </Button>
      )}
    </Alert>
  );
};

// Estados de operação específicos
interface OperationStateProps {
  state: 'idle' | 'loading' | 'success' | 'error';
  title: string;
  loadingMessage?: string;
  successMessage?: string;
  errorMessage?: string;
  onRetry?: () => void;
  className?: string;
}

export const OperationState = ({
  state,
  title,
  loadingMessage = 'Processando...',
  successMessage = 'Operação concluída com sucesso',
  errorMessage = 'Ocorreu um erro',
  onRetry,
  className = ''
}: OperationStateProps) => {
  if (state === 'idle') return null;

  if (state === 'loading') {
    return (
      <Card className={className}>
        <CardContent className="flex items-center gap-3 p-4">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
          <div>
            <div className="font-medium">{title}</div>
            <div className="text-sm text-muted-foreground">{loadingMessage}</div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (state === 'success') {
    return (
      <FeedbackMessage
        type="success"
        title={title}
        message={successMessage}
        className={className}
      />
    );
  }

  if (state === 'error') {
    return (
      <FeedbackMessage
        type="error"
        title={title}
        message={errorMessage}
        action={onRetry ? { label: 'Tentar Novamente', onClick: onRetry } : undefined}
        className={className}
      />
    );
  }

  return null;
};