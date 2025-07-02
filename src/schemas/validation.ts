import * as z from 'zod';

// Schema para configuração Sungrow
export const SungrowConfigSchema = z.object({
  username: z.string().min(1, 'Usuário é obrigatório'),
  password: z.string().min(1, 'Senha é obrigatória'),
  appkey: z.string().min(1, 'App Key é obrigatória'),
  accessKey: z.string().min(1, 'Access Key é obrigatória'),
  plantId: z.string().optional(),
  baseUrl: z.string().url('URL deve ser válida').optional().or(z.literal(''))
});

// Schema para plantas
export const PlantSchema = z.object({
  name: z.string().min(1, 'Nome da planta é obrigatório'),
  lat: z.number().min(-90).max(90, 'Latitude deve estar entre -90 e 90'),
  lng: z.number().min(-180).max(180, 'Longitude deve estar entre -180 e 180'),
  capacity_kwp: z.number().positive('Capacidade deve ser positiva'),
  concessionaria: z.string().min(1, 'Concessionária é obrigatória'),
  start_date: z.string().min(1, 'Data de início é obrigatória'),
  status: z.enum(['active', 'pending_fix', 'maintenance']),
  monitoring_system: z.enum(['manual', 'solaredge', 'sungrow']).optional(),
  api_site_id: z.string().optional(),
  owner_name: z.string().optional(),
  owner_email: z.string().email('Email deve ser válido').optional().or(z.literal('')),
  owner_phone: z.string().optional()
});

// Schema para beneficiários
export const BeneficiarySchema = z.object({
  name: z.string().min(1, 'Nome é obrigatório'),
  cnpj: z.string().min(14, 'CNPJ deve ter pelo menos 14 caracteres'),
  uc_code: z.string().min(1, 'Código UC é obrigatório'),
  allocation_percent: z.number().min(0).max(100, 'Porcentagem deve estar entre 0 e 100')
});

// Schema para faturas
export const InvoiceSchema = z.object({
  uc_code: z.string().min(1, 'Código UC é obrigatório'),
  reference_month: z.string().min(1, 'Mês de referência é obrigatório'),
  energy_kwh: z.number().min(0, 'Energia deve ser positiva'),
  demand_kw: z.number().min(0, 'Demanda deve ser positiva'),
  total_r$: z.number().min(0, 'Total deve ser positivo'),
  taxes_r$: z.number().min(0, 'Impostos devem ser positivos')
});

export type SungrowConfigType = z.infer<typeof SungrowConfigSchema>;
export type PlantType = z.infer<typeof PlantSchema>;
export type BeneficiaryType = z.infer<typeof BeneficiarySchema>;
export type InvoiceType = z.infer<typeof InvoiceSchema>;