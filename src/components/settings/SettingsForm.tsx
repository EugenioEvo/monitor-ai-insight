
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AppSettings } from '@/types/settings';

interface SettingsFormProps {
  section: keyof AppSettings;
  settings: AppSettings[keyof AppSettings];
  onUpdate: (key: string, value: any) => void;
  title: string;
  description: string;
  icon: React.ReactNode;
}

export const SettingsForm = ({ section, settings, onUpdate, title, description, icon }: SettingsFormProps) => {
  const renderField = (key: string, value: any) => {
    if (typeof value === 'boolean') {
      return (
        <div className="flex items-center justify-between" key={key}>
          <Label htmlFor={key} className="text-sm font-medium">
            {formatLabel(key)}
          </Label>
          <Switch
            id={key}
            checked={value}
            onCheckedChange={(checked) => onUpdate(key, checked)}
          />
        </div>
      );
    }

    if (typeof value === 'number') {
      return (
        <div className="space-y-2" key={key}>
          <Label htmlFor={key} className="text-sm font-medium">
            {formatLabel(key)}
          </Label>
          <Input
            id={key}
            type="number"
            value={value}
            onChange={(e) => onUpdate(key, parseInt(e.target.value) || 0)}
            className="w-full"
          />
        </div>
      );
    }

    if (typeof value === 'string' && isSelectField(key)) {
      const options = getSelectOptions(key);
      return (
        <div className="space-y-2" key={key}>
          <Label htmlFor={key} className="text-sm font-medium">
            {formatLabel(key)}
          </Label>
          <select 
            id={key}
            className="w-full p-2 border rounded-md bg-background"
            value={value}
            onChange={(e) => onUpdate(key, e.target.value)}
          >
            {options.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      );
    }

    return (
      <div className="space-y-2" key={key}>
        <Label htmlFor={key} className="text-sm font-medium">
          {formatLabel(key)}
        </Label>
        <Input
          id={key}
          value={value}
          onChange={(e) => onUpdate(key, e.target.value)}
          className="w-full"
        />
      </div>
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {icon}
          {title}
        </CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {Object.entries(settings).map(([key, value]) => renderField(key, value))}
      </CardContent>
    </Card>
  );
};

const formatLabel = (key: string) => {
  return key.replace(/([A-Z])/g, ' $1')
    .replace(/^./, str => str.toUpperCase())
    .replace(/([a-z])([A-Z])/g, '$1 $2');
};

const isSelectField = (key: string) => {
  const selectFields = [
    'defaultCurrency', 'ocrEngine', 'alertSeverity', 
    'reportFrequency', 'theme', 'language', 'timezone'
  ];
  return selectFields.includes(key);
};

const getSelectOptions = (key: string) => {
  const optionsMap: Record<string, Array<{value: string; label: string}>> = {
    defaultCurrency: [
      { value: 'BRL', label: 'Real (BRL)' },
      { value: 'USD', label: 'Dólar (USD)' },
      { value: 'EUR', label: 'Euro (EUR)' }
    ],
    ocrEngine: [
      { value: 'openai', label: 'OpenAI Vision' },
      { value: 'google', label: 'Google Vision' },
      { value: 'tesseract', label: 'Tesseract' }
    ],
    alertSeverity: [
      { value: 'low', label: 'Baixa' },
      { value: 'medium', label: 'Média' },
      { value: 'high', label: 'Alta' },
      { value: 'critical', label: 'Crítica' }
    ],
    reportFrequency: [
      { value: 'daily', label: 'Diário' },
      { value: 'weekly', label: 'Semanal' },
      { value: 'monthly', label: 'Mensal' },
      { value: 'quarterly', label: 'Trimestral' }
    ],
    theme: [
      { value: 'light', label: 'Claro' },
      { value: 'dark', label: 'Escuro' },
      { value: 'auto', label: 'Automático' }
    ],
    language: [
      { value: 'pt-BR', label: 'Português (Brasil)' },
      { value: 'en-US', label: 'English (US)' },
      { value: 'es-ES', label: 'Español' }
    ],
    timezone: [
      { value: 'America/Sao_Paulo', label: 'São Paulo (GMT-3)' },
      { value: 'America/New_York', label: 'New York (GMT-5)' },
      { value: 'Europe/London', label: 'London (GMT+0)' }
    ]
  };

  return optionsMap[key] || [];
};
