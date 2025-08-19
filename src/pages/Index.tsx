
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Zap, BarChart3, Users, FileText, Shield, ArrowRight, Sparkles, TrendingUp, Globe } from 'lucide-react';

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
      <div className="min-h-screen flex items-center justify-center bg-gradient-solar">
        <div className="text-center animate-bounce-in">
          <div className="w-16 h-16 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center mx-auto mb-6 animate-pulse-glow">
            <Zap className="w-8 h-8 text-white animate-pulse" />
          </div>
          <p className="text-white/90 text-lg font-medium">Carregando Monitor.ai...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-solar relative overflow-hidden">
      {/* Background Elements */}
      <div className="absolute inset-0 bg-black/10"></div>
      <div className="absolute top-20 right-20 w-72 h-72 bg-white/10 rounded-full blur-3xl animate-float"></div>
      <div className="absolute bottom-20 left-20 w-96 h-96 bg-white/5 rounded-full blur-3xl animate-float" style={{ animationDelay: '1s' }}></div>
      
      <div className="relative z-10">
        {/* Hero Section */}
        <section className="container mx-auto px-6 py-20">
          <div className="text-center space-y-8 mb-20 animate-fade-in">
            <div className="flex items-center justify-center gap-4 mb-8">
              <div className="w-20 h-20 glass-card flex items-center justify-center animate-bounce-in">
                <Zap className="w-10 h-10 text-white" />
              </div>
              <span className="font-display font-bold text-5xl text-white">
                Monitor.ai
              </span>
            </div>
            
            <div className="space-y-6 animate-slide-up" style={{ animationDelay: '0.3s' }}>
              <h1 className="text-responsive-3xl font-display font-bold text-white leading-tight">
                Monitoramento Solar
                <br />
                <span className="bg-gradient-to-r from-yellow-200 via-orange-200 to-red-200 bg-clip-text text-transparent">
                  Inteligente
                </span>
              </h1>
              <p className="text-responsive-lg text-white/90 max-w-4xl mx-auto leading-relaxed">
                Plataforma completa para gestão de plantas solares com inteligência artificial, 
                monitoramento em tempo real e análise preditiva para maximizar sua eficiência energética.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-6 justify-center animate-scale-in" style={{ animationDelay: '0.6s' }}>
              <Button 
                size="xl" 
                variant="glass"
                className="group text-white border-white/30 hover:bg-white/20"
                onClick={() => navigate('/auth')}
              >
                Acessar Sistema
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </Button>
              <Button 
                variant="outline" 
                size="xl"
                className="border-white/50 text-white hover:bg-white hover:text-primary"
                onClick={() => navigate('/auth')}
              >
                Criar Conta
                <Sparkles className="w-5 h-5" />
              </Button>
            </div>
          </div>

          {/* Features Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-20 animate-slide-up" style={{ animationDelay: '0.9s' }}>
            <Card className="glass-card border-white/20 hover:bg-white/10 group">
              <CardHeader>
                <div className="w-14 h-14 bg-gradient-primary rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                  <BarChart3 className="w-7 h-7 text-white" />
                </div>
                <CardTitle className="text-white text-xl">Analytics Avançado</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-white/80">
                  Dashboards interativos com métricas de performance, análise de tendências e insights preditivos.
                </CardDescription>
              </CardContent>
            </Card>

            <Card className="glass-card border-white/20 hover:bg-white/10 group">
              <CardHeader>
                <div className="w-14 h-14 bg-gradient-secondary rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                  <Users className="w-7 h-7 text-white" />
                </div>
                <CardTitle className="text-white text-xl">Gestão de Clientes</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-white/80">
                  Sistema completo para gerenciar clientes, beneficiários e unidades consumidoras em tempo real.
                </CardDescription>
              </CardContent>
            </Card>

            <Card className="glass-card border-white/20 hover:bg-white/10 group">
              <CardHeader>
                <div className="w-14 h-14 bg-gradient-accent rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                  <FileText className="w-7 h-7 text-white" />
                </div>
                <CardTitle className="text-white text-xl">OCR Inteligente</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-white/80">
                  Processamento automático de faturas com múltiplos engines de OCR e validação por IA.
                </CardDescription>
              </CardContent>
            </Card>

            <Card className="glass-card border-white/20 hover:bg-white/10 group">
              <CardHeader>
                <div className="w-14 h-14 bg-primary rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                  <Shield className="w-7 h-7 text-white" />
                </div>
                <CardTitle className="text-white text-xl">Segurança Avançada</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-white/80">
                  Controle de acesso baseado em roles com autenticação segura e criptografia de ponta.
                </CardDescription>
              </CardContent>
            </Card>
          </div>

          {/* Stats Section */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16 animate-fade-in" style={{ animationDelay: '1.2s' }}>
            <div className="text-center glass-card p-8 border-white/20">
              <div className="text-4xl font-bold text-white mb-2">99.9%</div>
              <div className="text-white/80">Uptime Garantido</div>
            </div>
            <div className="text-center glass-card p-8 border-white/20">
              <div className="text-4xl font-bold text-white mb-2">500+</div>
              <div className="text-white/80">Plantas Monitoradas</div>
            </div>
            <div className="text-center glass-card p-8 border-white/20">
              <div className="text-4xl font-bold text-white mb-2">2.5GW</div>
              <div className="text-white/80">Capacidade Total</div>
            </div>
          </div>

          {/* CTA Section */}
          <div className="text-center space-y-6 animate-scale-in" style={{ animationDelay: '1.5s' }}>
            <h2 className="text-responsive-2xl font-display font-bold text-white">
              Transforme sua gestão solar hoje mesmo
            </h2>
            <p className="text-white/80 text-lg max-w-2xl mx-auto">
              Junte-se a centenas de empresas que já confiam no Monitor.ai para otimizar suas operações solares.
            </p>
            <Button 
              size="xl" 
              variant="glass"
              className="group text-white border-white/30 hover:bg-white/20"
              onClick={() => navigate('/auth')}
            >
              Começar Agora
              <TrendingUp className="w-5 h-5 group-hover:scale-110 transition-transform" />
            </Button>
          </div>
        </section>
      </div>
    </div>
  );
};

export default Index;
