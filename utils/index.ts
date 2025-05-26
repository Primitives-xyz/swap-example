// Calculate auto slippage based on price impact
export function calculateAutoSlippage(priceImpactPct: string): number {
  const impact = Math.abs(parseFloat(priceImpactPct))

  // Default to 0.5% (50 bps) if no price impact or invalid
  if (!impact || isNaN(impact)) return 50

  // Scale slippage based on price impact
  if (impact <= 0.1) return 50 // 0.5% slippage for very low impact
  if (impact <= 0.5) return 100 // 1% slippage for low impact
  if (impact <= 1.0) return 200 // 2% slippage for medium impact
  if (impact <= 2.0) return 500 // 5% slippage for high impact
  if (impact <= 5.0) return 1000 // 10% slippage for very high impact
  return 1500 // 15% slippage for extreme impact
}

// Validate amount input
export function validateAmount(value: string, decimals: number = 6): boolean {
  if (value === '') return true

  // Check if the value is a valid number
  const numericValue = Number(value)
  if (isNaN(numericValue)) {
    return false
  }

  // Check if the value is positive
  if (numericValue <= 0) {
    return false
  }

  // Check if the value has too many decimal places
  const decimalParts = value.split('.')
  if (
    decimalParts.length > 1 &&
    decimalParts[1]?.length &&
    decimalParts[1]?.length > decimals
  ) {
    return false
  }

  return true
}

// Format amount with proper decimals
export function formatAmount(
  amount: string | number,
  decimals: number,
): string {
  const num = typeof amount === 'string' ? parseFloat(amount) : amount
  if (isNaN(num)) return '0'

  return num.toFixed(decimals).replace(/\.?0+$/, '')
}

// Convert amount to smallest unit (lamports, etc)
export function toSmallestUnit(
  amount: string | number,
  decimals: number,
): bigint {
  const num = typeof amount === 'string' ? parseFloat(amount) : amount
  if (isNaN(num)) return BigInt(0)

  return BigInt(Math.floor(num * Math.pow(10, decimals)))
}

// Convert from smallest unit to decimal
export function fromSmallestUnit(
  amount: string | bigint,
  decimals: number,
): string {
  const bigIntAmount = typeof amount === 'string' ? BigInt(amount) : amount
  const divisor = BigInt(Math.pow(10, decimals))
  const quotient = bigIntAmount / divisor
  const remainder = bigIntAmount % divisor

  const decimalPart = remainder
    .toString()
    .padStart(decimals, '0')
    .replace(/0+$/, '')

  if (decimalPart === '') {
    return quotient.toString()
  }

  return `${quotient}.${decimalPart}`
}

// Validate input for amount fields
export function isValidAmountInput(value: string): boolean {
  return (
    value === '' ||
    value === '.' ||
    /^[0]?\.[0-9]*$/.test(value) ||
    /^[0-9]*\.?[0-9]*$/.test(value)
  )
}
