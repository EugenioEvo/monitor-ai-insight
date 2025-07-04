import { AlertCircle, CheckCircle, Info } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import type { Plant } from '@/types';
import type { SolarEdgeConfig } from '@/types/monitoring';
import type { SungrowConfig } from '@/types/sungrow';

interface PlantConfigurationValidatorProps {
  plant: Plant;
}

export const PlantConfigurationValidator = ({ plant }: PlantConfigurationValidatorProps) => {
  const validateSungrowConfig = (config: SungrowConfig) => {
    const issues: string[] = [];
    const warnings: string[] = [];
    
    if (!config.username) issues.push('Username não configurado');
    if (!config.password) issues.push('Password não configurado');
    if (!config.appkey) issues.push('App Key não configurado');
    if (!config.accessKey) issues.push('Access Key não configurado');
    
    if (!config.plantId && !plant.api_site_id) {
      issues.push('Plant ID não configurado');
    }
    
    if (!config.plantId && plant.api_site_id) {
      warnings.push('Plant ID será usado do api_site_id');
    }
    
    return { issues, warnings };
  };
  
  const validateSolarEdgeConfig = (config: SolarEdgeConfig) => {
    const issues: string[] = [];
    const warnings: string[] = [];
    
    if (!config.apiKey) issues.push('API Key não configurado');
    if (!config.siteId && !plant.api_site_id) {
      issues.push('Site ID não configurado');
    }
    
    if (!config.siteId && plant.api_site_id) {
      warnings.push('Site ID será usado do api_site_id');
    }
    
    return { issues, warnings };
  };
  
  if (plant.monitoring_system === 'manual') {
    return (
      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          Sistema manual configurado. Nenhuma validação automática necessária.
        </AlertDescription>
      </Alert>
    );
  }
  
  if (!plant.api_credentials) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          Credenciais da API não configuradas. Configure as credenciais para habilitar o monitoramento automático.
        </AlertDescription>
      </Alert>
    );
  }
  
  let validation = { issues: [] as string[], warnings: [] as string[] };
  
  if (plant.monitoring_system === 'sungrow') {
    validation = validateSungrowConfig(plant.api_credentials as SungrowConfig);
  } else if (plant.monitoring_system === 'solaredge') {
    validation = validateSolarEdgeConfig(plant.api_credentials as SolarEdgeConfig);
  }
  
  if (validation.issues.length === 0 && validation.warnings.length === 0) {
    return (
      <Alert className="border-green-200 bg-green-50">
        <CheckCircle className="h-4 w-4 text-green-600" />
        <AlertDescription className="text-green-800">
          Configuração válida! Monitoramento automático está funcionando.
          {plant.last_sync && (
            <div className="mt-2">
              <Badge variant="outline" className="text-green-700">
                Última sincronização: {new Date(plant.last_sync).toLocaleString('pt-BR')}
              </Badge>
            </div>
          )}
        </AlertDescription>
      </Alert>
    );
  }
  
  return (
    <div className="space-y-2">
      {validation.issues.length > 0 && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            <strong>Problemas encontrados:</strong>
            <ul className="mt-2 list-disc list-inside">
              {validation.issues.map((issue, index) => (
                <li key={index}>{issue}</li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}
      
      {validation.warnings.length > 0 && (
        <Alert className="border-yellow-200 bg-yellow-50">
          <Info className="h-4 w-4 text-yellow-600" />
          <AlertDescription className="text-yellow-800">
            <strong>Avisos:</strong>
            <ul className="mt-2 list-disc list-inside">
              {validation.warnings.map((warning, index) => (
                <li key={index}>{warning}</li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
};