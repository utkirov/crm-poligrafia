import type { Payment } from '../types'

export function calculateCashbackToApply(balance: number, orderTotal: number) {
  return Math.max(0, Math.min(balance, orderTotal))
}

export function calculateCashbackBalanceAfterApply(balance: number, orderTotal: number) {
  return Math.max(0, balance - calculateCashbackToApply(balance, orderTotal))
}

export function calculatePayableAmount(orderTotal: number, cashbackApplied: number) {
  return Math.max(0, orderTotal - cashbackApplied)
}

export function calculateTotalPaid(payments: Array<Pick<Payment, 'amount' | 'is_paid'>>) {
  return payments.reduce((sum, payment) => sum + (payment.is_paid ? payment.amount : 0), 0)
}

export function calculateScheduledPaymentsTotal(payments: Array<Pick<Payment, 'amount'>>) {
  return payments.reduce((sum, payment) => sum + payment.amount, 0)
}

export function calculateRemainingAmount(payableAmount: number, paidAmount: number) {
  return Math.max(0, payableAmount - paidAmount)
}

export function willPaymentsExceedPayableAmount(payableAmount: number, scheduledAmount: number) {
  return scheduledAmount > payableAmount
}
