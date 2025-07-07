
-- Criar tabela para persistir tokens do Sungrow
CREATE TABLE public.sungrow_tokens (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  access_token TEXT NOT NULL,
  refresh_token TEXT,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  config_hash TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.sungrow_tokens ENABLE ROW LEVEL SECURITY;

-- Política para usuários verem apenas seus próprios tokens
CREATE POLICY "Users can manage their own tokens" 
  ON public.sungrow_tokens 
  FOR ALL 
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Trigger para atualizar updated_at
CREATE TRIGGER update_sungrow_tokens_updated_at
  BEFORE UPDATE ON public.sungrow_tokens
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Índice para limpeza automática de tokens expirados
CREATE INDEX idx_sungrow_tokens_expires_at ON public.sungrow_tokens(expires_at);
