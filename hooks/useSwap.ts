import { Connection, VersionedTransaction } from '@solana/web3.js'
import { useCallback, useEffect, useRef, useState } from 'react'
import {
  DEFAULT_SLIPPAGE_VALUE,
  JUPITER_QUOTE_API_URL,
  PLATFORM_FEE_ACCOUNT,
  PLATFORM_FEE_BPS,
  QUOTE_REFRESH_INTERVAL,
} from '../constants'
import { QuoteResponse, SwapMode, SwapResult, WalletInterface } from '../models'
import { calculateAutoSlippage, toSmallestUnit } from '../utils'

interface UseSwapParams {
  inputMint: string
  outputMint: string
  inputAmount: string
  inputDecimals?: number
  outputDecimals?: number
  wallet: WalletInterface | null
  walletAddress: string
  swapMode?: SwapMode
  rpcUrl?: string
  onSuccess?: (result: SwapResult) => void
  onError?: (error: Error) => void
  swapApiEndpoint: string // Client must provide their API endpoint
}

interface UseSwapReturn {
  // State
  quoteResponse: QuoteResponse | null
  expectedOutput: string
  priceImpact: string
  loading: boolean
  error: string | null
  isQuoteRefreshing: boolean
  txSignature: string
  isFullyConfirmed: boolean

  // Actions
  handleSwap: () => Promise<void>
  refreshQuote: () => void
  resetState: () => void
}

export function useSwap({
  inputMint,
  outputMint,
  inputAmount,
  inputDecimals,
  outputDecimals,
  wallet,
  walletAddress,
  swapMode = SwapMode.EXACT_IN,
  rpcUrl,
  onSuccess,
  onError,
  swapApiEndpoint,
}: UseSwapParams): UseSwapReturn {
  const [quoteResponse, setQuoteResponse] = useState<QuoteResponse | null>(null)
  const [expectedOutput, setExpectedOutput] = useState<string>('')
  const [txSignature, setTxSignature] = useState<string>('')
  const [isFullyConfirmed, setIsFullyConfirmed] = useState<boolean>(false)
  const [isQuoteRefreshing, setIsQuoteRefreshing] = useState<boolean>(false)
  const [loading, setLoading] = useState<boolean>(false)
  const [priceImpact, setPriceImpact] = useState<string>('')
  const [error, setError] = useState<string | null>(null)
  const refreshIntervalRef = useRef<NodeJS.Timeout | null>(null)

  const resetState = useCallback(() => {
    setQuoteResponse(null)
    setExpectedOutput('')
    setPriceImpact('')
    setTxSignature('')
    setError(null)
    setIsFullyConfirmed(false)
    setIsQuoteRefreshing(false)
  }, [])

  const fetchQuote = useCallback(async () => {
    if (
      Number(inputAmount) === 0 ||
      !inputAmount ||
      !inputMint ||
      !outputMint ||
      !outputDecimals ||
      !inputDecimals
    ) {
      resetState()
      return
    }

    try {
      if (quoteResponse) {
        setIsQuoteRefreshing(true)
      } else {
        setLoading(true)
      }

      const inputAmountInDecimals = toSmallestUnit(
        inputAmount,
        inputDecimals,
      ).toString()

      const queryParams = new URLSearchParams({
        inputMint,
        outputMint,
        amount: inputAmountInDecimals,
        slippageBps: DEFAULT_SLIPPAGE_VALUE.toString(),
        platformFeeBps: PLATFORM_FEE_BPS.toString(),
        feeAccount: PLATFORM_FEE_ACCOUNT,
        swapMode,
      })

      const response = await fetch(
        `${JUPITER_QUOTE_API_URL}?${queryParams}`,
      ).then((res) => res.json())

      if (response.error) {
        throw new Error(response.error)
      }

      if (swapMode === SwapMode.EXACT_IN) {
        setExpectedOutput(
          (
            Number(response.outAmount) / Math.pow(10, outputDecimals)
          ).toString(),
        )
      } else {
        setExpectedOutput(
          (Number(response.inAmount) / Math.pow(10, inputDecimals)).toString(),
        )
      }

      setPriceImpact(response.priceImpactPct)
      setQuoteResponse(response)
      setError(null)
    } catch (err) {
      console.error('Quote fetch error:', err)
      setError('Failed to fetch quote')
      if (onError) onError(err as Error)
    } finally {
      setLoading(false)
      setIsQuoteRefreshing(false)
    }
  }, [
    inputAmount,
    inputMint,
    inputDecimals,
    outputMint,
    outputDecimals,
    resetState,
    swapMode,
    quoteResponse,
    onError,
  ])

  const refreshQuote = useCallback(() => {
    if (!isQuoteRefreshing && !loading) {
      fetchQuote()
    }
  }, [isQuoteRefreshing, loading, fetchQuote])

  const handleSwap = async () => {
    if (!wallet || !wallet.connected) {
      const error = new Error('Wallet not connected')
      setError(error.message)
      if (onError) onError(error)
      return
    }

    if (!quoteResponse) {
      const error = new Error('No quote available')
      setError(error.message)
      if (onError) onError(error)
      return
    }

    if (!rpcUrl) {
      const error = new Error('RPC URL not provided')
      setError(error.message)
      if (onError) onError(error)
      return
    }

    setLoading(true)
    setIsFullyConfirmed(false)

    try {
      // Call the client's API endpoint to get the swap transaction
      const response = await fetch(swapApiEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          quoteResponse,
          walletAddress,
          mintAddress: outputMint,
          slippageMode: 'auto',
          slippageBps: calculateAutoSlippage(priceImpact),
          swapMode,
        }),
      }).then((res) => res.json())

      if (response.error) {
        throw new Error(response.error)
      }

      const connection = new Connection(rpcUrl)
      const transaction = VersionedTransaction.deserialize(
        Buffer.from(response.transaction, 'base64'),
      )

      // Sign the transaction
      const signedTransaction = await wallet.signTransaction(transaction)

      // Send the transaction
      const txSig = await connection.sendRawTransaction(
        signedTransaction.serialize(),
      )
      setTxSignature(txSig)

      // Confirm the transaction
      const latestBlockhash = await connection.getLatestBlockhash()
      const confirmation = await connection.confirmTransaction(
        {
          signature: txSig,
          ...latestBlockhash,
        },
        'confirmed',
      )

      if (confirmation.value.err) {
        throw new Error('Transaction failed')
      }

      setIsFullyConfirmed(true)

      const result: SwapResult = {
        signature: txSig,
        confirmed: true,
      }

      if (onSuccess) onSuccess(result)
    } catch (err) {
      console.error('Swap error:', err)
      const error = err as Error
      setError(error.message)
      if (onError) onError(error)
    } finally {
      setLoading(false)
    }
  }

  // Auto-refresh quote
  useEffect(() => {
    if (refreshIntervalRef.current) {
      clearInterval(refreshIntervalRef.current)
      refreshIntervalRef.current = null
    }

    if (
      Number(inputAmount) !== 0 &&
      inputAmount &&
      inputMint &&
      outputMint &&
      !isFullyConfirmed
    ) {
      refreshIntervalRef.current = setInterval(() => {
        if (!isQuoteRefreshing && !loading) fetchQuote()
      }, QUOTE_REFRESH_INTERVAL)
    }

    return () => {
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current)
        refreshIntervalRef.current = null
      }
    }
  }, [
    inputAmount,
    inputMint,
    outputMint,
    loading,
    isFullyConfirmed,
    isQuoteRefreshing,
    fetchQuote,
  ])

  // Fetch quote when inputs change
  useEffect(() => {
    if (
      Number(inputAmount) !== 0 &&
      inputAmount &&
      inputMint &&
      outputMint &&
      !isQuoteRefreshing &&
      !loading
    ) {
      fetchQuote()
    }
  }, [
    inputAmount,
    inputMint,
    outputMint,
    isQuoteRefreshing,
    loading,
    fetchQuote,
  ])

  return {
    quoteResponse,
    expectedOutput,
    priceImpact,
    loading,
    error,
    isQuoteRefreshing,
    txSignature,
    isFullyConfirmed,
    handleSwap,
    refreshQuote,
    resetState,
  }
}
