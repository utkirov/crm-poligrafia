import { jsPDF } from 'jspdf'
import type { OrderDetail } from '../types'
import { formatCurrency, formatDate } from './format'
import { STATUS_LABELS, PAYMENT_TYPE_LABELS } from './orderUtils'

export function generateOrderPdf(order: OrderDetail) {
  const doc = new jsPDF()

  // Header
  doc.setFontSize(20)
  doc.setFont('helvetica', 'bold')
  doc.text('СЧЁТ', 105, 20, { align: 'center' })

  doc.setFontSize(12)
  doc.setFont('helvetica', 'normal')
  doc.text(`Заказ #${order.order_number}`, 20, 35)
  doc.text(`Дата: ${formatDate(order.created_at)}`, 130, 35)

  // Divider
  doc.setDrawColor(200, 200, 200)
  doc.line(20, 40, 190, 40)

  // Client info
  doc.setFontSize(11)
  doc.setFont('helvetica', 'bold')
  doc.text('Клиент:', 20, 50)
  doc.setFont('helvetica', 'normal')
  doc.text(order.client?.name ?? '—', 60, 50)

  if (order.client?.phone) {
    doc.text('Телефон:', 20, 58)
    doc.text(order.client.phone, 60, 58)
  }

  // Order info
  doc.setFont('helvetica', 'bold')
  doc.text('Название заказа:', 20, 70)
  doc.setFont('helvetica', 'normal')
  doc.text(order.title, 70, 70)

  doc.setFont('helvetica', 'bold')
  doc.text('Статус:', 20, 78)
  doc.setFont('helvetica', 'normal')
  doc.text(STATUS_LABELS[order.status], 70, 78)

  if (order.deadline) {
    doc.setFont('helvetica', 'bold')
    doc.text('Дедлайн:', 20, 86)
    doc.setFont('helvetica', 'normal')
    doc.text(formatDate(order.deadline), 70, 86)
  }

  // Divider
  doc.line(20, 92, 190, 92)

  // Services table header
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(10)
  doc.text('Услуга', 20, 100)
  doc.text('Кол-во', 110, 100)
  doc.text('Цена', 135, 100)
  doc.text('Сумма', 163, 100)
  doc.line(20, 103, 190, 103)

  doc.setFont('helvetica', 'normal')
  let y = 110
  for (const item of order.order_items ?? []) {
    const name = item.service?.name ?? 'Услуга'
    const qty = item.quantity?.toString() ?? '—'
    const price = item.price_per_unit ? formatCurrency(item.price_per_unit) : '—'
    const total = formatCurrency(item.total_price)

    const lines = doc.splitTextToSize(name, 85)
    doc.text(lines, 20, y)
    doc.text(qty, 110, y)
    doc.text(price, 135, y)
    doc.text(total, 163, y)
    y += lines.length * 6 + 2

    if (y > 260) {
      doc.addPage()
      y = 20
    }
  }

  doc.line(20, y, 190, y)
  y += 7

  // Total
  doc.setFont('helvetica', 'bold')
  doc.text('ИТОГО:', 130, y)
  doc.text(formatCurrency(order.total_amount), 163, y)
  y += 10

  // Payment info
  if (order.payments?.length) {
    doc.setFont('helvetica', 'bold')
    doc.text('График оплат:', 20, y)
    doc.setFont('helvetica', 'normal')
    y += 7

    for (const p of order.payments) {
      const typeLabel = p.payment_type ? PAYMENT_TYPE_LABELS[p.payment_type] : '—'
      const status = p.is_paid ? 'Оплачено' : 'Ожидается'
      doc.text(
        `${formatDate(p.due_date)}  ${typeLabel}  ${formatCurrency(p.amount)}  ${status}`,
        20,
        y
      )
      y += 7
    }
  }

  doc.save(`order-${order.order_number}.pdf`)
}
