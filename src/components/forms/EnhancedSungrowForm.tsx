import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { SungrowConfigSchema, type SungrowConfigType } from '@/schemas/validation';
import { OperationState } from '@/components/ui/feedback';
import { useLogger } from '@/services/logger';
import { useErrorHandler } from '@/services/errorHandler';

interface EnhancedSungrowFormProps {
  initialData?: Partial<SungrowConfigType>;
  onSubmit: (data: SungrowConfigType) => Promise<void>;
  onTestConnection?: (data: SungrowConfigType) => Promise<boolean>;
  title?: string;
}

export const EnhancedSungrowForm = ({
  initialData = {},
  onSubmit,
  onTestConnection,
  title = "Configuração Sungrow"
}: EnhancedSungrowFormProps) => {
  const logger = useLogger('EnhancedSungrowForm');
  const errorHandler = useErrorHandler('EnhancedSungrowForm');
  
  const [operationState, setOperationState] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [testState, setTestState] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');

  const form = useForm<SungrowConfigType>({
    resolver: zodResolver(SungrowConfigSchema),
    defaultValues: {
      username: '',
      password: '',
      appkey: '',
      accessKey: '',
      baseUrl: 'https://gateway.isolarcloud.com.hk',
      ...initialData
    }
  });

  const handleSubmit = async (data: SungrowConfigType) => {
    setOperationState('loading');
    logger.info('Submitting Sungrow configuration', { action: 'form_submit' });

    try {
      await onSubmit(data);
      setOperationState('success');
      logger.info('Configuration submitted successfully');
    } catch (error) {
      setOperationState('error');
      errorHandler.handleError(error as Error, 'form_submit');
    }
  };

  const handleTestConnection = async () => {
    if (!onTestConnection) return;

    const data = form.getValues();
    const validation = SungrowConfigSchema.safeParse(data);
    
    if (!validation.success) {
      form.trigger(); // Trigger validation display
      return;
    }

    setTestState('loading');
    logger.info('Testing Sungrow connection', { action: 'test_connection' });

    try {
      const success = await onTestConnection(validation.data);
      setTestState(success ? 'success' : 'error');
    } catch (error) {
      setTestState('error');
      errorHandler.handleError(error as Error, 'test_connection');
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="username"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Usuário</FormLabel>
                    <FormControl>
                      <Input placeholder="Usuário do iSolarCloud" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Senha</FormLabel>
                    <FormControl>
                      <Input type="password" placeholder="Senha do portal" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="appkey"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>App Key</FormLabel>
                    <FormControl>
                      <Input placeholder="Chave da aplicação" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="accessKey"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Access Key</FormLabel>
                    <FormControl>
                      <Input type="password" placeholder="Chave de acesso" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="baseUrl"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Base URL (Opcional)</FormLabel>
                  <FormControl>
                    <Input placeholder="https://gateway.isolarcloud.com.hk" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <OperationState
              state={operationState}
              title="Salvando Configuração"
              loadingMessage="Validando e salvando dados..."
              successMessage="Configuração salva com sucesso!"
              errorMessage="Erro ao salvar configuração"
              onRetry={() => form.handleSubmit(handleSubmit)()}
            />

            <div className="flex gap-2 pt-4">
              {onTestConnection && (
                <Button 
                  type="button"
                  variant="outline" 
                  onClick={handleTestConnection}
                  disabled={testState === 'loading'}
                >
                  Testar Conexão
                </Button>
              )}
              
              <Button 
                type="submit" 
                disabled={operationState === 'loading'}
                className="flex-1"
              >
                Salvar Configuração
              </Button>
            </div>

            <OperationState
              state={testState}
              title="Teste de Conexão"
              loadingMessage="Verificando credenciais..."
              successMessage="Conexão estabelecida com sucesso!"
              errorMessage="Falha na conexão"
              onRetry={handleTestConnection}
            />
          </form>
        </Form>
      </CardContent>
    </Card>
  );
};