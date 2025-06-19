
import { supabase } from '@/integrations/supabase/client';

export interface OCRConfig {
  engine: 'openai' | 'google' | 'tesseract';
  confidence_threshold: number;
  fallback_enabled: boolean;
  auto_validation: boolean;
}

// Cache configuration for 5 minutes
let configCache: { config: OCRConfig; timestamp: number } | null = null;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

export const ocrConfigService = {
  async getConfig(retryCount = 0): Promise<OCRConfig> {
    try {
      // Check cache first
      if (configCache && Date.now() - configCache.timestamp < CACHE_DURATION) {
        console.log('Using cached OCR config');
        return configCache.config;
      }

      const { data, error } = await supabase
        .from('app_config')
        .select('key, value')
        .like('key', 'invoices.%');

      if (error) {
        throw error;
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

      const ocrConfig = {
        engine: config.ocrEngine || 'openai',
        confidence_threshold: parseFloat(config.confidenceThreshold) || 0.8,
        fallback_enabled: Boolean(config.fallbackEnabled ?? true),
        auto_validation: Boolean(config.autoValidation ?? true)
      } as OCRConfig;

      // Update cache
      configCache = {
        config: ocrConfig,
        timestamp: Date.now()
      };

      return ocrConfig;
    } catch (error) {
      console.error('Error in getConfig:', error);
      
      // Retry logic
      if (retryCount < 2) {
        console.log(`Retrying getConfig, attempt ${retryCount + 1}`);
        await new Promise(resolve => setTimeout(resolve, 1000 * (retryCount + 1)));
        return this.getConfig(retryCount + 1);
      }
      
      // Fallback para configuração padrão
      console.warn('Using fallback OCR config due to repeated failures');
      return {
        engine: 'openai',
        confidence_threshold: 0.8,
        fallback_enabled: true,
        auto_validation: true
      };
    }
  },

  async updateEngine(engine: 'openai' | 'google' | 'tesseract', retryCount = 0): Promise<void> {
    try {
      if (!['openai', 'google', 'tesseract'].includes(engine)) {
        throw new Error('Invalid OCR engine specified');
      }

      const { error } = await supabase
        .from('app_config')
        .upsert({ key: 'invoices.ocrEngine', value: engine }, { onConflict: 'key' });

      if (error) {
        throw error;
      }
      
      // Clear cache after update
      configCache = null;
      
      console.log(`OCR engine updated to: ${engine}`);
    } catch (error) {
      console.error('Error updating OCR engine:', error);
      
      // Retry logic
      if (retryCount < 2) {
        console.log(`Retrying updateEngine, attempt ${retryCount + 1}`);
        await new Promise(resolve => setTimeout(resolve, 1000 * (retryCount + 1)));
        return this.updateEngine(engine, retryCount + 1);
      }
      
      throw error;
    }
  },

  async updateConfig(config: Partial<OCRConfig>, retryCount = 0): Promise<void> {
    try {
      const updates = [];
      
      if (config.engine !== undefined) {
        if (!['openai', 'google', 'tesseract'].includes(config.engine)) {
          throw new Error('Invalid OCR engine specified');
        }
        updates.push({ key: 'invoices.ocrEngine', value: config.engine });
      }
      
      if (config.confidence_threshold !== undefined) {
        if (config.confidence_threshold < 0 || config.confidence_threshold > 1) {
          throw new Error('Confidence threshold must be between 0 and 1');
        }
        updates.push({ key: 'invoices.confidenceThreshold', value: config.confidence_threshold.toString() });
      }
      
      if (config.fallback_enabled !== undefined) {
        updates.push({ key: 'invoices.fallbackEnabled', value: JSON.stringify(config.fallback_enabled) });
      }
      
      if (config.auto_validation !== undefined) {
        updates.push({ key: 'invoices.autoValidation', value: JSON.stringify(config.auto_validation) });
      }

      if (updates.length === 0) {
        console.warn('No valid configuration updates provided');
        return;
      }

      for (const update of updates) {
        const { error } = await supabase
          .from('app_config')
          .upsert(update, { onConflict: 'key' });

        if (error) {
          throw error;
        }
      }
      
      // Clear cache after update
      configCache = null;
      
      console.log(`OCR config updated with ${updates.length} changes`);
    } catch (error) {
      console.error('Error updating OCR config:', error);
      
      // Retry logic
      if (retryCount < 2) {
        console.log(`Retrying updateConfig, attempt ${retryCount + 1}`);
        await new Promise(resolve => setTimeout(resolve, 1000 * (retryCount + 1)));
        return this.updateConfig(config, retryCount + 1);
      }
      
      throw error;
    }
  },

  // Clear cache method for external use
  clearCache(): void {
    configCache = null;
    console.log('OCR config cache cleared');
  }
};
