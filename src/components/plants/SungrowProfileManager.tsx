import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import { SungrowProfileService, type SungrowCredentialProfile, type CreateSungrowProfileInput } from '@/services/sungrowProfileService';
import { Plus, Edit2, Trash2, Star, StarOff, Key, Settings, ArrowUp, ArrowDown } from 'lucide-react';

interface SungrowProfileManagerProps {
  onProfileSelect?: (profile: SungrowCredentialProfile) => void;
  selectedProfileId?: string;
  showSelector?: boolean;
  className?: string;
}

export const SungrowProfileManager: React.FC<SungrowProfileManagerProps> = ({
  onProfileSelect,
  selectedProfileId,
  showSelector = true,
  className
}) => {
  const { toast } = useToast();
  const [profiles, setProfiles] = useState<SungrowCredentialProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingProfile, setEditingProfile] = useState<SungrowCredentialProfile | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);

  const loadProfiles = async () => {
    try {
      setLoading(true);
      const data = await SungrowProfileService.getProfiles();
      setProfiles(data);
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

  const handleCreateProfile = async (data: CreateSungrowProfileInput) => {
    try {
      await SungrowProfileService.createProfile(data);
      await loadProfiles();
      setIsCreateDialogOpen(false);
      toast({
        title: "Sucesso",
        description: "Perfil criado com sucesso",
      });
    } catch (error) {
      console.error('Erro ao criar perfil:', error);
      toast({
        title: "Erro",
        description: "Falha ao criar perfil",
        variant: "destructive",
      });
    }
  };

  const handleEditProfile = async (id: string, data: Partial<CreateSungrowProfileInput>) => {
    try {
      await SungrowProfileService.updateProfile(id, data);
      await loadProfiles();
      setIsEditDialogOpen(false);
      setEditingProfile(null);
      toast({
        title: "Sucesso",
        description: "Perfil atualizado com sucesso",
      });
    } catch (error) {
      console.error('Erro ao atualizar perfil:', error);
      toast({
        title: "Erro",
        description: "Falha ao atualizar perfil",
        variant: "destructive",
      });
    }
  };

  const handleDeleteProfile = async (id: string) => {
    try {
      await SungrowProfileService.deleteProfile(id);
      await loadProfiles();
      toast({
        title: "Sucesso",
        description: "Perfil excluído com sucesso",
      });
    } catch (error) {
      console.error('Erro ao excluir perfil:', error);
      toast({
        title: "Erro",
        description: "Falha ao excluir perfil",
        variant: "destructive",
      });
    }
  };

  const handleSetDefault = async (id: string) => {
    try {
      await SungrowProfileService.setDefaultProfile(id);
      await loadProfiles();
      toast({
        title: "Sucesso",
        description: "Perfil padrão definido",
      });
    } catch (error) {
      console.error('Erro ao definir perfil padrão:', error);
      toast({
        title: "Erro",
        description: "Falha ao definir perfil padrão",
        variant: "destructive",
      });
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
            Perfis de Credenciais Sungrow
          </CardTitle>
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Novo Perfil
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md max-h-[90vh]">
              <DialogHeader>
                <DialogTitle>Criar Novo Perfil</DialogTitle>
              </DialogHeader>
              <ScrollArea className="max-h-[70vh] pr-2">
                <ProfileForm onSubmit={handleCreateProfile} />
              </ScrollArea>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {profiles.length === 0 ? (
          <Alert>
            <AlertDescription>
              Nenhum perfil de credenciais encontrado. Crie um novo perfil para reutilizar suas configurações.
            </AlertDescription>
          </Alert>
        ) : (
          <div className="space-y-3 relative">
            <ScrollArea className="max-h-96">
              <div className="space-y-3 pr-3">
                {profiles.map((profile) => (
              <div key={profile.id} className="border rounded-lg p-4 space-y-3">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <h4 className="font-medium">{profile.name}</h4>
                      {profile.is_default && (
                        <Badge variant="default">
                          <Star className="h-3 w-3 mr-1" />
                          Padrão
                        </Badge>
                      )}
                      <Badge variant="secondary">
                        {profile.auth_mode === 'oauth' ? 'OAuth 2.0' : 'Login Direto'}
                      </Badge>
                    </div>
                    {profile.description && (
                      <p className="text-sm text-muted-foreground">{profile.description}</p>
                    )}
                  </div>
                  
                  <div className="flex items-center gap-1">
                    {!profile.is_default && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleSetDefault(profile.id)}
                        title="Definir como padrão"
                      >
                        <StarOff className="h-4 w-4" />
                      </Button>
                    )}
                    
                    <Dialog open={isEditDialogOpen && editingProfile?.id === profile.id} onOpenChange={(open) => {
                      setIsEditDialogOpen(open);
                      if (!open) setEditingProfile(null);
                    }}>
                      <DialogTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setEditingProfile(profile)}
                        >
                          <Edit2 className="h-4 w-4" />
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-md max-h-[90vh]">
                        <DialogHeader>
                          <DialogTitle>Editar Perfil</DialogTitle>
                        </DialogHeader>
                        <ScrollArea className="max-h-[70vh] pr-2">
                          {editingProfile && (
                            <ProfileForm 
                              initialData={editingProfile}
                              onSubmit={(data) => handleEditProfile(profile.id, data)}
                            />
                          )}
                        </ScrollArea>
                      </DialogContent>
                    </Dialog>

                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteProfile(profile.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                {showSelector && (
                  <div className="flex justify-end">
                    <Button
                      variant={selectedProfileId === profile.id ? "default" : "outline"}
                      size="sm"
                      onClick={() => onProfileSelect?.(profile)}
                    >
                      {selectedProfileId === profile.id ? 'Selecionado' : 'Usar este Perfil'}
                    </Button>
                  </div>
                )}
                </div>
              ))}
              </div>
            </ScrollArea>
            
            {/* Botões de navegação rápida */}
            {profiles.length > 3 && (
              <div className="absolute right-2 top-2 flex flex-col gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0 bg-background/80 backdrop-blur-sm shadow-sm"
                  onClick={() => {
                    const scrollArea = document.querySelector('[data-radix-scroll-area-viewport]');
                    scrollArea?.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  title="Rolar para o topo"
                >
                  <ArrowUp className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0 bg-background/80 backdrop-blur-sm shadow-sm"
                  onClick={() => {
                    const scrollArea = document.querySelector('[data-radix-scroll-area-viewport]');
                    scrollArea?.scrollTo({ top: scrollArea.scrollHeight, behavior: 'smooth' });
                  }}
                  title="Rolar para baixo"
                >
                  <ArrowDown className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

interface ProfileFormProps {
  initialData?: SungrowCredentialProfile;
  onSubmit: (data: CreateSungrowProfileInput) => void;
}

const ProfileForm: React.FC<ProfileFormProps> = ({ initialData, onSubmit }) => {
  const [formData, setFormData] = useState<CreateSungrowProfileInput>({
    name: initialData?.name || '',
    description: initialData?.description || '',
    appkey: initialData?.appkey || '',
    access_key: initialData?.access_key || '',
    username: initialData?.username || '',
    password: initialData?.password || '',
    base_url: initialData?.base_url || 'https://gateway.isolarcloud.com.hk',
    auth_mode: initialData?.auth_mode || 'direct',
    is_default: initialData?.is_default || false,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="name">Nome do Perfil</Label>
        <Input
          id="name"
          value={formData.name}
          onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
          placeholder="Ex: Conta Principal"
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Descrição (opcional)</Label>
        <Textarea
          id="description"
          value={formData.description}
          onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
          placeholder="Descrição do perfil"
          rows={2}
        />
      </div>

      <Separator />

      <div className="space-y-2">
        <Label htmlFor="appkey">App Key</Label>
        <Input
          id="appkey"
          value={formData.appkey}
          onChange={(e) => setFormData(prev => ({ ...prev, appkey: e.target.value }))}
          placeholder="32 caracteres"
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="access_key">Access Key</Label>
        <Input
          id="access_key"
          value={formData.access_key}
          onChange={(e) => setFormData(prev => ({ ...prev, access_key: e.target.value }))}
          placeholder="32 caracteres"
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="auth_mode">Modo de Autenticação</Label>
        <Select value={formData.auth_mode} onValueChange={(value: 'direct' | 'oauth') => 
          setFormData(prev => ({ ...prev, auth_mode: value }))
        }>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="direct">Login Direto</SelectItem>
            <SelectItem value="oauth">OAuth 2.0</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {formData.auth_mode === 'direct' && (
        <>
          <div className="space-y-2">
            <Label htmlFor="username">Usuário</Label>
            <Input
              id="username"
              value={formData.username}
              onChange={(e) => setFormData(prev => ({ ...prev, username: e.target.value }))}
              placeholder="Seu usuário no iSolarCloud"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Senha</Label>
            <Input
              id="password"
              type="password"
              value={formData.password}
              onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
              placeholder="Sua senha no iSolarCloud"
            />
          </div>
        </>
      )}

      <div className="space-y-2">
        <Label htmlFor="base_url">URL Base (opcional)</Label>
        <Input
          id="base_url"
          value={formData.base_url}
          onChange={(e) => setFormData(prev => ({ ...prev, base_url: e.target.value }))}
          placeholder="https://gateway.isolarcloud.com.hk"
        />
      </div>

      <div className="flex items-center space-x-2">
        <Switch
          id="is_default"
          checked={formData.is_default}
          onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_default: checked }))}
        />
        <Label htmlFor="is_default">Definir como perfil padrão</Label>
      </div>

      <DialogFooter>
        <Button type="submit">
          {initialData ? 'Atualizar' : 'Criar'} Perfil
        </Button>
      </DialogFooter>
    </form>
  );
};