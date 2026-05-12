import { useCallback, useEffect, useState } from 'react'
import { localDb } from '../lib/localDb'
import type { Client, Order, Payment } from '../types'
import { calculatePayableAmount, calculateRemainingAmount, calculateTotalPaid } from '../utils/paymentUtils'

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

async function loadFinanceData() {
  const { data } = await localDb
    .from('orders')
    .select('*, client:clients(id, name), payments(*)')
    .in('status', ['new', 'in_progress', 'ready', 'completed'])
    .order('created_at', { ascending: false })

  const withPayments: OrderWithPayments[] = ((data ?? []) as unknown as Array<
    Order & { client: Pick<Client, 'id' | 'name'>; payments: Payment[] }
  >).map((order) => {
    const payments = order.payments ?? []
    const payableAmount = calculatePayableAmount(order.total_amount, order.cashback_applied)
    const totalPaid = calculateTotalPaid(payments)
    const remaining = calculateRemainingAmount(payableAmount, totalPaid)
    const paymentStatus: OrderWithPayments['paymentStatus'] =
      remaining <= 0 ? 'paid' : totalPaid > 0 ? 'partial' : 'unpaid'

    return {
      ...order,
      totalPaid,
      remaining,
      paymentStatus,
    }
  })

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const inSevenDays = new Date(today)
  inSevenDays.setDate(inSevenDays.getDate() + 7)

  const upcoming: UpcomingPayment[] = []

  for (const order of withPayments) {
    for (const payment of order.payments ?? []) {
      if (payment.is_paid || !payment.due_date) continue

      const dueDate = new Date(payment.due_date)
      dueDate.setHours(0, 0, 0, 0)

      if (dueDate <= inSevenDays) {
        const daysUntil = Math.ceil((dueDate.getTime() - today.getTime()) / 86400000)
        upcoming.push({ ...payment, order, daysUntil })
      }
    }
  }

  upcoming.sort((a, b) => a.daysUntil - b.daysUntil)

  return { orders: withPayments, upcoming }
}

export function useFinance() {
  const [orders, setOrders] = useState<OrderWithPayments[]>([])
  const [upcoming, setUpcoming] = useState<UpcomingPayment[]>([])
  const [loading, setLoading] = useState(true)

  const fetchFinance = useCallback(async () => {
    setLoading(true)
    const nextFinance = await loadFinanceData()
    setOrders(nextFinance.orders)
    setUpcoming(nextFinance.upcoming)
    setLoading(false)
  }, [])

  useEffect(() => {
    let cancelled = false

    const load = async () => {
      const nextFinance = await loadFinanceData()
      if (cancelled) return
      setOrders(nextFinance.orders)
      setUpcoming(nextFinance.upcoming)
      setLoading(false)
    }

    void load()

    return () => {
      cancelled = true
    }
  }, [])

  return { orders, upcoming, loading, refetch: fetchFinance }
}
