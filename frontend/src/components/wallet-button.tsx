import * as React from "react"
import { Wallet } from "lucide-react"
import { Button } from "./ui/button"
import { useWallet } from "../hooks/use-wallet"

const DEFAULT_ADDRESS_SLICE = 4

function shortenAddress(address: string, prefix = DEFAULT_ADDRESS_SLICE, suffix = DEFAULT_ADDRESS_SLICE) {
  if (address.length <= prefix + suffix) {
    return address
  }
  return `${address.slice(0, prefix)}...${address.slice(-suffix)}`
}

export type WalletButtonProps = React.ComponentProps<typeof Button> & {
  showIcon?: boolean
}

// UI-only wallet control; all connection logic stays in wallet context.
export function WalletButton({ showIcon = true, onClick, ...props }: WalletButtonProps) {
  const {
    publicKey,
    activeUserId,
    isConnected,
    isConnecting,
    isRefreshing,
    hasFreighter,
    error,
    requiredNetworkLabel,
    walletNetworkLabel,
    isOnAllowedNetwork,
    lastConnectedAccount,
    connect,
    disconnect,
    refresh,
  } = useWallet()

  const showWrongNetwork = isConnected && !isOnAllowedNetwork
  const reconnectAccount = lastConnectedAccount && !isConnected ? shortenAddress(lastConnectedAccount) : null
  const displayAddress = publicKey ? shortenAddress(publicKey) : reconnectAccount

  let label = "Connect Wallet"
  if (!hasFreighter) {
    label = "Install Freighter"
  } else if (isConnecting) {
    label = "Connecting..."
  } else if (isRefreshing && activeUserId) {
    label = "Restoring..."
  } else if (showWrongNetwork) {
    label = "Wrong Network"
  } else if (isConnected && displayAddress) {
    label = displayAddress
  } else if (reconnectAccount) {
    label = `Reconnect ${reconnectAccount}`
  } else if (error) {
    label = error
  }

  const title = !hasFreighter
    ? "Freighter extension not detected"
    : showWrongNetwork
      ? `Switch Freighter from ${walletNetworkLabel} to ${requiredNetworkLabel}.`
      : reconnectAccount
        ? `Reconnect ${reconnectAccount} and confirm ${requiredNetworkLabel} before paying.`
        : error ?? undefined

  const isDisabled = props.disabled || isConnecting || isRefreshing || !hasFreighter

  const handleClick = async (event: React.MouseEvent<HTMLButtonElement>) => {
    onClick?.(event)
    if (event.defaultPrevented || isDisabled) {
      return
    }

    if (isConnected) {
      disconnect()
      return
    }

    if (reconnectAccount) {
      await refresh()
      if (!publicKey) {
        await connect()
      }
      return
    }

    await connect()
  }

  const baseClasses =
    "min-w-[160px] px-5 py-2.5 rounded-full border border-sky-500 bg-sky-600 text-white shadow-sm hover:bg-sky-700 hover:border-sky-600 active:bg-sky-800 active:border-sky-700 disabled:bg-sky-400 disabled:border-sky-400 disabled:text-sky-100"

  const wrongNetworkClasses = "bg-amber-500 border-amber-500 hover:bg-amber-600 hover:border-amber-600"
  const errorClasses = "bg-rose-500 border-rose-500 hover:bg-rose-600 hover:border-rose-600"

  const variantClasses = !hasFreighter
    ? "bg-gray-900 border-gray-900 hover:bg-black"
    : showWrongNetwork
      ? wrongNetworkClasses
      : error
        ? errorClasses
        : ""

  return (
    <Button
      {...props}
      className={`${baseClasses} ${variantClasses} ${props.className ?? ""}`}
      onClick={handleClick}
      disabled={isDisabled}
      aria-busy={isConnecting || isRefreshing || undefined}
      title={title}
    >
      {showIcon ? (
        <Wallet
          className={`h-4 w-4 transition-transform ${(isConnecting || isRefreshing) ? "animate-pulse" : ""}`}
        />
      ) : null}
      <span className="truncate max-w-[140px] text-sm font-semibold">{label}</span>
    </Button>
  )
}
