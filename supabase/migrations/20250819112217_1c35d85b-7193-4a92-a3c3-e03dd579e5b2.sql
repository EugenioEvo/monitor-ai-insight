-- Create Sungrow credential profiles table
CREATE TABLE public.sungrow_credential_profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  appkey TEXT NOT NULL,
  access_key TEXT NOT NULL,
  username TEXT,
  password TEXT,
  base_url TEXT DEFAULT 'https://gateway.isolarcloud.com.hk',
  auth_mode TEXT NOT NULL DEFAULT 'direct' CHECK (auth_mode IN ('direct', 'oauth')),
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  CONSTRAINT unique_profile_per_user UNIQUE (user_id, name)
);

-- Enable RLS
ALTER TABLE public.sungrow_credential_profiles ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view their own profiles" 
ON public.sungrow_credential_profiles 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own profiles" 
ON public.sungrow_credential_profiles 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own profiles" 
ON public.sungrow_credential_profiles 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own profiles" 
ON public.sungrow_credential_profiles 
FOR DELETE 
USING (auth.uid() = user_id);

-- Trigger for updated_at
CREATE TRIGGER update_sungrow_credential_profiles_updated_at
BEFORE UPDATE ON public.sungrow_credential_profiles
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();