import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import type { Order, Client, Payment } from '../types'

export interface OrderWithPayments extends Order {
  client: Pick<Client, 'id' | 'name'>
  payments: Payment[]
  totalPaid: number
  remaining: number
  paymentStatus: 'paid' | 'partial' | 'unpaid'
}

export interface UpcomingPayment extends Payment {
  order: Order & { client: Pick<Client, 'id' | 'name'> }
  daysUntil: number
}

export function useFinance() {
  const [orders, setOrders] = useState<OrderWithPayments[]>([])
  const [upcoming, setUpcoming] = useState<UpcomingPayment[]>([])
  const [loading, setLoading] = useState(true)

  const fetch = useCallback(async () => {
    setLoading(true)
    const { data: ordersData } = await supabase
      .from('orders')
      .select('*, client:clients(id, name), payments(*)')
      .in('status', ['new', 'in_progress', 'ready', 'completed'])
      .order('created_at', { ascending: false })

    const withPayments: OrderWithPayments[] = ((ordersData ?? []) as unknown as (Order & { client: Pick<Client, 'id' | 'name'>; payments: Payment[] })[]).map((o) => {
      const pmts = o.payments ?? []
      const totalPaid = pmts.filter((p) => p.is_paid).reduce((s, p) => s + p.amount, 0)
      const remaining = o.total_amount - totalPaid
      const paymentStatus: OrderWithPayments['paymentStatus'] =
        remaining <= 0 ? 'paid' : totalPaid > 0 ? 'partial' : 'unpaid'
      return { ...o, totalPaid, remaining, paymentStatus }
    })

    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const in7Days = new Date(today)
    in7Days.setDate(in7Days.getDate() + 7)

    const upcomingList: UpcomingPayment[] = []
    for (const o of withPayments) {
      for (const p of o.payments ?? []) {
        if (p.is_paid || !p.due_date) continue
        const due = new Date(p.due_date)
        due.setHours(0, 0, 0, 0)
        if (due <= in7Days) {
          const daysUntil = Math.ceil((due.getTime() - today.getTime()) / 86400000)
          upcomingList.push({ ...p, order: o, daysUntil })
        }
      }
    }
    upcomingList.sort((a, b) => a.daysUntil - b.daysUntil)

    setOrders(withPayments)
    setUpcoming(upcomingList)
    setLoading(false)
  }, [])

  useEffect(() => { fetch() }, [fetch])
  return { orders, upcoming, loading, refetch: fetch }
}
