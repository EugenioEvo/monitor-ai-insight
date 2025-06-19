
export interface AppSettings {
  plants: {
    autoDiscovery: boolean;
    monitoringInterval: number;
    alertThreshold: number;
    enableNotifications: boolean;
  };
  customers: {
    autoGenerateReports: boolean;
    emailNotifications: boolean;
    invoiceReminders: boolean;
    defaultCurrency: 'BRL' | 'USD' | 'EUR';
  };
  invoices: {
    ocrEngine: 'openai' | 'google' | 'tesseract';
    autoValidation: boolean;
    duplicateDetection: boolean;
    storageRetention: number;
  };
  maintenance: {
    preventiveMaintenance: boolean;
    maintenanceInterval: number;
    alertsEnabled: boolean;
    autoScheduling: boolean;
  };
  alerts: {
    emailAlerts: boolean;
    smsAlerts: boolean;
    pushNotifications: boolean;
    alertSeverity: 'low' | 'medium' | 'high' | 'critical';
  };
  reports: {
    autoGeneration: boolean;
    reportFrequency: 'daily' | 'weekly' | 'monthly' | 'quarterly';
    includeCharts: boolean;
    emailDelivery: boolean;
  };
  ai: {
    chatEnabled: boolean;
    autoResponses: boolean;
    learningMode: boolean;
    dataCollection: boolean;
  };
  general: {
    theme: 'light' | 'dark' | 'auto';
    language: 'pt-BR' | 'en-US' | 'es-ES';
    timezone: string;
    companyName: string;
  };
}

export interface SettingsValidation {
  isValid: boolean;
  errors: string[];
}

export const validateSettings = (settings: AppSettings): SettingsValidation => {
  const errors: string[] = [];

  // Validar intervalos numéricos
  if (settings.plants.monitoringInterval < 1 || settings.plants.monitoringInterval > 60) {
    errors.push('Intervalo de monitoramento deve estar entre 1 e 60 minutos');
  }

  if (settings.plants.alertThreshold < 0 || settings.plants.alertThreshold > 100) {
    errors.push('Limite de alerta deve estar entre 0 e 100%');
  }

  if (settings.maintenance.maintenanceInterval < 1 || settings.maintenance.maintenanceInterval > 365) {
    errors.push('Intervalo de manutenção deve estar entre 1 e 365 dias');
  }

  if (settings.invoices.storageRetention < 30 || settings.invoices.storageRetention > 3650) {
    errors.push('Retenção de dados deve estar entre 30 e 3650 dias');
  }

  // Validar strings obrigatórias
  if (!settings.general.companyName.trim()) {
    errors.push('Nome da empresa é obrigatório');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};
