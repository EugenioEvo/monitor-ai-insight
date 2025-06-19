
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

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
    defaultCurrency: string;
  };
  invoices: {
    ocrEngine: string;
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
    alertSeverity: string;
  };
  reports: {
    autoGeneration: boolean;
    reportFrequency: string;
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
    theme: string;
    language: string;
    timezone: string;
    companyName: string;
  };
}

const DEFAULT_SETTINGS: AppSettings = {
  plants: {
    autoDiscovery: true,
    monitoringInterval: 5,
    alertThreshold: 80,
    enableNotifications: true
  },
  customers: {
    autoGenerateReports: true,
    emailNotifications: true,
    invoiceReminders: true,
    defaultCurrency: 'BRL'
  },
  invoices: {
    ocrEngine: 'openai',
    autoValidation: true,
    duplicateDetection: true,
    storageRetention: 365
  },
  maintenance: {
    preventiveMaintenance: true,
    maintenanceInterval: 30,
    alertsEnabled: true,
    autoScheduling: false
  },
  alerts: {
    emailAlerts: true,
    smsAlerts: false,
    pushNotifications: true,
    alertSeverity: 'medium'
  },
  reports: {
    autoGeneration: true,
    reportFrequency: 'weekly',
    includeCharts: true,
    emailDelivery: true
  },
  ai: {
    chatEnabled: true,
    autoResponses: true,
    learningMode: true,
    dataCollection: true
  },
  general: {
    theme: 'light',
    language: 'pt-BR',
    timezone: 'America/Sao_Paulo',
    companyName: 'Monitor.ai'
  }
};

export const useSettings = () => {
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  const loadSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('app_config')
        .select('key, value');

      if (error) {
        console.error('Error loading settings:', error);
        return;
      }

      if (data) {
        const loadedSettings = { ...DEFAULT_SETTINGS };
        
        data.forEach(({ key, value }) => {
          const keys = key.split('.');
          if (keys.length === 2) {
            const [section, setting] = keys;
            if (loadedSettings[section as keyof AppSettings]) {
              try {
                const parsedValue = JSON.parse(value);
                (loadedSettings[section as keyof AppSettings] as any)[setting] = parsedValue;
              } catch {
                (loadedSettings[section as keyof AppSettings] as any)[setting] = value;
              }
            }
          }
        });

        setSettings(loadedSettings);
      }
    } catch (error) {
      console.error('Error loading settings:', error);
      toast({
        title: "Erro ao carregar configurações",
        description: "Usando configurações padrão.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const saveSettings = async (newSettings: AppSettings) => {
    setSaving(true);
    try {
      console.log('Saving settings:', newSettings);
      
      const configEntries: { key: string; value: string }[] = [];
      
      Object.entries(newSettings).forEach(([section, sectionSettings]) => {
        Object.entries(sectionSettings).forEach(([setting, value]) => {
          configEntries.push({
            key: `${section}.${setting}`,
            value: typeof value === 'string' ? value : JSON.stringify(value)
          });
        });
      });

      // Upsert all settings
      for (const entry of configEntries) {
        const { error } = await supabase
          .from('app_config')
          .upsert(entry, { onConflict: 'key' });

        if (error) {
          throw error;
        }
      }

      setSettings(newSettings);
      
      toast({
        title: "Configurações salvas",
        description: "Todas as configurações foram atualizadas com sucesso.",
      });
    } catch (error) {
      console.error('Error saving settings:', error);
      toast({
        title: "Erro ao salvar",
        description: "Ocorreu um erro ao salvar as configurações.",
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  };

  const updateSetting = (section: keyof AppSettings, key: string, value: any) => {
    setSettings(prev => ({
      ...prev,
      [section]: {
        ...prev[section],
        [key]: value
      }
    }));
  };

  useEffect(() => {
    loadSettings();
  }, []);

  return {
    settings,
    loading,
    saving,
    updateSetting,
    saveSettings,
    loadSettings
  };
};
