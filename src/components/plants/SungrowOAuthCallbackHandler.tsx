import { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import { SungrowProfileService } from '@/services/sungrowProfileService';
import { useSungrowOAuth } from '@/hooks/useSungrowOAuth';

export function SungrowOAuthCallbackHandler() {
  const location = useLocation();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { exchangeAuthCode } = useSungrowOAuth();

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const isCallback = params.get('oauth') === 'callback';
    const code = params.get('code');

    if (!isCallback || !code) return;

    const handle = async () => {
      try {
        // Get default profile to build config for token exchange
        const profile = await SungrowProfileService.getDefaultProfile();
        if (!profile) {
          toast({
            title: 'OAuth: perfil não encontrado',
            description: 'Defina um perfil Sungrow como padrão antes de autorizar.',
            variant: 'destructive',
          });
          return;
        }

        const config = SungrowProfileService.profileToConfig(profile);
        const redirectUri = `${window.location.origin}/plants?oauth=callback`;

        const tokens = await exchangeAuthCode(config as any, code, redirectUri);
        if (tokens) {
          toast({
            title: 'Autorização concluída',
            description: 'Conexão com a Sungrow autorizada com sucesso.',
          });
        } else {
          toast({
            title: 'Falha na autorização',
            description: 'Não foi possível concluir a autorização OAuth.',
            variant: 'destructive',
          });
        }
      } finally {
        // Clean URL
        const cleanUrl = `${window.location.origin}/plants`;
        window.history.replaceState({}, '', cleanUrl);
      }
    };

    handle();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.search]);

  return null;
}
