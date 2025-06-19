
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Skeleton } from '@/components/ui/skeleton';
import { useSettings } from '@/hooks/useSettings';
import { 
  Settings as SettingsIcon, 
  Zap, 
  Users, 
  FileText, 
  Wrench, 
  AlertTriangle, 
  BarChart3, 
  Bot,
  Save,
  Loader2
} from 'lucide-react';

const Settings = () => {
  const { settings, loading, saving, updateSetting, saveSettings } = useSettings();

  const handleSave = () => {
    saveSettings(settings);
  };

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
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-6 w-32" />
                <Skeleton className="h-4 w-48" />
              </CardHeader>
              <CardContent className="space-y-4">
                <Skeleton className="h-6 w-full" />
                <Skeleton className="h-6 w-full" />
                <Skeleton className="h-6 w-full" />
              </CardContent>
            </Card>
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
        {/* Configurações de Plantas */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="w-5 h-5 text-green-600" />
              Plantas Solares
            </CardTitle>
            <CardDescription>
              Configurações para monitoramento de plantas fotovoltaicas
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <Label htmlFor="auto-discovery">Descoberta Automática</Label>
              <Switch
                id="auto-discovery"
                checked={settings.plants.autoDiscovery}
                onCheckedChange={(checked) => updateSetting('plants', 'autoDiscovery', checked)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="monitoring-interval">Intervalo de Monitoramento (min)</Label>
              <Input
                id="monitoring-interval"
                type="number"
                value={settings.plants.monitoringInterval}
                onChange={(e) => updateSetting('plants', 'monitoringInterval', parseInt(e.target.value))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="alert-threshold">Limite de Alerta (%)</Label>
              <Input
                id="alert-threshold"
                type="number"
                value={settings.plants.alertThreshold}
                onChange={(e) => updateSetting('plants', 'alertThreshold', parseInt(e.target.value))}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="enable-notifications">Notificações</Label>
              <Switch
                id="enable-notifications"
                checked={settings.plants.enableNotifications}
                onCheckedChange={(checked) => updateSetting('plants', 'enableNotifications', checked)}
              />
            </div>
          </CardContent>
        </Card>

        {/* Configurações de Clientes */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5 text-blue-600" />
              Clientes
            </CardTitle>
            <CardDescription>
              Configurações para gestão de clientes
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <Label htmlFor="auto-reports">Relatórios Automáticos</Label>
              <Switch
                id="auto-reports"
                checked={settings.customers.autoGenerateReports}
                onCheckedChange={(checked) => updateSetting('customers', 'autoGenerateReports', checked)}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="email-notifications">Notificações por Email</Label>
              <Switch
                id="email-notifications"
                checked={settings.customers.emailNotifications}
                onCheckedChange={(checked) => updateSetting('customers', 'emailNotifications', checked)}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="invoice-reminders">Lembretes de Fatura</Label>
              <Switch
                id="invoice-reminders"
                checked={settings.customers.invoiceReminders}
                onCheckedChange={(checked) => updateSetting('customers', 'invoiceReminders', checked)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="default-currency">Moeda Padrão</Label>
              <select 
                id="default-currency"
                className="w-full p-2 border rounded-md"
                value={settings.customers.defaultCurrency}
                onChange={(e) => updateSetting('customers', 'defaultCurrency', e.target.value)}
              >
                <option value="BRL">Real (BRL)</option>
                <option value="USD">Dólar (USD)</option>
                <option value="EUR">Euro (EUR)</option>
              </select>
            </div>
          </CardContent>
        </Card>

        {/* Configurações de Faturas */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-purple-600" />
              Faturas
            </CardTitle>
            <CardDescription>
              Configurações para processamento de faturas
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="ocr-engine">Engine de OCR</Label>
              <select 
                id="ocr-engine"
                className="w-full p-2 border rounded-md"
                value={settings.invoices.ocrEngine}
                onChange={(e) => updateSetting('invoices', 'ocrEngine', e.target.value)}
              >
                <option value="openai">OpenAI Vision</option>
                <option value="google">Google Vision</option>
                <option value="tesseract">Tesseract</option>
              </select>
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="auto-validation">Validação Automática</Label>
              <Switch
                id="auto-validation"
                checked={settings.invoices.autoValidation}
                onCheckedChange={(checked) => updateSetting('invoices', 'autoValidation', checked)}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="duplicate-detection">Detecção de Duplicatas</Label>
              <Switch
                id="duplicate-detection"
                checked={settings.invoices.duplicateDetection}
                onCheckedChange={(checked) => updateSetting('invoices', 'duplicateDetection', checked)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="retention">Retenção de Dados (dias)</Label>
              <Input
                id="retention"
                type="number"
                value={settings.invoices.storageRetention}
                onChange={(e) => updateSetting('invoices', 'storageRetention', parseInt(e.target.value))}
              />
            </div>
          </CardContent>
        </Card>

        {/* Configurações de O&M */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Wrench className="w-5 h-5 text-orange-600" />
              Operação & Manutenção
            </CardTitle>
            <CardDescription>
              Configurações para manutenção preventiva
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <Label htmlFor="preventive">Manutenção Preventiva</Label>
              <Switch
                id="preventive"
                checked={settings.maintenance.preventiveMaintenance}
                onCheckedChange={(checked) => updateSetting('maintenance', 'preventiveMaintenance', checked)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="maintenance-interval">Intervalo de Manutenção (dias)</Label>
              <Input
                id="maintenance-interval"
                type="number"
                value={settings.maintenance.maintenanceInterval}
                onChange={(e) => updateSetting('maintenance', 'maintenanceInterval', parseInt(e.target.value))}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="maintenance-alerts">Alertas de Manutenção</Label>
              <Switch
                id="maintenance-alerts"
                checked={settings.maintenance.alertsEnabled}
                onCheckedChange={(checked) => updateSetting('maintenance', 'alertsEnabled', checked)}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="auto-scheduling">Agendamento Automático</Label>
              <Switch
                id="auto-scheduling"
                checked={settings.maintenance.autoScheduling}
                onCheckedChange={(checked) => updateSetting('maintenance', 'autoScheduling', checked)}
              />
            </div>
          </CardContent>
        </Card>

        {/* Configurações de Alertas */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-red-600" />
              Alertas
            </CardTitle>
            <CardDescription>
              Configurações de notificações e alertas
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <Label htmlFor="email-alerts">Alertas por Email</Label>
              <Switch
                id="email-alerts"
                checked={settings.alerts.emailAlerts}
                onCheckedChange={(checked) => updateSetting('alerts', 'emailAlerts', checked)}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="sms-alerts">Alertas por SMS</Label>
              <Switch
                id="sms-alerts"
                checked={settings.alerts.smsAlerts}
                onCheckedChange={(checked) => updateSetting('alerts', 'smsAlerts', checked)}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="push-notifications">Notificações Push</Label>
              <Switch
                id="push-notifications"
                checked={settings.alerts.pushNotifications}
                onCheckedChange={(checked) => updateSetting('alerts', 'pushNotifications', checked)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="alert-severity">Severidade dos Alertas</Label>
              <select 
                id="alert-severity"
                className="w-full p-2 border rounded-md"
                value={settings.alerts.alertSeverity}
                onChange={(e) => updateSetting('alerts', 'alertSeverity', e.target.value)}
              >
                <option value="low">Baixa</option>
                <option value="medium">Média</option>
                <option value="high">Alta</option>
                <option value="critical">Crítica</option>
              </select>
            </div>
          </CardContent>
        </Card>

        {/* Configurações de Relatórios */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-indigo-600" />
              Relatórios
            </CardTitle>
            <CardDescription>
              Configurações para geração de relatórios
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <Label htmlFor="auto-generation">Geração Automática</Label>
              <Switch
                id="auto-generation"
                checked={settings.reports.autoGeneration}
                onCheckedChange={(checked) => updateSetting('reports', 'autoGeneration', checked)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="report-frequency">Frequência dos Relatórios</Label>
              <select 
                id="report-frequency"
                className="w-full p-2 border rounded-md"
                value={settings.reports.reportFrequency}
                onChange={(e) => updateSetting('reports', 'reportFrequency', e.target.value)}
              >
                <option value="daily">Diário</option>
                <option value="weekly">Semanal</option>
                <option value="monthly">Mensal</option>
                <option value="quarterly">Trimestral</option>
              </select>
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="include-charts">Incluir Gráficos</Label>
              <Switch
                id="include-charts"
                checked={settings.reports.includeCharts}
                onCheckedChange={(checked) => updateSetting('reports', 'includeCharts', checked)}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="email-delivery">Entrega por Email</Label>
              <Switch
                id="email-delivery"
                checked={settings.reports.emailDelivery}
                onCheckedChange={(checked) => updateSetting('reports', 'emailDelivery', checked)}
              />
            </div>
          </CardContent>
        </Card>

        {/* Configurações de IA */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bot className="w-5 h-5 text-cyan-600" />
              Inteligência Artificial
            </CardTitle>
            <CardDescription>
              Configurações dos agentes de IA
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <Label htmlFor="chat-enabled">Chat Solar Ativo</Label>
              <Switch
                id="chat-enabled"
                checked={settings.ai.chatEnabled}
                onCheckedChange={(checked) => updateSetting('ai', 'chatEnabled', checked)}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="auto-responses">Respostas Automáticas</Label>
              <Switch
                id="auto-responses"
                checked={settings.ai.autoResponses}
                onCheckedChange={(checked) => updateSetting('ai', 'autoResponses', checked)}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="learning-mode">Modo de Aprendizado</Label>
              <Switch
                id="learning-mode"
                checked={settings.ai.learningMode}
                onCheckedChange={(checked) => updateSetting('ai', 'learningMode', checked)}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="data-collection">Coleta de Dados</Label>
              <Switch
                id="data-collection"
                checked={settings.ai.dataCollection}
                onCheckedChange={(checked) => updateSetting('ai', 'dataCollection', checked)}
              />
            </div>
          </CardContent>
        </Card>

        {/* Configurações Gerais */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <SettingsIcon className="w-5 h-5 text-gray-600" />
              Configurações Gerais
            </CardTitle>
            <CardDescription>
              Configurações globais do sistema
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="theme">Tema</Label>
              <select 
                id="theme"
                className="w-full p-2 border rounded-md"
                value={settings.general.theme}
                onChange={(e) => updateSetting('general', 'theme', e.target.value)}
              >
                <option value="light">Claro</option>
                <option value="dark">Escuro</option>
                <option value="auto">Automático</option>
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="language">Idioma</Label>
              <select 
                id="language"
                className="w-full p-2 border rounded-md"
                value={settings.general.language}
                onChange={(e) => updateSetting('general', 'language', e.target.value)}
              >
                <option value="pt-BR">Português (Brasil)</option>
                <option value="en-US">English (US)</option>
                <option value="es-ES">Español</option>
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="timezone">Fuso Horário</Label>
              <select 
                id="timezone"
                className="w-full p-2 border rounded-md"
                value={settings.general.timezone}
                onChange={(e) => updateSetting('general', 'timezone', e.target.value)}
              >
                <option value="America/Sao_Paulo">São Paulo (GMT-3)</option>
                <option value="America/New_York">New York (GMT-5)</option>
                <option value="Europe/London">London (GMT+0)</option>
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="company-name">Nome da Empresa</Label>
              <Input
                id="company-name"
                value={settings.general.companyName}
                onChange={(e) => updateSetting('general', 'companyName', e.target.value)}
              />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Botão de Salvar Fixo */}
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
