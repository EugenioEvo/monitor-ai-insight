import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import type { PlantAudit, AuditFinding, AuditRecommendation } from '@/types/plant-audit';

export const usePlantAudit = (plantId: string) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Run Plant Audit
  const runAudit = useMutation({
    mutationFn: async (period_days: number = 30) => {
      const { data, error } = await supabase.functions.invoke('plant-audit-engine', {
        body: {
          action: 'run_audit',
          plant_id: plantId,
          period_days,
        },
      });

      if (error) throw error;
      if (!data.success) throw new Error(data.error || 'Failed to run audit');
      return data.audit as PlantAudit & {
        findings: AuditFinding[];
        recommendations: AuditRecommendation[];
      };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['plant-audits', plantId] });
      toast({
        title: 'Auditoria concluída',
        description: 'Análise da planta finalizada com sucesso',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Erro ao executar auditoria',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Fetch Plant Audits
  const { data: audits, isLoading: auditsLoading } = useQuery({
    queryKey: ['plant-audits', plantId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('plant_audits')
        .select('*')
        .eq('plant_id', plantId)
        .order('audit_date', { ascending: false });

      if (error) throw error;
      return data as unknown as PlantAudit[];
    },
    enabled: !!plantId,
  });

  // Fetch Audit Details (with findings and recommendations)
  const { data: auditDetails } = useQuery({
    queryKey: ['audit-details', audits?.[0]?.id],
    queryFn: async () => {
      if (!audits?.[0]?.id) return null;

      const auditId = audits[0].id;

      // Buscar findings
      const { data: findings, error: findingsError } = await supabase
        .from('audit_findings')
        .select('*')
        .eq('audit_id', auditId)
        .order('estimated_impact_kwh', { ascending: false });

      if (findingsError) throw findingsError;

      // Buscar recommendations
      const { data: recommendations, error: recsError } = await supabase
        .from('audit_recommendations')
        .select('*')
        .eq('audit_id', auditId)
        .order('priority', { ascending: true });

      if (recsError) throw recsError;

      return {
        audit: audits[0],
        findings: findings as unknown as AuditFinding[],
        recommendations: recommendations as unknown as AuditRecommendation[],
      };
    },
    enabled: !!audits?.[0]?.id,
  });

  // Update Recommendation Status
  const updateRecommendationStatus = useMutation({
    mutationFn: async ({ recommendationId, status }: { recommendationId: string; status: string }) => {
      const { data, error } = await supabase
        .from('audit_recommendations')
        .update({ status, updated_at: new Date().toISOString() })
        .eq('id', recommendationId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['audit-details'] });
      toast({
        title: 'Status atualizado',
        description: 'Status da recomendação atualizado com sucesso',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Erro ao atualizar status',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Get Latest Audit
  const latestAudit = audits?.[0];

  // Get Quick Stats
  const quickStats = latestAudit
    ? {
        recoverableGeneration: (latestAudit as any).recoverable_generation_kwh,
        recoverableValue: (latestAudit as any).recoverable_value_brl,
        totalFindings: auditDetails?.findings?.length || 0,
        criticalFindings:
          auditDetails?.findings?.filter((f) => f.severity === 'critical').length || 0,
        pendingRecommendations:
          auditDetails?.recommendations?.filter((r) => r.status === 'pending').length || 0,
      }
    : null;

  return {
    runAudit,
    audits,
    auditsLoading,
    latestAudit,
    auditDetails,
    updateRecommendationStatus,
    quickStats,
    hasAudits: (audits?.length || 0) > 0,
  };
};
