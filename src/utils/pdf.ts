import html2canvas from 'html2canvas'
import { jsPDF } from 'jspdf'
import type { OrderDetail } from '../types'
import { formatCurrency, formatDate } from './format'
import { PAYMENT_TYPE_LABELS, STATUS_LABELS } from './orderUtils'

function escapeHtml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
}

export async function generateOrderPdf(order: OrderDetail) {
  const container = document.createElement('div')
  const servicesRows = (order.order_items ?? [])
    .map((item) => {
      const serviceName = escapeHtml(item.service?.name ?? 'Услуга')
      const quantity = item.quantity?.toString() ?? '-'
      const price = item.price_per_unit ? formatCurrency(item.price_per_unit) : '-'
      const total = formatCurrency(item.total_price)

      return `
        <tr>
          <td>${serviceName}</td>
          <td class="num">${quantity}</td>
          <td class="num">${price}</td>
          <td class="num strong">${total}</td>
        </tr>
      `
    })
    .join('')

  const paymentsRows = (order.payments ?? [])
    .map((payment) => {
      const paymentType = payment.payment_type ? PAYMENT_TYPE_LABELS[payment.payment_type] : '-'
      const status = payment.is_paid ? 'Оплачено' : 'Ожидается'

      return `
        <tr>
          <td>${formatDate(payment.due_date)}</td>
          <td>${escapeHtml(paymentType)}</td>
          <td class="num">${formatCurrency(payment.amount)}</td>
          <td>${status}</td>
        </tr>
      `
    })
    .join('')

  container.style.position = 'fixed'
  container.style.left = '-99999px'
  container.style.top = '0'
  container.style.width = '900px'
  container.style.background = '#ffffff'
  container.style.color = '#0f172a'
  container.style.padding = '32px'
  container.style.fontFamily = 'Arial, sans-serif'

  container.innerHTML = `
    <style>
      .pdf-root { color: #0f172a; font-size: 14px; line-height: 1.45; }
      .pdf-title { font-size: 28px; font-weight: 700; margin: 0 0 8px; }
      .pdf-subtitle { font-size: 14px; color: #475569; margin: 0; }
      .pdf-section { margin-top: 28px; }
      .pdf-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px 24px; margin-top: 16px; }
      .pdf-card { border: 1px solid #cbd5e1; border-radius: 16px; padding: 18px; }
      .pdf-label { color: #64748b; font-size: 12px; margin-bottom: 4px; }
      .pdf-value { font-size: 14px; font-weight: 600; }
      .pdf-table { width: 100%; border-collapse: collapse; margin-top: 14px; }
      .pdf-table th { text-align: left; font-size: 12px; color: #64748b; padding: 10px 12px; border-bottom: 1px solid #cbd5e1; }
      .pdf-table td { padding: 12px; border-bottom: 1px solid #e2e8f0; vertical-align: top; }
      .pdf-table .num { text-align: right; white-space: nowrap; }
      .pdf-table .strong { font-weight: 700; }
      .pdf-total { display: flex; justify-content: flex-end; gap: 24px; margin-top: 16px; font-size: 18px; font-weight: 700; }
      .pdf-muted { color: #64748b; }
      .pdf-badge { display: inline-block; margin-left: 8px; padding: 4px 10px; border-radius: 999px; background: #dbeafe; color: #1d4ed8; font-size: 12px; font-weight: 700; }
    </style>
    <div class="pdf-root">
      <div>
        <h1 class="pdf-title">Счет по заказу #${order.order_number}</h1>
        <p class="pdf-subtitle">${escapeHtml(order.title)}</p>
      </div>

      <div class="pdf-grid">
        <div class="pdf-card">
          <div class="pdf-label">Клиент</div>
          <div class="pdf-value">${escapeHtml(order.client?.name ?? '-')}</div>
          <div class="pdf-muted">${escapeHtml(order.client?.phone ?? '-')}</div>
        </div>
        <div class="pdf-card">
          <div class="pdf-label">Менеджер</div>
          <div class="pdf-value">${escapeHtml(order.manager?.name ?? '-')}</div>
          <div class="pdf-muted">Статус: ${escapeHtml(STATUS_LABELS[order.status])}</div>
        </div>
        <div class="pdf-card">
          <div class="pdf-label">Дата создания</div>
          <div class="pdf-value">${formatDate(order.created_at)}</div>
        </div>
        <div class="pdf-card">
          <div class="pdf-label">Дедлайн</div>
          <div class="pdf-value">${formatDate(order.deadline)}</div>
        </div>
      </div>

      <div class="pdf-section">
        <div class="pdf-title" style="font-size: 18px; margin-bottom: 0;">Услуги</div>
        <table class="pdf-table">
          <thead>
            <tr>
              <th>Услуга</th>
              <th class="num">Кол-во</th>
              <th class="num">Цена</th>
              <th class="num">Сумма</th>
            </tr>
          </thead>
          <tbody>
            ${servicesRows || '<tr><td colspan="4">Нет услуг</td></tr>'}
          </tbody>
        </table>
        <div class="pdf-total">
          <span>Итого</span>
          <span>${formatCurrency(order.total_amount)}</span>
        </div>
      </div>

      <div class="pdf-section">
        <div class="pdf-title" style="font-size: 18px; margin-bottom: 0;">Оплаты</div>
        <table class="pdf-table">
          <thead>
            <tr>
              <th>Дата</th>
              <th>Тип</th>
              <th class="num">Сумма</th>
              <th>Статус</th>
            </tr>
          </thead>
          <tbody>
            ${paymentsRows || '<tr><td colspan="4">Нет платежей</td></tr>'}
          </tbody>
        </table>
      </div>
    </div>
  `

  document.body.appendChild(container)

  try {
    const canvas = await html2canvas(container, {
      scale: 2,
      backgroundColor: '#ffffff',
      useCORS: true,
    })

    const imageData = canvas.toDataURL('image/png')
    const pdf = new jsPDF({ orientation: 'p', unit: 'pt', format: 'a4' })
    const pageWidth = pdf.internal.pageSize.getWidth()
    const pageHeight = pdf.internal.pageSize.getHeight()
    const margin = 24
    const renderWidth = pageWidth - margin * 2
    const renderHeight = (canvas.height * renderWidth) / canvas.width

    let heightLeft = renderHeight
    let position = margin

    pdf.addImage(imageData, 'PNG', margin, position, renderWidth, renderHeight)
    heightLeft -= pageHeight - margin * 2

    while (heightLeft > 0) {
      position = margin - (renderHeight - heightLeft)
      pdf.addPage()
      pdf.addImage(imageData, 'PNG', margin, position, renderWidth, renderHeight)
      heightLeft -= pageHeight - margin * 2
    }

    pdf.save(`order-${order.order_number}.pdf`)
  } finally {
    document.body.removeChild(container)
  }
}
