import { useEffect } from 'react'
import {
  SOL_MINT,
  SwapMode,
  TokenInfo,
  USDC_MINT,
  useAmountByPercentage,
  useSwap,
  useSwapInputs,
} from '../index'

// Example wallet adapter interface
interface WalletAdapter {
  publicKey: { toString(): string }
  signTransaction: (tx: any) => Promise<any>
  connected: boolean
}

interface SwapWidgetProps {
  wallet: WalletAdapter | null
  onSuccess?: (txSignature: string) => void
  onError?: (error: Error) => void
  rpcUrl?: string
  swapApiEndpoint: string
  // Optional: provide token balance hook
  useTokenBalance?: (mint: string) => { balance: string; rawBalance: bigint }
}

// Example implementation of the swap widget
export function SwapWidget({
  wallet,
  onSuccess,
  onError,
  rpcUrl = process.env.NEXT_PUBLIC_RPC_URL ||
    'https://api.mainnet-beta.solana.com',
  swapApiEndpoint,
  useTokenBalance,
}: SwapWidgetProps) {
  // Initialize with SOL -> USDC swap
  const defaultInputToken: TokenInfo = {
    address: SOL_MINT,
    symbol: 'SOL',
    name: 'Solana',
    decimals: 9,
    imageUrl: '/tokens/sol.png',
  }

  const defaultOutputToken: TokenInfo = {
    address: USDC_MINT,
    symbol: 'USDC',
    name: 'USD Coin',
    decimals: 6,
    imageUrl: '/tokens/usdc.png',
  }

  // Manage swap inputs
  const {
    inputToken,
    outputToken,
    inputAmount,
    outputAmount,
    swapMode,
    setInputToken,
    setOutputToken,
    setOutputAmount,
    setInputAmount,
    handleAmountChange,
    swapTokens,
  } = useSwapInputs(defaultInputToken, defaultOutputToken, '1')

  // Get token balance if hook is provided
  const inputBalance = useTokenBalance?.(inputToken?.address || '')

  // Setup percentage buttons
  const { setAmountByPercentage } = useAmountByPercentage({
    balance: inputBalance?.rawBalance || null,
    decimals: inputToken?.decimals || 9,
    onAmountChange: (amount) => handleAmountChange(amount, true),
  })

  // Wallet interface adapter
  const walletInterface = wallet
    ? {
        publicKey: wallet.publicKey.toString(),
        signTransaction: wallet.signTransaction.bind(wallet),
        connected: wallet.connected,
      }
    : null

  // Setup swap hook
  const {
    expectedOutput,
    priceImpact,
    loading,
    error,
    isQuoteRefreshing,
    txSignature,
    isFullyConfirmed,
    handleSwap,
    refreshQuote,
  } = useSwap({
    inputMint: inputToken?.address || SOL_MINT,
    outputMint: outputToken?.address || USDC_MINT,
    inputAmount: swapMode === SwapMode.EXACT_IN ? inputAmount : outputAmount,
    inputDecimals: inputToken?.decimals,
    outputDecimals: outputToken?.decimals,
    wallet: walletInterface,
    walletAddress: wallet?.publicKey.toString() || '',
    swapMode,
    rpcUrl,
    swapApiEndpoint,
    onSuccess: (result) => {
      console.log('Swap successful:', result.signature)
      onSuccess?.(result.signature)
    },
    onError: (error) => {
      console.error('Swap failed:', error)
      onError?.(error)
    },
  })

  // Update amounts based on quote
  useEffect(() => {
    if (swapMode === SwapMode.EXACT_IN && expectedOutput) {
      setOutputAmount(expectedOutput)
    } else if (swapMode === SwapMode.EXACT_OUT && expectedOutput) {
      setInputAmount(expectedOutput)
    }
  }, [expectedOutput, swapMode, setOutputAmount, setInputAmount])

  // Example token selector (you would implement your own)
  const selectToken = (isInput: boolean) => {
    // This is where you would open your token selector modal
    console.log(`Select ${isInput ? 'input' : 'output'} token`)

    // Example: switching to a different token
    const exampleToken: TokenInfo = {
      address: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
      symbol: 'USDC',
      name: 'USD Coin',
      decimals: 6,
      imageUrl: '/tokens/usdc.png',
    }

    if (isInput) {
      setInputToken(exampleToken)
    } else {
      setOutputToken(exampleToken)
    }
  }

  return (
    <div className="swap-widget">
      {/* Input Section */}
      <div className="swap-input-section">
        <div className="token-amount-input">
          <input
            type="text"
            value={inputAmount}
            onChange={(e) => handleAmountChange(e.target.value, true)}
            placeholder="0.00"
            className="amount-input"
          />
          <button
            onClick={() => selectToken(true)}
            className="token-select-button"
          >
            {inputToken?.symbol || 'Select Token'}
          </button>
        </div>

        {/* Balance and percentage buttons */}
        {inputBalance && (
          <div className="balance-section">
            <span>Balance: {inputBalance.balance}</span>
            <div className="percentage-buttons">
              <button onClick={() => setAmountByPercentage(25)}>25%</button>
              <button onClick={() => setAmountByPercentage(50)}>50%</button>
              <button onClick={() => setAmountByPercentage(75)}>75%</button>
              <button onClick={() => setAmountByPercentage(100)}>MAX</button>
            </div>
          </div>
        )}
      </div>

      {/* Swap Direction Button */}
      <button onClick={swapTokens} className="swap-direction-button">
        ⇅
      </button>

      {/* Output Section */}
      <div className="swap-output-section">
        <div className="token-amount-input">
          <input
            type="text"
            value={outputAmount}
            onChange={(e) => handleAmountChange(e.target.value, false)}
            placeholder="0.00"
            className="amount-input"
          />
          <button
            onClick={() => selectToken(false)}
            className="token-select-button"
          >
            {outputToken?.symbol || 'Select Token'}
          </button>
        </div>
      </div>

      {/* Swap Info */}
      <div className="swap-info">
        {priceImpact && (
          <div className="info-row">
            <span>Price Impact:</span>
            <span className={parseFloat(priceImpact) > 5 ? 'high-impact' : ''}>
              {parseFloat(priceImpact).toFixed(2)}%
            </span>
          </div>
        )}

        {isQuoteRefreshing && (
          <div className="quote-refresh-indicator">Refreshing quote...</div>
        )}
      </div>

      {/* Swap Button */}
      <button
        onClick={handleSwap}
        disabled={
          loading || !wallet?.connected || !inputAmount || inputAmount === '0'
        }
        className="swap-button"
      >
        {!wallet?.connected
          ? 'Connect Wallet'
          : loading
            ? 'Swapping...'
            : 'Swap'}
      </button>

      {/* Manual Refresh */}
      <button onClick={refreshQuote} className="refresh-button">
        Refresh Quote
      </button>

      {/* Error Display */}
      {error && <div className="error-message">Error: {error}</div>}

      {/* Success Message */}
      {isFullyConfirmed && txSignature && (
        <div className="success-message">
          Swap successful!
          <a
            href={`https://solscan.io/tx/${txSignature}`}
            target="_blank"
            rel="noopener noreferrer"
          >
            View transaction
          </a>
        </div>
      )}
    </div>
  )
}
