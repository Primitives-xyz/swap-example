# Solana Swap SDK

A clean, reusable swap implementation for Solana that separates business logic from UI components. This SDK provides all the hooks and utilities needed to implement token swaps using Jupiter aggregator.

## Features

- 🔄 Token swap functionality with Jupiter aggregator
- 💱 Support for Exact In and Exact Out swap modes
- 🔄 Auto-refresh quotes every 15 seconds
- 📊 Price impact calculation and auto-slippage
- 💰 Platform fee support
- 🎣 React hooks for easy integration
- 🛠️ Utility functions for amount formatting and validation

## Basic Usage

### 1. Simple Swap Implementation

```tsx
import {
  useSwap,
  useSwapInputs,
  SwapMode,
  SOL_MINT,
  USDC_MINT,
} from "./swap-sdk";

function SwapComponent() {
  const {
    inputToken,
    outputToken,
    inputAmount,
    outputAmount,
    swapMode,
    setInputToken,
    setOutputToken,
    handleAmountChange,
    swapTokens,
  } = useSwapInputs();

  const {
    expectedOutput,
    priceImpact,
    loading,
    error,
    isQuoteRefreshing,
    handleSwap,
  } = useSwap({
    inputMint: inputToken?.address || SOL_MINT,
    outputMint: outputToken?.address || USDC_MINT,
    inputAmount: swapMode === SwapMode.EXACT_IN ? inputAmount : outputAmount,
    inputDecimals: inputToken?.decimals,
    outputDecimals: outputToken?.decimals,
    wallet: wallet, // Your wallet adapter
    walletAddress: walletAddress,
    swapMode: swapMode,
    rpcUrl: "https://api.mainnet-beta.solana.com",
    swapApiEndpoint: "/api/jupiter/swap", // Your API endpoint
    onSuccess: (result) => {
      console.log("Swap successful:", result.signature);
    },
    onError: (error) => {
      console.error("Swap failed:", error);
    },
  });

  // Update output amount when quote changes
  useEffect(() => {
    if (swapMode === SwapMode.EXACT_IN && expectedOutput) {
      setOutputAmount(expectedOutput);
    } else if (swapMode === SwapMode.EXACT_OUT && expectedOutput) {
      setInputAmount(expectedOutput);
    }
  }, [expectedOutput, swapMode]);

  return (
    <div>
      {/* Input Token Section */}
      <div>
        <input
          value={inputAmount}
          onChange={(e) => handleAmountChange(e.target.value, true)}
          placeholder="0.00"
        />
        <button
          onClick={() => {
            /* Open token selector */
          }}
        >
          {inputToken?.symbol || "Select Token"}
        </button>
      </div>

      {/* Swap Direction Button */}
      <button onClick={swapTokens}>⇅</button>

      {/* Output Token Section */}
      <div>
        <input
          value={outputAmount}
          onChange={(e) => handleAmountChange(e.target.value, false)}
          placeholder="0.00"
        />
        <button
          onClick={() => {
            /* Open token selector */
          }}
        >
          {outputToken?.symbol || "Select Token"}
        </button>
      </div>

      {/* Price Impact */}
      {priceImpact && (
        <div>Price Impact: {parseFloat(priceImpact).toFixed(2)}%</div>
      )}

      {/* Swap Button */}
      <button onClick={handleSwap} disabled={loading || !wallet}>
        {loading ? "Swapping..." : "Swap"}
      </button>

      {/* Error Display */}
      {error && <div>Error: {error}</div>}
    </div>
  );
}
```

### 2. Using Amount by Percentage

```tsx
import { useAmountByPercentage } from "./swap-sdk";

function QuickAmountButtons({ balance, decimals, onAmountChange }) {
  const { setAmountByPercentage } = useAmountByPercentage({
    balance: balance, // Raw balance in smallest unit
    decimals: decimals,
    onAmountChange: onAmountChange,
  });

  return (
    <div>
      <button onClick={() => setAmountByPercentage(25)}>25%</button>
      <button onClick={() => setAmountByPercentage(50)}>50%</button>
      <button onClick={() => setAmountByPercentage(75)}>75%</button>
      <button onClick={() => setAmountByPercentage(100)}>MAX</button>
    </div>
  );
}
```

### 3. API Endpoint Implementation

Your API endpoint should handle the swap transaction creation:

```typescript
// /api/jupiter/swap
export async function POST(request: Request) {
  const {
    quoteResponse,
    walletAddress,
    mintAddress,
    slippageMode,
    slippageBps,
    swapMode,
  } = await request.json();

  // Get swap transaction from Jupiter
  const swapResponse = await fetch("https://quote-api.jup.ag/v6/swap", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      quoteResponse,
      userPublicKey: walletAddress,
      wrapAndUnwrapSol: true,
      slippageMode,
      slippageBps,
      swapMode,
    }),
  });

  const swapData = await swapResponse.json();

  if (swapData.error) {
    return Response.json({ error: swapData.error }, { status: 400 });
  }

  return Response.json({
    transaction: swapData.swapTransaction,
  });
}
```

## Hooks Reference

### useSwap

Main hook for executing token swaps.

```typescript
const {
  quoteResponse, // Current quote from Jupiter
  expectedOutput, // Expected output amount
  priceImpact, // Price impact percentage
  loading, // Loading state
  error, // Error message
  isQuoteRefreshing, // Quote refresh state
  txSignature, // Transaction signature after swap
  isFullyConfirmed, // Transaction confirmation state
  handleSwap, // Execute swap function
  refreshQuote, // Manually refresh quote
  resetState, // Reset all states
} = useSwap(params);
```

### useSwapInputs

Manages swap input states and validation.

```typescript
const {
  inputToken, // Selected input token
  outputToken, // Selected output token
  inputAmount, // Input amount
  outputAmount, // Output amount
  swapMode, // Current swap mode
  setInputToken, // Set input token
  setOutputToken, // Set output token
  setInputAmount, // Set input amount
  setOutputAmount, // Set output amount
  setSwapMode, // Set swap mode
  swapTokens, // Swap input/output tokens
  handleAmountChange, // Handle amount changes with validation
} = useSwapInputs(defaultInputToken, defaultOutputToken, defaultAmount);
```

### useAmountByPercentage

Calculate token amounts by percentage of balance.

```typescript
const {
  setAmountByPercentage, // Set amount by percentage
  getAmountByPercentage, // Get amount for percentage
} = useAmountByPercentage({ balance, decimals, onAmountChange });
```

## Utility Functions

### Amount Formatting

```typescript
import { formatAmount, toSmallestUnit, fromSmallestUnit } from "./swap-sdk";

// Format amount with proper decimals
const formatted = formatAmount("1.234567", 4); // "1.2345"

// Convert to smallest unit (e.g., lamports)
const lamports = toSmallestUnit("1.5", 9); // 1500000000n

// Convert from smallest unit
const amount = fromSmallestUnit("1500000000", 9); // "1.5"
```

### Validation

```typescript
import { validateAmount, isValidAmountInput } from "./swap-sdk";

// Validate amount with decimals
const isValid = validateAmount("1.234", 3); // true
const isInvalid = validateAmount("1.2345", 3); // false (too many decimals)

// Check if input is valid for amount field
const canType = isValidAmountInput("1.23"); // true
const cantType = isValidAmountInput("abc"); // false
```

## Constants

```typescript
import {
  SOL_MINT, // SOL token mint address
  USDC_MINT, // USDC token mint address
  DEFAULT_SLIPPAGE_BPS, // Default slippage ('auto')
  DEFAULT_SLIPPAGE_VALUE, // Default slippage value (50 = 0.5%)
  PLATFORM_FEE_BPS, // Platform fee (80 = 0.8%)
  PLATFORM_FEE_ACCOUNT, // Platform fee account
  QUOTE_REFRESH_INTERVAL, // Quote refresh interval (15000ms)
} from "./swap-sdk";
```

## TypeScript Types

```typescript
import type {
  QuoteResponse, // Jupiter quote response
  TokenInfo, // Token information
  SwapState, // Complete swap state
  SwapResult, // Swap transaction result
  WalletInterface, // Generic wallet interface
} from "./swap-sdk";
```

## Best Practices

1. **Error Handling**: Always handle errors from the swap hook
2. **Loading States**: Show appropriate loading indicators during swaps
3. **Quote Refresh**: The SDK auto-refreshes quotes, but you can manually refresh if needed
4. **Validation**: Use the provided validation utilities before setting amounts
5. **RPC URL**: Use a reliable RPC endpoint for better performance

## License

This SDK is provided as-is for integration into your projects.
