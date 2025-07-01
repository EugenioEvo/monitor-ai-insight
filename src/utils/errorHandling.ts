export const parseApiError = (error: any): string => {
  // Se é um erro de resposta da API
  if (error?.message) {
    return error.message;
  }
  
  // Se é um erro de fetch/network
  if (error?.error?.message) {
    return error.error.message;
  }
  
  // Se é um erro do Supabase
  if (error?.error) {
    return String(error.error);
  }
  
  // Fallback para string
  if (typeof error === 'string') {
    return error;
  }
  
  // Último fallback
  return 'Erro desconhecido. Tente novamente.';
};

export const getDetailedErrorMessage = (error: any, context: string): { title: string; description: string } => {
  const baseMessage = parseApiError(error);
  
  const contextualTitles: Record<string, string> = {
    'connection': 'Erro de Conexão',
    'discovery': 'Erro na Descoberta',
    'import': 'Erro na Importação',
    'sync': 'Erro de Sincronização',
    'config': 'Erro de Configuração'
  };
  
  const contextualDescriptions: Record<string, string> = {
    'connection': 'Verifique suas credenciais e conexão com a internet.',
    'discovery': 'Não foi possível descobrir plantas. Verifique suas credenciais.',
    'import': 'Erro ao importar plantas. Algumas podem já existir.',
    'sync': 'Falha na sincronização de dados. Tente novamente.',
    'config': 'Erro ao salvar configuração. Verifique os dados inseridos.'
  };
  
  return {
    title: contextualTitles[context] || 'Erro',
    description: `${baseMessage} ${contextualDescriptions[context] || ''}`
  };
};