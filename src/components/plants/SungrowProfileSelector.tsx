import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { SungrowProfileService, type SungrowCredentialProfile } from '@/services/sungrowProfileService';
import { SungrowProfileManager } from './SungrowProfileManager';
import { Key, Plus, Star, Settings2 } from 'lucide-react';

interface SungrowProfileSelectorProps {
  onProfileSelect: (profile: SungrowCredentialProfile | null) => void;
  selectedProfile?: SungrowCredentialProfile | null;
  showManageButton?: boolean;
  className?: string;
}

export const SungrowProfileSelector: React.FC<SungrowProfileSelectorProps> = ({
  onProfileSelect,
  selectedProfile,
  showManageButton = true,
  className
}) => {
  const { toast } = useToast();
  const [profiles, setProfiles] = useState<SungrowCredentialProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [isManageDialogOpen, setIsManageDialogOpen] = useState(false);

  const loadProfiles = async () => {
    try {
      setLoading(true);
      const data = await SungrowProfileService.getProfiles();
      setProfiles(data);
      
      // Auto-select default profile if none selected
      if (!selectedProfile && data.length > 0) {
        const defaultProfile = data.find(p => p.is_default) || data[0];
        onProfileSelect(defaultProfile);
      }
    } catch (error) {
      console.error('Erro ao carregar perfis:', error);
      toast({
        title: "Erro",
        description: "Falha ao carregar perfis de credenciais",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProfiles();
  }, []);

  // Reload profiles when manage dialog closes
  const handleManageDialogChange = (open: boolean) => {
    setIsManageDialogOpen(open);
    if (!open) {
      loadProfiles();
    }
  };

  const handleProfileChange = (profileId: string) => {
    if (profileId === 'none') {
      onProfileSelect(null);
      return;
    }

    const profile = profiles.find(p => p.id === profileId);
    if (profile) {
      onProfileSelect(profile);
    }
  };

  if (loading) {
    return (
      <Card className={className}>
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-muted rounded w-1/3"></div>
            <div className="h-10 bg-muted rounded"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Key className="h-5 w-5" />
            Perfil de Credenciais
          </CardTitle>
          {showManageButton && (
            <Dialog open={isManageDialogOpen} onOpenChange={handleManageDialogChange}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm">
                  <Settings2 className="h-4 w-4 mr-2" />
                  Gerenciar
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-4xl max-h-[80vh] overflow-auto">
                <DialogHeader>
                  <DialogTitle>Gerenciar Perfis de Credenciais</DialogTitle>
                </DialogHeader>
                <SungrowProfileManager showSelector={false} />
              </DialogContent>
            </Dialog>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {profiles.length === 0 ? (
          <Alert>
            <AlertDescription>
              <div className="space-y-2">
                <p>Nenhum perfil de credenciais encontrado.</p>
                <Dialog>
                  <DialogTrigger asChild>
                    <Button variant="outline" size="sm">
                      <Plus className="h-4 w-4 mr-2" />
                      Criar Primeiro Perfil
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-4xl max-h-[80vh] overflow-auto">
                    <DialogHeader>
                      <DialogTitle>Criar Perfil de Credenciais</DialogTitle>
                    </DialogHeader>
                    <SungrowProfileManager showSelector={false} />
                  </DialogContent>
                </Dialog>
              </div>
            </AlertDescription>
          </Alert>
        ) : (
          <div className="space-y-3">
            <Select 
              value={selectedProfile?.id || 'none'} 
              onValueChange={handleProfileChange}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione um perfil de credenciais">
                  {selectedProfile ? (
                    <div className="flex items-center gap-2">
                      <span>{selectedProfile.name}</span>
                      {selectedProfile.is_default && (
                        <Badge variant="default" className="text-xs">
                          <Star className="h-3 w-3 mr-1" />
                          Padrão
                        </Badge>
                      )}
                      <Badge variant="secondary" className="text-xs">
                        {selectedProfile.auth_mode === 'oauth' ? 'OAuth' : 'Direto'}
                      </Badge>
                    </div>
                  ) : (
                    "Configuração manual"
                  )}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">
                  <span className="text-muted-foreground">Configuração manual</span>
                </SelectItem>
                {profiles.map((profile) => (
                  <SelectItem key={profile.id} value={profile.id}>
                    <div className="flex items-center gap-2 w-full">
                      <span>{profile.name}</span>
                      {profile.is_default && (
                        <Badge variant="default" className="text-xs">
                          <Star className="h-3 w-3 mr-1" />
                          Padrão
                        </Badge>
                      )}
                      <Badge variant="secondary" className="text-xs">
                        {profile.auth_mode === 'oauth' ? 'OAuth' : 'Direto'}
                      </Badge>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {selectedProfile && (
              <div className="border rounded-lg p-3 bg-muted/50">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <h4 className="font-medium text-sm">{selectedProfile.name}</h4>
                    <Badge variant="secondary" className="text-xs">
                      {selectedProfile.auth_mode === 'oauth' ? 'OAuth 2.0' : 'Login Direto'}
                    </Badge>
                  </div>
                  {selectedProfile.description && (
                    <p className="text-xs text-muted-foreground">{selectedProfile.description}</p>
                  )}
                  <div className="text-xs text-muted-foreground">
                    App Key: {selectedProfile.appkey.substring(0, 8)}...
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};