import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface Database {
  public: {
    Tables: {
      plants: {
        Row: {
          id: string
          name: string
          monitoring_system: string
          sync_enabled: boolean
          last_sync: string | null
        }
      }
      sync_logs: {
        Row: {
          id: string
          plant_id: string
          system_type: string
          status: string
          message: string | null
          data_points_synced: number
          sync_duration_ms: number | null
          created_at: string
        }
        Insert: {
          plant_id: string
          system_type: string
          status: string
          message?: string
          data_points_synced?: number
          sync_duration_ms?: number
        }
      }
      alerts: {
        Insert: {
          plant_id: string
          type: string
          severity: string
          message: string
          status?: string
        }
      }
    }
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabase = createClient<Database>(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    console.log('🕐 Iniciando sincronização automática...')

    // Buscar plantas habilitadas para sincronização
    const { data: plants, error: plantsError } = await supabase
      .from('plants')
      .select('id, name, monitoring_system, sync_enabled, last_sync')
      .eq('sync_enabled', true)

    if (plantsError) {
      console.error('Erro ao buscar plantas:', plantsError)
      throw plantsError
    }

    console.log(`Encontradas ${plants?.length || 0} plantas para sincronização`)

    const syncResults = []

    for (const plant of plants || []) {
      const syncStartTime = Date.now()
      console.log(`🔄 Sincronizando planta: ${plant.name} (${plant.monitoring_system})`)

      try {
        let functionName = ''
        if (plant.monitoring_system === 'sungrow') {
          functionName = 'sungrow-connector'
        } else if (plant.monitoring_system === 'solaredge') {
          functionName = 'solaredge-connector'
        } else {
          console.log(`⚠️  Sistema ${plant.monitoring_system} não suportado para sincronização automática`)
          continue
        }

        // Chamar função de sincronização específica
        const { data: syncData, error: syncError } = await supabase.functions.invoke(functionName, {
          body: {
            action: 'sync_data',
            plantId: plant.id
          }
        })

        const syncDuration = Date.now() - syncStartTime

        if (syncError) {
          console.error(`❌ Erro na sincronização da planta ${plant.name}:`, syncError)
          
          // Log do erro
          await supabase.from('sync_logs').insert({
            plant_id: plant.id,
            system_type: plant.monitoring_system,
            status: 'error',
            message: syncError.message || 'Erro desconhecido na sincronização',
            data_points_synced: 0,
            sync_duration_ms: syncDuration
          })

          // Criar alerta para falha de sincronização
          await supabase.from('alerts').insert({
            plant_id: plant.id,
            type: 'sync_failure',
            severity: 'high',
            message: `Falha na sincronização da planta ${plant.name}: ${syncError.message}`,
            status: 'open'
          })

          syncResults.push({
            plantId: plant.id,
            plantName: plant.name,
            success: false,
            error: syncError.message
          })
        } else {
          console.log(`✅ Sincronização da planta ${plant.name} concluída com sucesso`)
          
          const dataPointsSynced = syncData?.data?.dataPointsSynced || 0
          
          // Log do sucesso
          await supabase.from('sync_logs').insert({
            plant_id: plant.id,
            system_type: plant.monitoring_system,
            status: 'success',
            message: `Sincronização bem-sucedida: ${dataPointsSynced} pontos de dados`,
            data_points_synced: dataPointsSynced,
            sync_duration_ms: syncDuration
          })

          // Atualizar timestamp da última sincronização
          await supabase
            .from('plants')
            .update({ last_sync: new Date().toISOString() })
            .eq('id', plant.id)

          syncResults.push({
            plantId: plant.id,
            plantName: plant.name,
            success: true,
            dataPointsSynced
          })
        }
      } catch (error) {
        console.error(`💥 Exceção durante sincronização da planta ${plant.name}:`, error)
        
        await supabase.from('sync_logs').insert({
          plant_id: plant.id,
          system_type: plant.monitoring_system,
          status: 'error',
          message: `Exceção durante sincronização: ${error.message}`,
          data_points_synced: 0,
          sync_duration_ms: Date.now() - syncStartTime
        })

        syncResults.push({
          plantId: plant.id,
          plantName: plant.name,
          success: false,
          error: error.message
        })
      }
    }

    console.log('🏁 Sincronização automática concluída')

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Sincronização automática executada',
        results: syncResults,
        totalPlants: plants?.length || 0,
        successfulSyncs: syncResults.filter(r => r.success).length,
        failedSyncs: syncResults.filter(r => !r.success).length
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )

  } catch (error) {
    console.error('💥 Erro geral no scheduler:', error)
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  }
})