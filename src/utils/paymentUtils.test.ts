import { describe, expect, it } from 'vitest'
import {
  calculateCashbackBalanceAfterApply,
  calculateCashbackToApply,
  calculatePayableAmount,
  calculateRemainingAmount,
  calculateScheduledPaymentsTotal,
  calculateTotalPaid,
  willPaymentsExceedPayableAmount,
} from './paymentUtils'

describe('paymentUtils', () => {
  it('caps applied cashback by order total', () => {
    expect(calculateCashbackToApply(25000, 10000)).toBe(10000)
    expect(calculateCashbackToApply(5000, 10000)).toBe(5000)
  })

  it('reduces cashback balance only by the applied amount', () => {
    expect(calculateCashbackBalanceAfterApply(25000, 10000)).toBe(15000)
    expect(calculateCashbackBalanceAfterApply(5000, 10000)).toBe(0)
  })

  it('calculates payable amount after cashback', () => {
    expect(calculatePayableAmount(100000, 25000)).toBe(75000)
    expect(calculatePayableAmount(100000, 150000)).toBe(0)
  })

  it('sums only paid payments into total paid', () => {
    expect(calculateTotalPaid([
      { amount: 10000, is_paid: true },
      { amount: 5000, is_paid: false },
      { amount: 20000, is_paid: true },
    ])).toBe(30000)
  })

  it('clamps remaining amount at zero', () => {
    expect(calculateRemainingAmount(75000, 30000)).toBe(45000)
    expect(calculateRemainingAmount(75000, 90000)).toBe(0)
  })

  it('detects payment schedules that exceed payable amount', () => {
    const payableAmount = calculatePayableAmount(100000, 20000)
    const scheduled = calculateScheduledPaymentsTotal([
      { amount: 30000 },
      { amount: 50000 },
    ])

    expect(scheduled).toBe(80000)
    expect(willPaymentsExceedPayableAmount(payableAmount, scheduled)).toBe(false)
    expect(willPaymentsExceedPayableAmount(payableAmount, scheduled + 1)).toBe(true)
  })
})
