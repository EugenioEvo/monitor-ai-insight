
import { Plant, Beneficiary, Invoice, Reading, Ticket, Savings, Alert } from '@/types';

export const mockPlants: Plant[] = [
  {
    id: '1',
    name: 'Usina Solar Nordeste',
    lat: -8.047,
    lng: -34.877,
    capacity_kWp: 150.5,
    concessionaria: 'Neoenergia Pernambuco',
    start_date: '2023-06-15',
    status: 'active'
  },
  {
    id: '2', 
    name: 'Planta Solar Sul',
    lat: -25.428,
    lng: -49.273,
    capacity_kWp: 89.2,
    concessionaria: 'Copel',
    start_date: '2023-08-20',
    status: 'active'
  }
];

export const mockBeneficiaries: Beneficiary[] = [
  {
    id: '1',
    plant_id: '1',
    uc_code: '1234567890',
    cnpj: '12.345.678/0001-90',
    name: 'Empresa ABC Ltda',
    allocation_percent: 60
  },
  {
    id: '2',
    plant_id: '1', 
    uc_code: '0987654321',
    cnpj: '98.765.432/0001-10',
    name: 'Indústria XYZ S.A.',
    allocation_percent: 40
  }
];

export const mockInvoices: Invoice[] = [
  {
    id: '1',
    file_url: '/invoices/fatura_202412.pdf',
    uc_code: '1234567890',
    reference_month: '2024-12',
    energy_kWh: 1250.5,
    demand_kW: 25.8,
    total_R$: 890.45,
    taxes_R$: 178.09,
    status: 'processed'
  }
];

export const mockReadings: Reading[] = [
  {
    id: '1',
    plant_id: '1',
    timestamp: '2024-12-18T12:00:00Z',
    power_W: 125000,
    energy_kWh: 156.2
  }
];

export const mockTickets: Ticket[] = [
  {
    id: '1',
    plant_id: '1',
    priority: 'P2',
    opened_at: '2024-12-18T08:30:00Z',
    status: 'open',
    description: 'Queda de performance detectada - Inversor 3',
    type: 'performance'
  }
];

export const mockSavings: Savings[] = [
  {
    id: '1',
    beneficiary_id: '1',
    month: '2024-12',
    credits_kWh: 750.3,
    savings_R$: 534.21
  }
];

export const mockAlerts: Alert[] = [
  {
    id: '1',
    timestamp: '2024-12-18T09:15:00Z',
    severity: 'medium',
    message: 'Performance 18% abaixo da meta - Usina Solar Nordeste',
    plant_id: '1',
    type: 'performance'
  }
];
