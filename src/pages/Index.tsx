
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Zap, BarChart3, Users, FileText, Shield } from 'lucide-react';

const Index = () => {
  const navigate = useNavigate();
  const { user, loading } = useAuth();

  useEffect(() => {
    if (!loading && user) {
      navigate('/dashboard');
    }
  }, [user, loading, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-green-500 rounded-lg flex items-center justify-center mx-auto mb-4">
            <Zap className="w-6 h-6 text-white animate-pulse" />
          </div>
          <p className="text-muted-foreground">Carregando...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-green-50">
      <div className="container mx-auto px-4 py-16">
        <div className="text-center space-y-8 mb-16">
          <div className="flex items-center justify-center gap-3 mb-6">
            <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-green-500 rounded-xl flex items-center justify-center">
              <Zap className="w-8 h-8 text-white" />
            </div>
            <span className="font-bold text-4xl bg-gradient-to-r from-blue-600 to-green-600 bg-clip-text text-transparent">
              Monitor.ai
            </span>
          </div>
          
          <div className="space-y-4">
            <h1 className="text-5xl font-bold text-gray-900">
              Monitoramento Solar Inteligente
            </h1>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Plataforma completa para gestão de plantas solares com inteligência artificial, 
              monitoramento em tempo real e análise preditiva.
            </p>
          </div>

          <div className="flex gap-4 justify-center">
            <Button 
              size="lg" 
              className="text-lg px-8 py-3"
              onClick={() => navigate('/auth')}
            >
              Acessar Sistema
            </Button>
            <Button 
              variant="outline" 
              size="lg" 
              className="text-lg px-8 py-3"
              onClick={() => navigate('/auth')}
            >
              Criar Conta
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
          <Card>
            <CardHeader>
              <BarChart3 className="w-8 h-8 text-blue-600 mb-2" />
              <CardTitle>Analytics Avançado</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>
                Dashboards interativos com métricas de performance e análise de tendências.
              </CardDescription>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <Users className="w-8 h-8 text-green-600 mb-2" />
              <CardTitle>Gestão de Clientes</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>
                Sistema completo para gerenciar clientes, beneficiários e unidades consumidoras.
              </CardDescription>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <FileText className="w-8 h-8 text-purple-600 mb-2" />
              <CardTitle>OCR Inteligente</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>
                Processamento automático de faturas com múltiplos engines de OCR.
              </CardDescription>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <Shield className="w-8 h-8 text-red-600 mb-2" />
              <CardTitle>Segurança Avançada</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>
                Controle de acesso baseado em roles com autenticação segura.
              </CardDescription>
            </CardContent>
          </Card>
        </div>

        <div className="text-center">
          <p className="text-gray-500 mb-4">
            Precisa de acesso? Entre em contato com sua equipe ou administrador.
          </p>
          <Button 
            variant="link" 
            onClick={() => navigate('/auth')}
            className="text-blue-600 hover:text-blue-800"
          >
            Já tenho uma conta →
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Index;
