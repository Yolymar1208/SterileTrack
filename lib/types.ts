export type ItemStatus =
  | 'sterile' | 'dispensed' | 'received' | 'packed'
  | 'in_or' | 'storage' | 'missing' | 'damaged' | 'expired'

export type ItemType = 'instrument_set' | 'sterile_pack' | 'implant' | 'consumable' | 'equipment'

export type ActionType = string

export type UserRole = 'cssd_technician' | 'cssd_supervisor' | 'or_nurse' | 'or_supervisor'
  | 'materials_management' | 'purchasing' | 'infection_control' | 'hospital_admin' | 'system_admin'

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
  current_remarks: string | null
  last_user_id: string | null
  last_user_name: string | null
  created_at: string
  updated_at: string
}

export interface SetContent {
  id: string
  set_id: string
  instrument_name: string
  quantity: number
  sort_order: number
  notes: string | null
}

export interface Profile {
  id: string
  full_name: string
  role: UserRole
  department: string | null
  employee_id: string | null
  qr_code: string | null
  avatar_initials: string | null
}

export interface AuditLog {
  id: string
  item_id: string
  item_name: string
  item_qr_code: string
  action: string
  performed_by_id: string
  performed_by_name: string
  department: string | null
  location: string | null
  device_used: string | null
  notes: string | null
  created_at: string
}

export const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  sterile:   { label: 'Sterile (Ready)', color: '#276749', bg: '#C6F6D5' },
  dispensed: { label: 'At OR',           color: '#2B6CB0', bg: '#BEE3F8' },
  received:  { label: 'Received',         color: '#975A16', bg: '#FEFCBF' },
  packed:    { label: 'Packed',           color: '#C05621', bg: '#FEEBC8' },
  in_or:     { label: 'At OR',            color: '#2B6CB0', bg: '#BEE3F8' },
  storage:   { label: 'Storage',           color: '#2C7A7B', bg: '#E6FFFA' },
  missing:   { label: 'Missing',           color: '#9B2C2C', bg: '#FED7D7' },
  damaged:   { label: 'Damaged',           color: '#744210', bg: '#FEEBC8' },
  expired:   { label: 'Expired',           color: '#553C9A', bg: '#EBF4FF' },
}

export const ACTION_LABELS: Record<string, string> = {
  received_at_cssd:         'Received at CSSD',
  inspected:                'Inspected',
  packed_for_sterilization: 'Packed for Sterilization',
  sterilization_confirmed:  'Sterilization Confirmed',
  placed_on_shelf:          'Placed on Shelf',
  dispensed_to_or:          'Dispensed to OR',
  returned_to_cssd:         'Returned to CSSD',
  marked_missing:           'Marked Missing',
  reported_damaged:         'Reported Damaged',
  sterility_compromised:    'Sterility Compromised',
  created:                  'Item Created',
  updated:                  'Item Updated',
  released_to_or:           'Dispensed to OR',
  received_from_or:         'Returned from OR',
  sent_to_decontamination:  'Sent to Decontamination',
  received_in_assembly:     'Received in Assembly',
  sent_for_sterilization:   'Sent for Sterilization',
  released_to_storage:      'Placed on Shelf',
  released_to_user:         'Dispensed to Staff',
  set_contents_updated:     'Set Contents Updated',
}
