
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useSettings } from '@/hooks/useSettings';
import { SettingsForm } from '@/components/settings/SettingsForm';
import { 
  Zap, 
  Users, 
  FileText, 
  Wrench, 
  AlertTriangle, 
  BarChart3, 
  Bot,
  Save,
  Loader2,
  Settings as SettingsIcon
} from 'lucide-react';
import { useMemo } from 'react';

const Settings = () => {
  const { settings, loading, saving, updateSetting, saveSettings } = useSettings();

  const handleSave = () => {
    saveSettings(settings);
  };

  const settingsConfig = useMemo(() => [
    {
      section: 'plants' as const,
      title: 'Plantas Solares',
      description: 'Configurações para monitoramento de plantas fotovoltaicas',
      icon: <Zap className="w-5 h-5 text-green-600" />
    },
    {
      section: 'customers' as const,
      title: 'Clientes',
      description: 'Configurações para gestão de clientes',
      icon: <Users className="w-5 h-5 text-blue-600" />
    },
    {
      section: 'invoices' as const,
      title: 'Faturas',
      description: 'Configurações para processamento de faturas',
      icon: <FileText className="w-5 h-5 text-purple-600" />
    },
    {
      section: 'maintenance' as const,
      title: 'Operação & Manutenção',
      description: 'Configurações para manutenção preventiva',
      icon: <Wrench className="w-5 h-5 text-orange-600" />
    },
    {
      section: 'alerts' as const,
      title: 'Alertas',
      description: 'Configurações de notificações e alertas',
      icon: <AlertTriangle className="w-5 h-5 text-red-600" />
    },
    {
      section: 'reports' as const,
      title: 'Relatórios',
      description: 'Configurações para geração de relatórios',
      icon: <BarChart3 className="w-5 h-5 text-indigo-600" />
    },
    {
      section: 'ai' as const,
      title: 'Inteligência Artificial',
      description: 'Configurações dos agentes de IA',
      icon: <Bot className="w-5 h-5 text-cyan-600" />
    },
    {
      section: 'general' as const,
      title: 'Configurações Gerais',
      description: 'Configurações globais do sistema',
      icon: <SettingsIcon className="w-5 h-5 text-gray-600" />
    }
  ], []);

  if (loading) {
    return (
      <div className="container mx-auto py-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <Skeleton className="h-9 w-48 mb-2" />
            <Skeleton className="h-5 w-96" />
          </div>
          <Skeleton className="h-10 w-48" />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="border rounded-lg p-6">
              <div className="space-y-4">
                <Skeleton className="h-6 w-32" />
                <Skeleton className="h-4 w-48" />
                <Skeleton className="h-6 w-full" />
                <Skeleton className="h-6 w-full" />
                <Skeleton className="h-6 w-full" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Configurações</h1>
          <p className="text-muted-foreground">
            Gerencie as configurações gerais do sistema Monitor.ai
          </p>
        </div>
        <Button onClick={handleSave} disabled={saving} className="gap-2">
          {saving ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Save className="w-4 h-4" />
          )}
          {saving ? 'Salvando...' : 'Salvar Configurações'}
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {settingsConfig.map((config) => (
          <SettingsForm
            key={config.section}
            section={config.section}
            settings={settings[config.section]}
            onUpdate={(key, value) => updateSetting(config.section, key, value)}
            title={config.title}
            description={config.description}
            icon={config.icon}
          />
        ))}
      </div>

      <div className="flex justify-end pt-6 border-t">
        <Button onClick={handleSave} disabled={saving} size="lg" className="gap-2">
          {saving ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Save className="w-4 h-4" />
          )}
          {saving ? 'Salvando...' : 'Salvar Todas as Configurações'}
        </Button>
      </div>
    </div>
  );
};

export default Settings;
