export type ItemStatus =
  | 'sterile'
  | 'in_or'
  | 'decontamination'
  | 'assembly'
  | 'sterilization'
  | 'storage'
  | 'missing'
  | 'damaged'
  | 'expired'

export type ItemType =
  | 'instrument_set'
  | 'sterile_pack'
  | 'implant'
  | 'consumable'
  | 'equipment'

export type ActionType =
  | 'released_to_or'
  | 'received_from_or'
  | 'sent_to_decontamination'
  | 'received_in_assembly'
  | 'sent_for_sterilization'
  | 'released_to_storage'
  | 'released_to_user'
  | 'returned_to_cssd'
  | 'marked_missing'
  | 'reported_damaged'
  | 'sterility_compromised'
  | 'created'
  | 'updated'

export type UserRole =
  | 'cssd_technician'
  | 'cssd_supervisor'
  | 'or_nurse'
  | 'or_supervisor'
  | 'materials_management'
  | 'purchasing'
  | 'infection_control'
  | 'hospital_admin'
  | 'system_admin'

export interface InventoryItem {
  id: string
  qr_code: string
  name: string
  item_type: ItemType
  description: string | null
  status: ItemStatus
  location: string | null
  shelf_location: string | null
  sterilization_date: string | null
  expiry_date: string | null
  last_user_id: string | null
  last_user_name: string | null
  created_at: string
  updated_at: string
}

export interface AuditLog {
  id: string
  item_id: string
  item_name: string
  item_qr_code: string
  action: ActionType
  performed_by_id: string
  performed_by_name: string
  department: string | null
  location: string | null
  device_used: string | null
  notes: string | null
  created_at: string
}

export interface Profile {
  id: string
  full_name: string
  role: UserRole
  department: string | null
  employee_id: string | null
  avatar_initials: string | null
}

export interface SterilizationLoad {
  id: string
  load_number: string
  sterilizer_name: string
  cycle_start: string | null
  cycle_end: string | null
  status: 'loading' | 'running' | 'complete' | 'failed' | 'quarantine'
  biological_indicator: boolean | null
  bi_result: 'pending' | 'pass' | 'fail' | null
  chemical_indicator: boolean | null
  operator_id: string | null
  operator_name: string | null
  created_at: string
}

export interface LoadItem {
  id: string
  load_id: string
  item_id: string
  item_name: string
}

export const STATUS_CONFIG: Record<ItemStatus, { label: string; color: string; bg: string; icon: string }> = {
  sterile:          { label: 'Sterile',         color: '#276749', bg: '#C6F6D5', icon: '✓' },
  in_or:            { label: 'In OR',            color: '#2B6CB0', bg: '#BEE3F8', icon: '⚕' },
  decontamination:  { label: 'Decontamination',  color: '#975A16', bg: '#FEFCBF', icon: '💧' },
  assembly:         { label: 'Assembly',          color: '#6B46C1', bg: '#E9D8FD', icon: '🔧' },
  sterilization:    { label: 'Sterilization',     color: '#C05621', bg: '#FEEBC8', icon: '🔥' },
  storage:          { label: 'Storage',           color: '#2C7A7B', bg: '#E6FFFA', icon: '📦' },
  missing:          { label: 'Missing',           color: '#9B2C2C', bg: '#FED7D7', icon: '⚠' },
  damaged:          { label: 'Damaged',           color: '#744210', bg: '#FEEBC8', icon: '⚡' },
  expired:          { label: 'Expired',           color: '#553C9A', bg: '#EBF4FF', icon: '📅' },
}

export const ACTION_LABELS: Record<ActionType, string> = {
  released_to_or:         'Released to OR',
  received_from_or:       'Received from OR',
  sent_to_decontamination:'Sent to Decontamination',
  received_in_assembly:   'Received in Assembly',
  sent_for_sterilization: 'Sent for Sterilization',
  released_to_storage:    'Released to Storage',
  released_to_user:       'Released to User',
  returned_to_cssd:       'Returned to CSSD',
  marked_missing:         'Marked Missing',
  reported_damaged:       'Reported Damaged',
  sterility_compromised:  'Sterility Compromised',
  created:                'Item Created',
  updated:                'Item Updated',
}
