import { useState } from 'react'
import {
  DndContext,
  pointerWithin,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  useDroppable,
  type DragStartEvent,
  type DragEndEvent,
  type DragOverEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import type { OrderStatus, OrderWithClient } from '../../types'
import { KANBAN_COLUMNS } from '../../utils/orderUtils'
import { OrderKanbanCard } from './OrderKanbanCard'
import { localDb } from '../../lib/localDb'
import { toastSuccess, toastError } from '../../lib/toast'
import { useAuthStore } from '../../store/authStore'
import { useT } from '../../i18n'

const columnAccent: Record<string, string> = {
  new: 'bg-blue-500',
  in_progress: 'bg-amber-500',
  ready: 'bg-emerald-500',
  completed: 'bg-slate-400',
}

const columnCount: Record<string, string> = {
  new: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
  in_progress: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
  ready: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
  completed: 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-400',
}

const STAGGER = ['delay-0', 'delay-50', 'delay-100', 'delay-150', 'delay-200', 'delay-250', 'delay-300', 'delay-350', 'delay-400']

const isBackwardMove = (from: OrderStatus, to: OrderStatus) =>
  from === 'ready' && (to === 'new' || to === 'in_progress')

const todayStr = () => new Date().toISOString().slice(0, 10)

interface ConfirmModalProps {
  from: OrderStatus
  to: OrderStatus
  onConfirm: () => void
  onCancel: () => void
}

function BackwardMoveModal({ from, to, onConfirm, onCancel }: ConfirmModalProps) {
  const t = useT()
  const statusLabels: Record<OrderStatus, string> = {
    new: t.status.new,
    in_progress: t.status.in_progress,
    ready: t.status.ready,
    completed: t.status.completed,
    cancelled: t.status.cancelled,
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 dark:bg-black/60 backdrop-blur-sm" onClick={onCancel} />
      <div className="relative bg-white dark:bg-slate-900 border border-transparent dark:border-slate-700 rounded-2xl shadow-2xl w-full max-w-md p-6 animate-scale-in">
        <div className="flex items-start gap-4 mb-5">
          <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-900/40 flex items-center justify-center shrink-0">
            <svg className="w-5 h-5 text-amber-600 dark:text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <div>
            <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100 mb-1">{t.kanban.backwardMove}</h3>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              {t.kanban.backwardFrom}{' '}
              <span className="font-medium text-emerald-700 dark:text-emerald-400">"{statusLabels[from]}"</span>{' '}
              {t.kanban.backwardInto}{' '}
              <span className="font-medium text-blue-700 dark:text-blue-400">"{statusLabels[to]}"</span>.{' '}
              {t.kanban.backwardText}
            </p>
          </div>
        </div>

        <div className="flex gap-3 justify-end">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
          >
            {t.common.cancel}
          </button>
          <button
            onClick={onConfirm}
            className="px-4 py-2 text-sm font-semibold text-white bg-amber-500 hover:bg-amber-600 rounded-xl transition-colors cursor-pointer shadow-sm"
          >
            {t.kanban.backwardConfirm}
          </button>
        </div>
      </div>
    </div>
  )
}

function SortableCard({ order }: { order: OrderWithClient }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: order.id })

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.3 : 1,
      }}
      {...attributes}
      {...listeners}
    >
      <OrderKanbanCard order={order} />
    </div>
  )
}

function KanbanColumn({
  status,
  label,
  orders,
  colIdx,
}: {
  status: string
  label: string
  orders: OrderWithClient[]
  colIdx: number
}) {
  const t = useT()
  const { setNodeRef, isOver } = useDroppable({ id: `col::${status}` })

  return (
    <div className={`flex-none min-w-[280px] xl:min-w-0 xl:flex-1 animate-fade-in-up ${STAGGER[colIdx] ?? 'delay-0'}`}>
      <div className="flex items-center justify-between mb-3 px-1">
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${columnAccent[status] ?? 'bg-slate-400'}`} />
          <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300">{label}</h3>
        </div>
        <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${columnCount[status] ?? 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-400'}`}>
          {orders.length}
        </span>
      </div>

      <SortableContext id={status} items={orders.map((order) => order.id)} strategy={verticalListSortingStrategy}>
        <div
          ref={setNodeRef}
          className={`flex flex-col gap-2.5 min-h-[100px] rounded-xl transition-all duration-150 p-1 -m-1 ${
            isOver ? 'bg-blue-50/60 dark:bg-blue-900/20 ring-2 ring-blue-200 dark:ring-blue-800 ring-inset' : ''
          }`}
        >
          {orders.map((order, index) => (
            <div key={order.id} className={`animate-fade-in-up ${STAGGER[Math.min(index, STAGGER.length - 1)]}`}>
              <SortableCard order={order} />
            </div>
          ))}

          {orders.length === 0 && (
            <div className={`border-2 border-dashed rounded-xl p-5 text-center transition-colors duration-150 ${
              isOver ? 'border-blue-300 dark:border-blue-700 bg-blue-50 dark:bg-blue-900/20' : 'border-slate-200 dark:border-slate-700'
            }`}>
              <p className="text-xs text-slate-400 dark:text-slate-600">{t.kanban.dropHere}</p>
            </div>
          )}
        </div>
      </SortableContext>
    </div>
  )
}

interface PendingMove {
  orderId: string
  fromStatus: OrderStatus
  toStatus: OrderStatus
}

interface Props {
  orders: OrderWithClient[]
}

export function KanbanView({ orders: propOrders }: Props) {
  const t = useT()
  const user = useAuthStore((state) => state.user)
  const [statusOverrides, setStatusOverrides] = useState<Record<string, OrderStatus>>({})
  const [activeOrder, setActiveOrder] = useState<OrderWithClient | null>(null)
  const [overStatus, setOverStatus] = useState<OrderStatus | null>(null)
  const [pendingMove, setPendingMove] = useState<PendingMove | null>(null)
  const [confirming, setConfirming] = useState(false)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
  )

  const orders = propOrders.map((order) => {
    const override = statusOverrides[order.id]
    return override ? { ...order, status: override } : order
  })

  const statusLabels: Record<OrderStatus, string> = {
    new: t.status.new,
    in_progress: t.status.in_progress,
    ready: t.status.ready,
    completed: t.status.completed,
    cancelled: t.status.cancelled,
  }

  const handleDragOver = ({ over }: DragOverEvent) => {
    if (!over) {
      setOverStatus(null)
      return
    }

    const overId = String(over.id)
    if (overId.startsWith('col::')) {
      setOverStatus(overId.slice(5) as OrderStatus)
      return
    }

    const card = orders.find((order) => order.id === overId)
    setOverStatus(card?.status ?? null)
  }

  const handleDragStart = ({ active }: DragStartEvent) => {
    setActiveOrder(orders.find((order) => order.id === active.id) ?? null)
  }

  const handleDragEnd = async ({ active }: DragEndEvent) => {
    setActiveOrder(null)
    const targetStatus = overStatus
    setOverStatus(null)

    if (!targetStatus) {
      return
    }

    const dragged = orders.find((order) => order.id === active.id)
    if (!dragged || dragged.status === targetStatus) {
      return
    }

    if (isBackwardMove(dragged.status, targetStatus)) {
      setStatusOverrides((prev) => ({ ...prev, [dragged.id]: targetStatus }))
      setPendingMove({ orderId: dragged.id, fromStatus: dragged.status, toStatus: targetStatus })
      return
    }

    setStatusOverrides((prev) => ({ ...prev, [dragged.id]: targetStatus }))

    const { error } = await localDb.from('orders').update({ status: targetStatus }).eq('id', dragged.id)
    if (error) {
      toastError(t.dashboard.loadError)
      setStatusOverrides((prev) => {
        const next = { ...prev }
        delete next[dragged.id]
        return next
      })
      return
    }

    toastSuccess(`${t.kanban.movedTo} "${statusLabels[targetStatus]}"`)
  }

  const handleConfirmBackward = async () => {
    if (!pendingMove || confirming) {
      return
    }

    setConfirming(true)

    const { orderId, fromStatus, toStatus } = pendingMove
    const { error } = await localDb.from('orders').update({ status: toStatus }).eq('id', orderId)

    if (error) {
      toastError(t.dashboard.loadError)
      setStatusOverrides((prev) => {
        const next = { ...prev }
        delete next[orderId]
        return next
      })
    } else {
      await localDb.from('order_timeline').insert({
        order_id: orderId,
        user_id: user?.id ?? '',
        event_type: 'status_changed',
        description: `${statusLabels[fromStatus]} -> ${statusLabels[toStatus]}`,
      })
      toastSuccess(`${t.kanban.movedTo} "${statusLabels[toStatus]}"`)
    }

    setPendingMove(null)
    setConfirming(false)
  }

  const handleCancelBackward = () => {
    if (!pendingMove) {
      return
    }

    setStatusOverrides((prev) => {
      const next = { ...prev }
      delete next[pendingMove.orderId]
      return next
    })
    setPendingMove(null)
  }

  const today = todayStr()
  const visibleOrders = orders.filter((order) =>
    order.status !== 'completed' || (order.updated_at ?? order.created_at)?.slice(0, 10) === today
  )

  return (
    <>
      <DndContext
        sensors={sensors}
        collisionDetection={pointerWithin}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
      >
        <div className="flex xl:grid xl:grid-cols-4 items-start gap-5 overflow-x-auto xl:overflow-x-visible pb-4 min-h-[calc(100vh-200px)] pr-1">
          {KANBAN_COLUMNS.map(({ status }, colIdx) => (
            <KanbanColumn
              key={status}
              status={status}
              label={statusLabels[status]}
              orders={visibleOrders.filter((order) => order.status === status)}
              colIdx={colIdx}
            />
          ))}
        </div>

        <DragOverlay dropAnimation={{ duration: 200, easing: 'cubic-bezier(0.16,1,0.3,1)' }}>
          {activeOrder && (
            <div className="rotate-1 scale-105 opacity-95 shadow-2xl shadow-slate-400/30">
              <OrderKanbanCard order={activeOrder} />
            </div>
          )}
        </DragOverlay>
      </DndContext>

      {pendingMove && (
        <BackwardMoveModal
          from={pendingMove.fromStatus}
          to={pendingMove.toStatus}
          onConfirm={handleConfirmBackward}
          onCancel={handleCancelBackward}
        />
      )}
    </>
  )
}
