import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { action, ...params } = await req.json();

    switch (action) {
      case 'create_backup':
        return await createSystemBackup(supabase, params);
      case 'restore_backup':
        return await restoreFromBackup(supabase, params);
      case 'list_backups':
        return await listAvailableBackups(supabase);
      case 'cleanup_old_backups':
        return await cleanupOldBackups(supabase);
      default:
        return new Response(
          JSON.stringify({ error: 'Invalid action' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }
  } catch (error) {
    console.error('Backup manager error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

async function createSystemBackup(supabase: any, params: any) {
  const { backup_type = 'full', tables = [] } = params;
  const now = new Date();
  
  try {
    // Create backup metadata
    const backupId = crypto.randomUUID();
    const backupData: any = {
      backup_id: backupId,
      backup_type,
      created_at: now.toISOString(),
      status: 'creating',
      size_mb: 0,
      tables_included: tables.length > 0 ? tables : ['all'],
      metadata: {
        version: '1.0',
        compression: 'gzip',
        checksum: null
      }
    };

    // Simulate backup process for critical tables
    const criticalTables = tables.length > 0 ? tables : [
      'plants', 'readings', 'alerts', 'tickets', 'customers', 'invoices'
    ];

    let totalSize = 0;
    const tableBackups = [];

    for (const table of criticalTables) {
      // Get table data count for size estimation
      const { count, error: countError } = await supabase
        .from(table)
        .select('*', { count: 'exact', head: true });

      if (!countError && count !== null) {
        const estimatedSize = Math.max(count * 0.1, 1); // KB estimation
        totalSize += estimatedSize;
        
        tableBackups.push({
          table_name: table,
          record_count: count,
          size_kb: estimatedSize,
          backed_up_at: now.toISOString()
        });
      }
    }

    backupData.size_mb = Math.round(totalSize / 1024 * 100) / 100;
    backupData.status = 'completed';
    backupData.metadata.checksum = generateChecksum(backupData);
    backupData.table_details = tableBackups;

    // Store backup record
    const { data, error } = await supabase
      .from('system_backups')
      .insert(backupData);

    if (error) throw error;

    return new Response(
      JSON.stringify({ 
        success: true, 
        backup_id: backupId,
        backup_data: backupData
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Backup creation error:', error);
    throw error;
  }
}

async function restoreFromBackup(supabase: any, params: any) {
  const { backup_id, restore_options = {} } = params;
  
  // Get backup details
  const { data: backup, error } = await supabase
    .from('system_backups')
    .select('*')
    .eq('backup_id', backup_id)
    .single();

  if (error || !backup) {
    throw new Error('Backup not found');
  }

  if (backup.status !== 'completed') {
    throw new Error('Backup is not in completed state');
  }

  // Simulate restore process
  const restoreData = {
    restore_id: crypto.randomUUID(),
    backup_id,
    started_at: new Date().toISOString(),
    status: 'restoring',
    tables_restored: [],
    errors: []
  };

  // Simulate restore for each table
  for (const tableDetail of backup.table_details || []) {
    try {
      // In a real implementation, this would restore actual data
      restoreData.tables_restored.push({
        table_name: tableDetail.table_name,
        records_restored: tableDetail.record_count,
        restored_at: new Date().toISOString()
      });
    } catch (error) {
      restoreData.errors.push({
        table_name: tableDetail.table_name,
        error: error.message
      });
    }
  }

  restoreData.status = restoreData.errors.length > 0 ? 'completed_with_errors' : 'completed';

  // Log restore operation
  await supabase
    .from('system_restore_logs')
    .insert(restoreData);

  return new Response(
    JSON.stringify({ 
      success: true,
      restore_data: restoreData
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

async function listAvailableBackups(supabase: any) {
  const { data: backups, error } = await supabase
    .from('system_backups')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(50);

  if (error) throw error;

  return new Response(
    JSON.stringify({ backups }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

async function cleanupOldBackups(supabase: any) {
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  
  // Get old backups
  const { data: oldBackups, error: fetchError } = await supabase
    .from('system_backups')
    .select('backup_id, created_at')
    .lt('created_at', thirtyDaysAgo.toISOString());

  if (fetchError) throw fetchError;

  // Delete old backups
  const { error: deleteError } = await supabase
    .from('system_backups')
    .delete()
    .lt('created_at', thirtyDaysAgo.toISOString());

  if (deleteError) throw deleteError;

  return new Response(
    JSON.stringify({ 
      success: true,
      deleted_count: oldBackups?.length || 0,
      deleted_backups: oldBackups
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

function generateChecksum(data: any): string {
  // Simple checksum generation for demo
  const str = JSON.stringify(data);
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash).toString(16);
}