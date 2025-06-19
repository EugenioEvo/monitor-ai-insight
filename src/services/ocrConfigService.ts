
import { supabase } from '@/integrations/supabase/client';

export interface OCRConfig {
  engine: 'openai' | 'google' | 'tesseract';
  confidence_threshold: number;
  fallback_enabled: boolean;
  auto_validation: boolean;
}

export const ocrConfigService = {
  async getConfig(): Promise<OCRConfig> {
    try {
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
        confidence_threshold: parseFloat(config.confidenceThreshold) || 0.8,
        fallback_enabled: Boolean(config.fallbackEnabled ?? true),
        auto_validation: Boolean(config.autoValidation ?? true)
      };
    } catch (error) {
      console.error('Error in getConfig:', error);
      return {
        engine: 'openai',
        confidence_threshold: 0.8,
        fallback_enabled: true,
        auto_validation: true
      };
    }
  },

  async updateEngine(engine: 'openai' | 'google' | 'tesseract'): Promise<void> {
    try {
      const { error } = await supabase
        .from('app_config')
        .upsert({ key: 'invoices.ocrEngine', value: engine }, { onConflict: 'key' });

      if (error) {
        throw error;
      }
    } catch (error) {
      console.error('Error updating OCR engine:', error);
      throw error;
    }
  },

  async updateConfig(config: Partial<OCRConfig>): Promise<void> {
    try {
      const updates = [];
      
      if (config.engine !== undefined) {
        updates.push({ key: 'invoices.ocrEngine', value: config.engine });
      }
      
      if (config.confidence_threshold !== undefined) {
        updates.push({ key: 'invoices.confidenceThreshold', value: config.confidence_threshold.toString() });
      }
      
      if (config.fallback_enabled !== undefined) {
        updates.push({ key: 'invoices.fallbackEnabled', value: JSON.stringify(config.fallback_enabled) });
      }
      
      if (config.auto_validation !== undefined) {
        updates.push({ key: 'invoices.autoValidation', value: JSON.stringify(config.auto_validation) });
      }

      for (const update of updates) {
        const { error } = await supabase
          .from('app_config')
          .upsert(update, { onConflict: 'key' });

        if (error) {
          throw error;
        }
      }
    } catch (error) {
      console.error('Error updating OCR config:', error);
      throw error;
    }
  }
};
