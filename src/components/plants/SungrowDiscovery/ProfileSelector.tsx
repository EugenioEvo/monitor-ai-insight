import React from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { LoadingSpinner } from '@/components/ui/loading-states';
import { AlertCircle } from 'lucide-react';
import type { SungrowCredentialProfile } from '@/services/sungrowProfileService';

interface ProfileSelectorProps {
  profiles: SungrowCredentialProfile[];
  selectedProfile: SungrowCredentialProfile | null;
  loading: boolean;
  onProfileSelect: (profileId: string) => void;
  onResetError?: () => void;
}

export const ProfileSelector: React.FC<ProfileSelectorProps> = ({
  profiles,
  selectedProfile,
  loading,
  onProfileSelect,
  onResetError
}) => {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-4">
        <LoadingSpinner size="sm" message="Carregando perfis..." />
      </div>
    );
  }

  if (profiles.length === 0) {
    return (
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          Nenhum perfil de credenciais encontrado. Crie um perfil primeiro na página de plantas.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium">Perfil de Credenciais</label>
      <Select
        value={selectedProfile?.id || ''}
        onValueChange={(value) => {
          onProfileSelect(value);
          onResetError?.();
        }}
      >
        <SelectTrigger>
          <SelectValue placeholder="Selecione um perfil" />
        </SelectTrigger>
        <SelectContent>
          {profiles.map((profile) => (
            <SelectItem key={profile.id} value={profile.id}>
              <div className="flex items-center gap-2">
                <span>{profile.name}</span>
                {profile.is_default && (
                  <Badge variant="secondary" className="text-xs">Padrão</Badge>
                )}
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {selectedProfile && (
        <div className="text-xs text-muted-foreground p-2 bg-muted rounded">
          <p><strong>Modo:</strong> {selectedProfile.auth_mode === 'oauth' ? 'OAuth 2.0' : 'Direto'}</p>
          <p><strong>URL:</strong> {selectedProfile.base_url}</p>
          {selectedProfile.description && (
            <p><strong>Descrição:</strong> {selectedProfile.description}</p>
          )}
        </div>
      )}
    </div>
  );
};