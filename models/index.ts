// Swap modes
export enum SwapMode {
  EXACT_IN = 'ExactIn',
  EXACT_OUT = 'ExactOut',
}

// Quote response from Jupiter API
export interface QuoteResponse {
  inputMint: string
  inAmount: string
  outputMint: string
  outAmount: string
  otherAmountThreshold: string
  swapMode: string
  slippageBps: number
  platformFee?: {
    amount: string
    feeBps: number
  }
  priceImpactPct: string
  routePlan: {
    swapInfo: {
      ammKey: string
      label: string
      inputMint: string
      outputMint: string
      inAmount: string
      outAmount: string
      feeAmount: string
      feeMint: string
    }
    percent: number
  }[]
  contextSlot: number
  timeTaken: number
  swapUsdValue?: string
  simplerRouteUsed?: boolean
}

// Token information
export interface TokenInfo {
  address: string
  symbol: string
  name: string
  decimals: number
  imageUrl?: string
}

// Swap state
export interface SwapState {
  inputToken: TokenInfo | null
  outputToken: TokenInfo | null
  inputAmount: string
  outputAmount: string
  swapMode: SwapMode
  slippage: number | 'auto'
  priceImpact: string
  loading: boolean
  error: string | null
  quoteResponse: QuoteResponse | null
  isQuoteRefreshing: boolean
}

// Swap transaction result
export interface SwapResult {
  signature: string
  confirmed: boolean
  error?: string
}

// Wallet interface (generic to support different wallet adapters)
export interface WalletInterface {
  publicKey: string
  signTransaction: (transaction: any) => Promise<any>
  connected: boolean
}
