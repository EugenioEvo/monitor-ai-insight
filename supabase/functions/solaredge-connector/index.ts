"use strict";
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.0';

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const supabase = createClient(supabaseUrl, supabaseKey);

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface SolarEdgeConfig {
  apiKey: string;
  siteId: string;
  username?: string;
  password?: string;
}

interface SolarEdgeReading {
  timeUnit: string;
  unit: string;
  values: Array<{
    date: string;
    value: number;
  }>;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { action, plantId, config, period = 'DAY' } = await req.json();
    
    console.log(`SolarEdge action: ${action}`, {
      hasConfig: !!config,
      hasApiKey: !!config?.apiKey,
      hasSiteId: !!config?.siteId,
      plantId: plantId
    });
    
    switch (action) {
      case 'test_connection':
        return await testConnection(config);
      case 'sync_data':
        return await syncData(plantId);
      case 'get_site_details':
        return await getSiteDetails(config);
      case 'discover_plants':
        return await discoverPlants(config);
      case 'get_overview':
        return await getOverview(config);
      case 'get_power_flow':
        return await getPowerFlow(config);
      case 'get_equipment_list':
        return await getEquipmentList(config);
      case 'get_energy_details':
        return await getEnergyDetails(config, period);
      case 'get_environmental_benefits':
        return await getEnvironmentalBenefits(config);
      default:
        throw new Error('Ação não suportada');
    }
  } catch (error) {
    console.error('Erro no SolarEdge connector:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

async function getOverview(config: SolarEdgeConfig) {
  try {
    console.log('Iniciando busca de overview do SolarEdge...');
    
    if (!config.apiKey) {
      console.error('API Key não fornecida');
      throw new Error('API Key é obrigatória');
    }
    
    if (!config.siteId) {
      console.error('Site ID não fornecido');
      throw new Error('Site ID é obrigatório');
    }

    console.log(`Buscando overview para site: ${config.siteId}`);

    const response = await fetch(
      `https://monitoringapi.solaredge.com/site/${config.siteId}/overview?api_key=${config.apiKey}`,
      { 
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'Monitor.ai/1.0',
          ...(config.username && config.password ? {
            'Authorization': `Basic ${btoa(`${config.username}:${config.password}`)}`
          } : {})
        }
      }
    );

    console.log(`SolarEdge API response status: ${response.status}`);

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Erro da API SolarEdge: ${response.status} - ${errorText}`);
      throw new Error(`API Error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    console.log('Dados recebidos do SolarEdge:', JSON.stringify(data, null, 2));
    
    return new Response(
      JSON.stringify({ 
        success: true,
        data: data.overview 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Erro ao buscar overview:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        message: `Erro ao buscar overview: ${error.message}` 
      }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
}

async function discoverPlants(config: SolarEdgeConfig) {
  try {
    console.log('Descobrindo plantas SolarEdge...');
    
    // Validar configuração
    if (!config.apiKey) {
      throw new Error('API Key é obrigatória');
    }

    // Log das credenciais (sem expor dados sensíveis)
    console.log('Configuração recebida:', {
      hasApiKey: !!config.apiKey,
      hasSiteId: !!config.siteId,
      hasUsername: !!config.username,
      hasPassword: !!config.password
    });

    // Se um siteId específico foi fornecido, buscar apenas esse site
    if (config.siteId) {
      console.log(`Buscando site específico: ${config.siteId}`);
      const response = await fetch(
        `https://monitoringapi.solaredge.com/site/${config.siteId}/details?api_key=${config.apiKey}`,
        { 
          method: 'GET',
          headers: {
            'Accept': 'application/json',
            'User-Agent': 'Monitor.ai/1.0',
            ...(config.username && config.password ? {
              'Authorization': `Basic ${btoa(`${config.username}:${config.password}`)}`
            } : {})
          }
        }
      );

      console.log(`Status da resposta: ${response.status}`);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error(`Erro da API SolarEdge: ${response.status} - ${errorText}`);
        
        if (response.status === 401) {
          throw new Error('Credenciais inválidas. Verifique sua API Key, usuário e senha.');
        } else if (response.status === 403) {
          throw new Error('Acesso negado. Verifique as permissões da sua API Key.');
        }
        
        throw new Error(`API Error: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      console.log('Dados do site:', data);
      
      if (!data.details) {
        throw new Error('Dados do site não encontrados');
      }
      
      const site = data.details;
      
      return new Response(
        JSON.stringify({ 
          success: true,
          plants: [{
            id: site.id.toString(),
            name: site.name,
            capacity: site.peakPower,
            location: `${site.location?.city || 'N/A'}, ${site.location?.country || 'N/A'}`,
            status: site.status,
            installationDate: site.installationDate
          }]
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Caso contrário, buscar lista de sites da conta
    console.log('Buscando lista de sites...');
    const response = await fetch(
      `https://monitoringapi.solaredge.com/sites/list?api_key=${config.apiKey}`,
      { 
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'Monitor.ai/1.0',
          ...(config.username && config.password ? {
            'Authorization': `Basic ${btoa(`${config.username}:${config.password}`)}`
          } : {})
        }
      }
    );

    console.log(`Status da resposta: ${response.status}`);

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Erro da API SolarEdge: ${response.status} - ${errorText}`);
      
      if (response.status === 401) {
        throw new Error('Credenciais inválidas. Verifique sua API Key, usuário e senha.');
      } else if (response.status === 403) {
        throw new Error('Acesso negado. Verifique as permissões da sua API Key.');
      }
      
      throw new Error(`API Error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    console.log('Lista de sites:', data);
    
    const plants = data.sites?.site?.map((site: any) => ({
      id: site.id.toString(),
      name: site.name,
      capacity: site.peakPower,
      location: `${site.location?.city || 'N/A'}, ${site.location?.country || 'N/A'}`,
      status: site.status,
      installationDate: site.installationDate
    })) || [];
    
    console.log(`${plants.length} plantas encontradas`);
    
    return new Response(
      JSON.stringify({ 
        success: true,
        plants
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Erro ao descobrir plantas:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        message: `Erro ao descobrir plantas: ${error.message}` 
      }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
}

async function testConnection(config: SolarEdgeConfig) {
  try {
    console.log('Testando conexão SolarEdge...');
    
    // Validar configuração
    if (!config.apiKey) {
      throw new Error('API Key é obrigatória');
    }

    // Log das credenciais (sem expor dados sensíveis)
    console.log('Configuração de teste:', {
      hasApiKey: !!config.apiKey,
      hasSiteId: !!config.siteId,
      hasUsername: !!config.username,
      hasPassword: !!config.password
    });

    // Se não tiver siteId, tentar buscar a lista primeiro
    if (!config.siteId) {
      console.log('Site ID não fornecido, buscando lista de sites...');
      const response = await fetch(
        `https://monitoringapi.solaredge.com/sites/list?api_key=${config.apiKey}`,
        { 
          method: 'GET',
          headers: {
            'Accept': 'application/json',
            'User-Agent': 'Monitor.ai/1.0',
            ...(config.username && config.password ? {
              'Authorization':  `Basic ${btoa(`${config.username}:${config.password}`)}`
            } : {})
          }
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`Erro da API SolarEdge: ${response.status} - ${errorText}`);
        
        if (response.status === 401) {
          throw new Error('Credenciais inválidas. Verifique sua API Key, usuário e senha.');
        } else if (response.status === 403) {
          throw new Error('Acesso negado. Verifique as permissões da sua API Key.');
        }
        
        throw new Error(`API Key inválida ou sem permissão: ${response.status}`);
      }

      const data = await response.json();
      const siteCount = data.sites?.count || 0;
      
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: `Conexão estabelecida com sucesso! Encontrados ${siteCount} sites na conta.`
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Testar com site específico
    const response = await fetch(
      `https://monitoringapi.solaredge.com/site/${config.siteId}/details?api_key=${config.apiKey}`,
      { 
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'Monitor.ai/1.0',
          ...(config.username && config.password ? {
            'Authorization': `Basic ${btoa(`${config.username}:${config.password}`)}`
          } : {})
        }
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Erro da API SolarEdge: ${response.status} - ${errorText}`);
      
      if (response.status === 401) {
        throw new Error('Credenciais inválidas. Verifique sua API Key, usuário e senha.');
      } else if (response.status === 403) {
        throw new Error('Acesso negado. Verifique as permissões da sua API Key.');
      }
      
      throw new Error(`Site ID inválido ou sem permissão: ${response.status}`);
    }

    const data = await response.json();
    
    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Conexão estabelecida com sucesso com o site: ${data.details?.name || config.siteId}`,
        siteDetails: data.details 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Erro no teste de conexão:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        message: `Falha na conexão: ${error.message}` 
      }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
}

async function syncData(plantId: string) {
  const startTime = Date.now();
  let dataPointsSynced = 0;

  try {
    // Buscar configuração da planta
    const { data: plant, error: plantError } = await supabase
      .from('plants')
      .select('*')
      .eq('id', plantId)
      .single();

    if (plantError || !plant) {
      throw new Error('Planta não encontrada');
    }

    const config = plant.api_credentials as SolarEdgeConfig;
    if (!config?.apiKey) {
      throw new Error('API Key não encontrada');
    }

    // Use api_site_id if siteId is empty in config
    const siteId = plant.api_site_id || config.siteId;
    if (!siteId) {
      throw new Error('Site ID não encontrado');
    }

    // Buscar dados de energia do último dia
    const endDate = new Date().toISOString().split('T')[0];
    const startDate = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    const energyResponse = await fetch(
      `https://monitoringapi.solaredge.com/site/${siteId}/energy?timeUnit=QUARTER_OF_AN_HOUR&endDate=${endDate}&startDate=${startDate}&api_key=${config.apiKey}`
    );

    if (!energyResponse.ok) {
      throw new Error(`Erro na API SolarEdge: ${energyResponse.status}`);
    }

    const energyData: { energy: SolarEdgeReading } = await energyResponse.json();
    
    // Buscar dados de potência
    const powerResponse = await fetch(
      `https://monitoringapi.solaredge.com/site/${siteId}/power?startTime=${startDate} 00:00:00&endTime=${endDate} 23:59:59&api_key=${config.apiKey}`
    );

    let powerData: { power: SolarEdgeReading } | null = null;
    if (powerResponse.ok) {
      powerData = await powerResponse.json();
    }

    // Converter e inserir dados
    const readings = [];
    for (const energyPoint of energyData.energy.values) {
      if (energyPoint.value > 0) {
        const timestamp = new Date(energyPoint.date).toISOString();
        
        // Encontrar potência correspondente
        let powerValue = 0;
        if (powerData) {
          const powerPoint = powerData.power.values.find(p => 
            new Date(p.date).getTime() === new Date(energyPoint.date).getTime()
          );
          powerValue = powerPoint?.value || 0;
        }

        readings.push({
          plant_id: plantId,
          timestamp,
          energy_kwh: energyPoint.value / 1000, // Converter Wh para kWh
          power_w: Math.round(powerValue),
          created_at: new Date().toISOString()
        });
      }
    }

    if (readings.length > 0) {
      const { error: insertError } = await supabase
        .from('readings')
        .upsert(readings, { 
          onConflict: 'plant_id,timestamp',
          ignoreDuplicates: true 
        });

      if (insertError) {
        throw new Error(`Erro ao inserir dados: ${insertError.message}`);
      }

      dataPointsSynced = readings.length;
    }

    // Atualizar timestamp de sincronização
    await supabase
      .from('plants')
      .update({ last_sync: new Date().toISOString() })
      .eq('id', plantId);

    // Log de sucesso
    await supabase
      .from('sync_logs')
      .insert({
        plant_id: plantId,
        system_type: 'solaredge',
        status: 'success',
        message: `Sincronizados ${dataPointsSynced} pontos de dados`,
        data_points_synced: dataPointsSynced,
        sync_duration_ms: Date.now() - startTime
      });

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Sincronizados ${dataPointsSynced} pontos de dados`,
        dataPointsSynced 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    // Log de erro
    await supabase
      .from('sync_logs')
      .insert({
        plant_id: plantId,
        system_type: 'solaredge',
        status: 'error',
        message: error.message,
        data_points_synced: dataPointsSynced,
        sync_duration_ms: Date.now() - startTime
      });

    throw error;
  }
}

async function getSiteDetails(config: SolarEdgeConfig) {
  try {
    const response = await fetch(
      `https://monitoringapi.solaredge.com/site/${config.siteId}/details?api_key=${config.apiKey}`
    );

    if (!response.ok) {
      throw new Error(`API Error: ${response.status}`);
    }

    const data = await response.json();
    
    return new Response(
      JSON.stringify(data.details),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    throw new Error(`Erro ao buscar detalhes do site: ${error.message}`);
  }
}

async function getPowerFlow(config: SolarEdgeConfig) {
  try {
    console.log('Buscando power flow...');
    
    const response = await fetch(
      `https://monitoringapi.solaredge.com/site/${config.siteId}/currentPowerFlow?api_key=${config.apiKey}`,
      { 
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'Monitor.ai/1.0',
          ...(config.username && config.password ? {
            'Authorization': `Basic ${btoa(`${config.username}:${config.password}`)}`
          } : {})
        }
      }
    );

    if (!response.ok) {
      throw new Error(`API Error: ${response.status}`);
    }

    const data = await response.json();
    
    return new Response(
      JSON.stringify({ 
        success: true,
        data: data.siteCurrentPowerFlow 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Erro ao buscar power flow:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        message: `Erro ao buscar power flow: ${error.message}` 
      }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
}

async function getEquipmentList(config: SolarEdgeConfig) {
  try {
    console.log('Buscando lista de equipamentos...');
    
    const response = await fetch(
      `https://monitoringapi.solaredge.com/site/${config.siteId}/inventory?api_key=${config.apiKey}`,
      { 
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'Monitor.ai/1.0',
          ...(config.username && config.password ? {
            'Authorization': `Basic ${btoa(`${config.username}:${config.password}`)}`
          } : {})
        }
      }
    );

    if (!response.ok) {
      throw new Error(`API Error: ${response.status}`);
    }

    const data = await response.json();
    
    return new Response(
      JSON.stringify({ 
        success: true,
        data: data.Inventory 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Erro ao buscar equipamentos:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        message: `Erro ao buscar equipamentos: ${error.message}` 
      }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
}

async function getEnergyDetails(config: SolarEdgeConfig, period: string = 'DAY') {
  try {
    console.log(`Buscando detalhes de energia para período: ${period}`);
    
    const endDate = new Date().toISOString().split('T')[0];
    const startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    
    const timeUnit = period === 'MONTH' ? 'MONTH' : period === 'YEAR' ? 'MONTH' : 'DAY';
    
    const response = await fetch(
      `https://monitoringapi.solaredge.com/site/${config.siteId}/energy?timeUnit=${timeUnit}&endDate=${endDate}&startDate=${startDate}&api_key=${config.apiKey}`,
      { 
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'Monitor.ai/1.0',
          ...(config.username && config.password ? {
            'Authorization': `Basic ${btoa(`${config.username}:${config.password}`)}`
          } : {})
        }
      }
    );

    if (!response.ok) {
      throw new Error(`API Error: ${response.status}`);
    }

    const data = await response.json();
    
    return new Response(
      JSON.stringify({ 
        success: true,
        data: data.energy 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Erro ao buscar detalhes de energia:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        message: `Erro ao buscar detalhes de energia: ${error.message}` 
      }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
}

async function getEnvironmentalBenefits(config: SolarEdgeConfig) {
  try {
    console.log('Buscando benefícios ambientais...');
    
    const response = await fetch(
      `https://monitoringapi.solaredge.com/site/${config.siteId}/envBenefits?systemUnits=Metrics&api_key=${config.apiKey}`,
      { 
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'Monitor.ai/1.0',
          ...(config.username && config.password ? {
            'Authorization': `Basic ${btoa(`${config.username}:${config.password}`)}`
          } : {})
        }
      }
    );

    if (!response.ok) {
      throw new Error(`API Error: ${response.status}`);
    }

    const data = await response.json();
    
    return new Response(
      JSON.stringify({ 
        success: true,
        data: data.envBenefits 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Erro ao buscar benefícios ambientais:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        message: `Erro ao buscar benefícios ambientais: ${error.message}` 
      }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
}
