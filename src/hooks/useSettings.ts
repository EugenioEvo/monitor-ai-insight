
import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useDebounce } from '@/hooks/useDebounce';
import { AppSettings, validateSettings } from '@/types/settings';

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
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  // Debounce settings para evitar saves excessivos
  const debouncedSettings = useDebounce(settings, 1000);

  const loadSettings = useCallback(async (retryCount = 0) => {
    try {
      setLoading(true);
      setError(null);
      
      const { data, error } = await supabase
        .from('app_config')
        .select('key, value');

      if (error) {
        throw error;
      }

      if (data && data.length > 0) {
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
      setError(error.message || 'Erro ao carregar configurações');
      
      // Retry logic para falhas de rede
      if (retryCount < 2) {
        setTimeout(() => loadSettings(retryCount + 1), 1000 * (retryCount + 1));
      } else {
        toast({
          title: "Erro ao carregar configurações",
          description: "Usando configurações padrão. Tente novamente em alguns minutos.",
          variant: "destructive"
        });
      }
    } finally {
      setLoading(false);
    }
  }, [toast]);

  const saveSettings = useCallback(async (newSettings: AppSettings, retryCount = 0) => {
    const validation = validateSettings(newSettings);
    
    if (!validation.isValid) {
      toast({
        title: "Configurações inválidas",
        description: validation.errors.join(', '),
        variant: "destructive"
      });
      return false;
    }

    setSaving(true);
    setError(null);
    
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

      // Usar upsert para cada entrada de configuração com melhor tratamento de erro
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

      return true;
    } catch (error) {
      console.error('Error saving settings:', error);
      setError(error.message || 'Erro ao salvar configurações');
      
      // Retry logic para falhas de salvamento
      if (retryCount < 2) {
        setTimeout(() => saveSettings(newSettings, retryCount + 1), 1000 * (retryCount + 1));
      } else {
        toast({
          title: "Erro ao salvar",
          description: "Ocorreu um erro ao salvar as configurações. Tente novamente.",
          variant: "destructive"
        });
      }
      
      return false;
    } finally {
      setSaving(false);
    }
  }, [toast]);

  const updateSetting = useCallback((section: keyof AppSettings, key: string, value: any) => {
    setSettings(prev => ({
      ...prev,
      [section]: {
        ...prev[section],
        [key]: value
      }
    }));
  }, []);

  // Auto-save com debounce
  useEffect(() => {
    if (!loading && debouncedSettings !== DEFAULT_SETTINGS) {
      const isEqual = JSON.stringify(settings) === JSON.stringify(debouncedSettings);
      if (!isEqual) {
        saveSettings(debouncedSettings);
      }
    }
  }, [debouncedSettings, loading, saveSettings, settings]);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  // Memoizar o retorno para evitar re-renders desnecessários
  return useMemo(() => ({
    settings,
    loading,
    saving,
    error,
    updateSetting,
    saveSettings,
    loadSettings
  }), [settings, loading, saving, error, updateSetting, saveSettings, loadSettings]);
};
