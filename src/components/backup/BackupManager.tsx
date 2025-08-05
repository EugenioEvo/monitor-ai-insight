import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { 
  Database, 
  Download, 
  Upload, 
  Trash2, 
  Shield,
  Clock,
  HardDrive,
  CheckCircle,
  AlertTriangle
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface BackupData {
  backup_id: string;
  backup_type: string;
  created_at: string;
  status: string;
  size_mb: number;
  tables_included: string[];
  metadata: any;
  table_details?: any[];
}

export default function BackupManager() {
  const [backups, setBackups] = useState<BackupData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const { toast } = useToast();

  const fetchBackups = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('backup-manager', {
        body: { action: 'list_backups' }
      });

      if (error) throw error;
      setBackups(data.backups || []);
    } catch (error) {
      console.error('Error fetching backups:', error);
      toast({
        title: "Erro ao buscar backups",
        description: "Não foi possível carregar a lista de backups",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const createBackup = async (backupType: string = 'full') => {
    setIsCreating(true);
    try {
      const { data, error } = await supabase.functions.invoke('backup-manager', {
        body: { 
          action: 'create_backup',
          backup_type: backupType,
          tables: [] // Empty means all tables
        }
      });

      if (error) throw error;

      toast({
        title: "Backup criado com sucesso",
        description: `Backup ${data.backup_id} criado com ${data.backup_data.size_mb}MB`,
      });

      fetchBackups();
    } catch (error) {
      console.error('Error creating backup:', error);
      toast({
        title: "Erro ao criar backup",
        description: "Não foi possível criar o backup do sistema",
        variant: "destructive",
      });
    } finally {
      setIsCreating(false);
    }
  };

  const restoreBackup = async (backupId: string) => {
    if (!confirm('Tem certeza que deseja restaurar este backup? Esta ação não pode ser desfeita.')) {
      return;
    }

    setIsRestoring(true);
    try {
      const { data, error } = await supabase.functions.invoke('backup-manager', {
        body: { 
          action: 'restore_backup',
          backup_id: backupId
        }
      });

      if (error) throw error;

      toast({
        title: "Restauração iniciada",
        description: `Restauração do backup ${backupId} em andamento`,
      });
    } catch (error) {
      console.error('Error restoring backup:', error);
      toast({
        title: "Erro na restauração",
        description: "Não foi possível restaurar o backup",
        variant: "destructive",
      });
    } finally {
      setIsRestoring(false);
    }
  };

  const cleanupOldBackups = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('backup-manager', {
        body: { action: 'cleanup_old_backups' }
      });

      if (error) throw error;

      toast({
        title: "Limpeza concluída",
        description: `${data.deleted_count} backup(s) antigo(s) removido(s)`,
      });

      fetchBackups();
    } catch (error) {
      console.error('Error cleaning up backups:', error);
      toast({
        title: "Erro na limpeza",
        description: "Não foi possível remover backups antigos",
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    fetchBackups();
  }, []);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'default';
      case 'creating': return 'secondary';
      case 'failed': return 'destructive';
      default: return 'outline';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckCircle className="h-4 w-4" />;
      case 'creating': return <Clock className="h-4 w-4" />;
      case 'failed': return <AlertTriangle className="h-4 w-4" />;
      default: return <Database className="h-4 w-4" />;
    }
  };

  const totalBackupSize = backups.reduce((sum, backup) => sum + backup.size_mb, 0);
  const completedBackups = backups.filter(b => b.status === 'completed');

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Gerenciador de Backup</h2>
          <p className="text-muted-foreground">
            Crie, restaure e gerencie backups do sistema
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Button 
            onClick={() => createBackup('full')}
            disabled={isCreating}
          >
            <Database className="h-4 w-4 mr-2" />
            {isCreating ? 'Criando...' : 'Novo Backup'}
          </Button>
          <Button 
            variant="outline"
            onClick={cleanupOldBackups}
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Limpar Antigos
          </Button>
        </div>
      </div>

      {/* Estatísticas */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Backups</CardTitle>
            <Database className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{backups.length}</div>
            <p className="text-xs text-muted-foreground">
              {completedBackups.length} completos
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Espaço Total</CardTitle>
            <HardDrive className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalBackupSize.toFixed(1)} MB</div>
            <p className="text-xs text-muted-foreground">
              Dados de backup
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Último Backup</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {backups.length > 0 
                ? new Date(backups[0].created_at).toLocaleDateString('pt-BR')
                : 'N/A'
              }
            </div>
            <p className="text-xs text-muted-foreground">
              Data do último backup
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Status Geral</CardTitle>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">Ativo</div>
            <p className="text-xs text-muted-foreground">
              Sistema de backup
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Lista de Backups */}
      <Card>
        <CardHeader>
          <CardTitle>Backups Disponíveis</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8">Carregando backups...</div>
          ) : backups.length === 0 ? (
            <div className="text-center py-8">
              <Database className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-muted-foreground">Nenhum backup encontrado</p>
              <Button 
                onClick={() => createBackup('full')} 
                className="mt-4"
                disabled={isCreating}
              >
                Criar Primeiro Backup
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Data</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Tamanho</TableHead>
                  <TableHead>Tabelas</TableHead>
                  <TableHead>Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {backups.map((backup) => (
                  <TableRow key={backup.backup_id}>
                    <TableCell className="font-mono text-xs">
                      {backup.backup_id.slice(0, 8)}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{backup.backup_type}</Badge>
                    </TableCell>
                    <TableCell>
                      {new Date(backup.created_at).toLocaleString('pt-BR')}
                    </TableCell>
                    <TableCell>
                      <Badge variant={getStatusColor(backup.status)}>
                        {getStatusIcon(backup.status)}
                        <span className="ml-1">{backup.status}</span>
                      </Badge>
                    </TableCell>
                    <TableCell>{backup.size_mb.toFixed(1)} MB</TableCell>
                    <TableCell>
                      {backup.tables_included.length > 0 
                        ? backup.tables_included.length === 1 && backup.tables_included[0] === 'all'
                          ? 'Todas'
                          : backup.tables_included.length.toString()
                        : 'N/A'
                      }
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => restoreBackup(backup.backup_id)}
                          disabled={backup.status !== 'completed' || isRestoring}
                        >
                          <Upload className="h-4 w-4 mr-1" />
                          Restaurar
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Informações Adicionais */}
      <Alert>
        <Shield className="h-4 w-4" />
        <AlertTitle>Política de Backup</AlertTitle>
        <AlertDescription>
          Backups são criados automaticamente e mantidos por 30 dias. 
          Backups manuais podem ser criados a qualquer momento. 
          Para restaurações críticas, entre em contato com o suporte técnico.
        </AlertDescription>
      </Alert>
    </div>
  );
}