import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { InfoIcon, Plus, Shield, Zap } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface SungrowProfileGuideProps {
  onCreateProfile?: () => void;
}

export const SungrowProfileGuide: React.FC<SungrowProfileGuideProps> = ({
  onCreateProfile
}) => {
  const navigate = useNavigate();

  const handleCreateProfile = () => {
    if (onCreateProfile) {
      onCreateProfile();
    } else {
      // Navigate to plants page where profiles can be managed
      navigate('/plants');
    }
  };

  return (
    <Card className="border-2 border-dashed">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="w-5 h-5 text-primary" />
          Configure Perfis Sungrow
        </CardTitle>
        <CardDescription>
          Para usar o Sungrow de forma estável, configure perfis de credenciais
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert>
          <InfoIcon className="h-4 w-4" />
          <AlertDescription>
            <strong>Perfis garantem:</strong> Conexões estáveis, credenciais salvas com segurança, 
            suporte a OAuth 2.0 e configuração reutilizável.
          </AlertDescription>
        </Alert>

        <div className="space-y-3">
          <div className="flex items-start gap-3">
            <Zap className="w-4 h-4 text-green-600 mt-1 flex-shrink-0" />
            <div>
              <p className="text-sm font-medium">Autenticação Direta</p>
              <p className="text-xs text-muted-foreground">
                Use username, password, appkey e access key do portal Sungrow
              </p>
            </div>
          </div>
          
          <div className="flex items-start gap-3">
            <Shield className="w-4 h-4 text-blue-600 mt-1 flex-shrink-0" />
            <div>
              <p className="text-sm font-medium">OAuth 2.0 (Recomendado)</p>
              <p className="text-xs text-muted-foreground">
                Autorização segura via portal web do Sungrow - mais estável
              </p>
            </div>
          </div>
        </div>

        <div className="flex gap-2 pt-4">
          <Button onClick={handleCreateProfile} className="flex-1">
            <Plus className="w-4 h-4 mr-2" />
            Criar Primeiro Perfil
          </Button>
        </div>

        <div className="text-xs text-muted-foreground space-y-1">
          <p><strong>Dica:</strong> OAuth 2.0 é mais estável para descoberta de plantas</p>
          <p><strong>Segurança:</strong> Credenciais são armazenadas com criptografia</p>
        </div>
      </CardContent>
    </Card>
  );
};