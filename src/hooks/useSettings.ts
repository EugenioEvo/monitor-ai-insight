
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import type { AppSettings } from '@/types/settings';

const defaultSettings: AppSettings = {
  plants: {
    autoSync: true,
    syncInterval: 15,
    alertThreshold: 80,
    maintenanceReminder: true
  },
  customers: {
    autoCreateUnits: true,
    requireDocument: true,
    defaultCurrency: 'BRL'
  },
  invoices: {
    ocrEngine: 'openai',
    autoValidation: true,
    confidenceThreshold: 0.8,
    fallbackEnabled: true
  },
  maintenance: {
    scheduleEnabled: true,
    reminderDays: 7,
    criticalAlerts: true
  },
  alerts: {
    emailEnabled: true,
    smsEnabled: false,
    alertSeverity: 'medium',
    retention: 90
  },
  reports: {
    autoGenerate: true,
    reportFrequency: 'monthly',
    includeCharts: true
  },
  ai: {
    chatEnabled: true,
    autoRespond: false,
    learningMode: true
  },
  general: {
    theme: 'auto',
    language: 'pt-BR',
    timezone: 'America/Sao_Paulo'
  }
};

export const useSettings = () => {
  const [settings, setSettings] = useState<AppSettings>(defaultSettings);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  const fetchSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('app_config')
        .select('key, value');

      if (error) {
        console.error('Error fetching settings:', error);
        // Use default settings if fetch fails
        setSettings(defaultSettings);
        return;
      }

      const configMap: Record<string, any> = {};
      data?.forEach(({ key, value }) => {
        try {
          configMap[key] = JSON.parse(value);
        } catch {
          configMap[key] = value;
        }
      });

      const loadedSettings = { ...defaultSettings };
      
      // Map config to settings structure
      Object.keys(loadedSettings).forEach(section => {
        Object.keys(loadedSettings[section as keyof AppSettings]).forEach(key => {
          const configKey = `${section}.${key}`;
          if (configMap[configKey] !== undefined) {
            (loadedSettings[section as keyof AppSettings] as any)[key] = configMap[configKey];
          }
        });
      });

      setSettings(loadedSettings);
    } catch (error) {
      console.error('Error in fetchSettings:', error);
      setSettings(defaultSettings);
      toast({
        title: 'Erro ao carregar configurações',
        description: 'Usando configurações padrão.',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
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

  const saveSettings = async (settingsToSave: AppSettings) => {
    setSaving(true);
    try {
      // Convert settings to flat config structure
      const configUpdates = [];
      
      Object.entries(settingsToSave).forEach(([section, sectionSettings]) => {
        Object.entries(sectionSettings).forEach(([key, value]) => {
          configUpdates.push({
            key: `${section}.${key}`,
            value: typeof value === 'object' ? JSON.stringify(value) : String(value)
          });
        });
      });

      // Batch upsert all settings
      const { error } = await supabase
        .from('app_config')
        .upsert(configUpdates, { onConflict: 'key' });

      if (error) {
        throw error;
      }

      toast({
        title: 'Configurações salvas',
        description: 'Todas as configurações foram salvas com sucesso.'
      });
    } catch (error) {
      console.error('Error saving settings:', error);
      toast({
        title: 'Erro ao salvar',
        description: 'Ocorreu um erro ao salvar as configurações.',
        variant: 'destructive'
      });
    } finally {
      setSaving(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  return {
    settings,
    loading,
    saving,
    updateSetting,
    saveSettings,
    refetch: fetchSettings
  };
};
