
import { supabase } from '@/integrations/supabase/client';

export interface OCRConfig {
  engine: 'openai' | 'google' | 'tesseract';
  confidence_threshold: number;
  fallback_enabled: boolean;
  auto_validation: boolean;
}

export const ocrConfigService = {
  async getConfig(): Promise<OCRConfig> {
    const { data, error } = await supabase
      .from('app_config')
      .select('key, value')
      .like('key', 'invoices.%');

    if (error) {
      console.error('Error loading OCR config:', error);
      return {
        engine: 'openai',
        confidence_threshold: 0.8,
        fallback_enabled: true,
        auto_validation: true
      };
    }

    const config: any = {};
    data?.forEach(({ key, value }) => {
      const settingKey = key.replace('invoices.', '');
      try {
        config[settingKey] = JSON.parse(value);
      } catch {
        config[settingKey] = value;
      }
    });

    return {
      engine: config.ocrEngine || 'openai',
      confidence_threshold: 0.8,
      fallback_enabled: true,
      auto_validation: config.autoValidation || true
    };
  },

  async updateEngine(engine: 'openai' | 'google' | 'tesseract') {
    const { error } = await supabase
      .from('app_config')
      .upsert({ key: 'invoices.ocrEngine', value: engine }, { onConflict: 'key' });

    if (error) {
      throw error;
    }
  }
};
