import type { Client, ClientType, OrderPriority, PaymentType } from '../../types'

export interface NewClientDraft {
  type: ClientType
  name: string
  lastName: string
  phone: string
  telegram: string
  source: string          // 'social_media' | 'flyer' | 'referral' | 'other' | ''
  referrerId: string | null
  referrerName: string    // display only
}

export interface OrderItemDraft {
  id: string
  serviceId: string
  serviceName: string
  quantity: string
  pricePerUnit: string
  totalPrice: string
  isAutoTotal: boolean
}

export interface PaymentDraft {
  id: string
  amount: string
  dueDate: string
  paymentType: PaymentType
}

export type PaymentMode = 'full' | 'partial'

export interface OrderFormState {
  // Step 1
  selectedClient: Client | null
  newClient: NewClientDraft

  // Step 2
  title: string
  description: string
  orderItems: OrderItemDraft[]
  deadline: string
  priority: OrderPriority
  isUrgent: boolean

  // Step 3
  totalAmount: string
  costPrice: string
  paymentMode: PaymentMode
  payments: PaymentDraft[]
  applyCashback: boolean
}

export const INITIAL_FORM_STATE: OrderFormState = {
  selectedClient: null,
  newClient: {
    type: 'individual',
    name: '',
    lastName: '',
    phone: '',
    telegram: '',
    source: '',
    referrerId: null,
    referrerName: '',
  },
  title: '',
  description: '',
  orderItems: [],
  deadline: '',
  priority: 'medium',
  isUrgent: false,
  totalAmount: '0',
  costPrice: '0',
  paymentMode: 'full',
  payments: [{ id: crypto.randomUUID(), amount: '', dueDate: '', paymentType: 'cash' }],
  applyCashback: false,
}
