import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import type { OrderWithClient } from '../../types'
import { isOverdue } from '../../utils/format'
import { useT } from '../../i18n'

interface Props {
  orders: OrderWithClient[]
}

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate()
}

function getFirstWeekday(year: number, month: number) {
  const day = new Date(year, month, 1).getDay()
  return day === 0 ? 6 : day - 1
}

export function CalendarView({ orders }: Props) {
  const t = useT()
  const navigate = useNavigate()
  const today = new Date()
  const [year, setYear] = useState(today.getFullYear())
  const [month, setMonth] = useState(today.getMonth())

  const prevMonth = () => {
    if (month === 0) { setMonth(11); setYear((y) => y - 1) }
    else setMonth((m) => m - 1)
  }
  const nextMonth = () => {
    if (month === 11) { setMonth(0); setYear((y) => y + 1) }
    else setMonth((m) => m + 1)
  }

  const daysInMonth = getDaysInMonth(year, month)
  const firstWeekday = getFirstWeekday(year, month)

  const ordersByDay: Record<number, OrderWithClient[]> = {}
  orders.forEach((order) => {
    if (!order.deadline) return
    const d = new Date(order.deadline)
    if (d.getFullYear() === year && d.getMonth() === month) {
      const day = d.getDate()
      if (!ordersByDay[day]) ordersByDay[day] = []
      ordersByDay[day].push(order)
    }
  })

  const cells: (number | null)[] = [
    ...Array(firstWeekday).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ]
  while (cells.length % 7 !== 0) cells.push(null)

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <button onClick={prevMonth} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors cursor-pointer">
          <svg className="w-5 h-5 text-slate-600 dark:text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
          {t.calendar.months[month]} {year}
        </h2>
        <button onClick={nextMonth} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors cursor-pointer">
          <svg className="w-5 h-5 text-slate-600 dark:text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
        <div className="grid grid-cols-7 border-b border-slate-200 dark:border-slate-700">
          {t.calendar.weekdays.map((d) => (
            <div key={d} className="px-2 py-3 text-center text-xs font-semibold text-slate-500 dark:text-slate-400">
              {d}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7 divide-x divide-y divide-slate-100 dark:divide-slate-700">
          {cells.map((day, i) => {
            const isToday = day === today.getDate() && month === today.getMonth() && year === today.getFullYear()
            const dayOrders = day ? (ordersByDay[day] ?? []) : []
            return (
              <div key={i} className={`min-h-28 p-2 ${!day ? 'bg-slate-50 dark:bg-slate-800/50' : ''}`}>
                {day && (
                  <>
                    <div className={`w-7 h-7 flex items-center justify-center rounded-full text-sm mb-1
                      ${isToday ? 'bg-blue-600 text-white font-semibold' : 'text-slate-700 dark:text-slate-300'}`}>
                      {day}
                    </div>
                    <div className="flex flex-col gap-1">
                      {dayOrders.slice(0, 3).map((order) => (
                        <button
                          key={order.id}
                          onClick={() => navigate(`/orders/${order.id}`)}
                          className={`
                            w-full text-left px-1.5 py-0.5 rounded text-xs truncate cursor-pointer transition-opacity hover:opacity-80
                            ${isOverdue(order.deadline) ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' : 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'}
                          `}
                        >
                          {order.title}
                        </button>
                      ))}
                      {dayOrders.length > 3 && (
                        <span className="text-xs text-slate-400 dark:text-slate-500 pl-1">+{dayOrders.length - 3} {t.calendar.more}</span>
                      )}
                    </div>
                  </>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
