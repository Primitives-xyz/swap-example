import { useCallback } from 'react'
import { fromSmallestUnit } from '../utils'

interface UseAmountByPercentageParams {
  balance: string | bigint | null
  decimals: number
  onAmountChange: (amount: string) => void
}

interface UseAmountByPercentageReturn {
  setAmountByPercentage: (percentage: number) => void
  getAmountByPercentage: (percentage: number) => string
}

export function useAmountByPercentage({
  balance,
  decimals,
  onAmountChange,
}: UseAmountByPercentageParams): UseAmountByPercentageReturn {
  const getAmountByPercentage = useCallback(
    (percentage: number): string => {
      if (!balance || percentage < 0 || percentage > 100) {
        return '0'
      }

      try {
        const balanceBigInt =
          typeof balance === 'string' ? BigInt(balance) : balance
        const percentageAmount =
          (balanceBigInt * BigInt(percentage)) / BigInt(100)
        return fromSmallestUnit(percentageAmount, decimals)
      } catch (err) {
        console.error('Error calculating percentage amount:', err)
        return '0'
      }
    },
    [balance, decimals],
  )

  const setAmountByPercentage = useCallback(
    (percentage: number) => {
      const amount = getAmountByPercentage(percentage)
      onAmountChange(amount)
    },
    [getAmountByPercentage, onAmountChange],
  )

  return {
    setAmountByPercentage,
    getAmountByPercentage,
  }
}
