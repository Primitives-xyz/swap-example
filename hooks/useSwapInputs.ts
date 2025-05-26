import { useCallback, useState } from 'react'
import { SwapMode, TokenInfo } from '../models'
import { isValidAmountInput, validateAmount } from '../utils'

interface UseSwapInputsReturn {
  // State
  inputToken: TokenInfo | null
  outputToken: TokenInfo | null
  inputAmount: string
  outputAmount: string
  swapMode: SwapMode

  // Actions
  setInputToken: (token: TokenInfo) => void
  setOutputToken: (token: TokenInfo) => void
  setInputAmount: (amount: string) => void
  setOutputAmount: (amount: string) => void
  setSwapMode: (mode: SwapMode) => void
  swapTokens: () => void
  handleAmountChange: (value: string, isInput: boolean) => boolean
}

export function useSwapInputs(
  defaultInputToken?: TokenInfo,
  defaultOutputToken?: TokenInfo,
  defaultAmount: string = '',
): UseSwapInputsReturn {
  const [inputToken, setInputToken] = useState<TokenInfo | null>(
    defaultInputToken || null,
  )
  const [outputToken, setOutputToken] = useState<TokenInfo | null>(
    defaultOutputToken || null,
  )
  const [inputAmount, setInputAmount] = useState(defaultAmount)
  const [outputAmount, setOutputAmount] = useState('')
  const [swapMode, setSwapMode] = useState(SwapMode.EXACT_IN)

  const handleAmountChange = useCallback(
    (value: string, isInput: boolean): boolean => {
      if (!isValidAmountInput(value)) {
        return false
      }

      const token = isInput ? inputToken : outputToken
      const decimals = token?.decimals || 6

      if (value !== '' && !validateAmount(value, decimals)) {
        return false
      }

      if (isInput) {
        setInputAmount(value)
        setSwapMode(SwapMode.EXACT_IN)
      } else {
        setOutputAmount(value)
        setSwapMode(SwapMode.EXACT_OUT)
      }

      return true
    },
    [inputToken, outputToken],
  )

  const swapTokens = useCallback(() => {
    const tempToken = inputToken
    const tempAmount = outputAmount

    setInputToken(outputToken)
    setOutputToken(tempToken)
    setInputAmount(tempAmount)
    setOutputAmount(inputAmount)

    // Keep the same swap mode but swap the context
    if (swapMode === SwapMode.EXACT_IN) {
      setSwapMode(SwapMode.EXACT_OUT)
    } else {
      setSwapMode(SwapMode.EXACT_IN)
    }
  }, [inputToken, outputToken, inputAmount, outputAmount, swapMode])

  return {
    inputToken,
    outputToken,
    inputAmount,
    outputAmount,
    swapMode,
    setInputToken,
    setOutputToken,
    setInputAmount,
    setOutputAmount,
    setSwapMode,
    swapTokens,
    handleAmountChange,
  }
}
