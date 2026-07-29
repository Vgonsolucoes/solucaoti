export interface User {
  id: string;
  email: string;
  full_name: string;
  position?: string;
  department?: string;
  cpf: string;
  phone?: string;
  whatsapp?: string;
  role: 'admin' | 'operator' | 'master_operator' | 'employee';
  status: 'active' | 'inactive';
  created_at: string;
  updated_at: string;
}

export interface Device {
  id: string;
  code: string;
  name: string;
  type: string;
  brand?: string;
  category?: string;
  serial_number: string;
  asset_number?: string;
  origin: 'Locado' | 'Próprio';
  condition: 'Novo' | 'Usado' | 'Avariado';
  invoice_number?: string;
  rental_value?: number | null;
  notes?: string;
  status: 'available' | 'assigned' | 'waiting_acceptance' | 'damaged';
  created_at: string;
  updated_at: string;
}

export interface Assignment {
  id: string;
  user_id: string;
  device_ids: string[];
  assignment_date: string;
  term_accepted: boolean;
  accepted_at?: string;
  accepted_ip?: string;
  ip_address?: string;
  status: 'pending_approval' | 'approved' | 'rejected' | 'pending';
  created_at: string;
  updated_at: string;
}

export interface Return {
  id: string;
  assignment_id: string;
  return_date: string;
  inspection_checklist: Record<string, boolean>;
  condition: 'Bom' | 'Avariado';
  notes?: string;
  report_type: 'Devolução' | 'Avaria';
  created_at: string;
}
