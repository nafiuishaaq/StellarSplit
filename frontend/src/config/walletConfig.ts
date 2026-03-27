import {
  getAddress,
  getNetwork,
  getNetworkDetails,
  isConnected as freighterIsConnected,
  requestAccess,
  signTransaction as freighterSignTransaction,
} from "@stellar/freighter-api"

// Wallet + network primitives only; UI and contract layers should consume via hooks/context.

export const STELLAR_NETWORKS = {
  testnet: {
    key: "testnet",
    label: "Stellar Testnet",
    passphrase: "Test SDF Network ; September 2015",
    horizonUrl: "https://horizon-testnet.stellar.org",
    sorobanRpcUrl: "https://soroban-testnet.stellar.org",
  },
  public: {
    key: "public",
    label: "Stellar Mainnet",
    passphrase: "Public Global Stellar Network ; September 2015",
    horizonUrl: "https://horizon.stellar.org",
    sorobanRpcUrl: "https://mainnet.sorobanrpc.com",
  },
  futurenet: {
    key: "futurenet",
    label: "Stellar Futurenet",
    passphrase: "Test SDF Future Network ; October 2022",
    horizonUrl: "https://horizon-futurenet.stellar.org",
    sorobanRpcUrl: "https://rpc-futurenet.stellar.org",
  },
} as const

export type StellarNetworkKey = keyof typeof STELLAR_NETWORKS

const configuredNetwork =
  (import.meta.env.VITE_STELLAR_NETWORK as StellarNetworkKey | undefined)?.toLowerCase() ??
  "testnet"

export const EXPECTED_STELLAR_NETWORK =
  STELLAR_NETWORKS[
    configuredNetwork in STELLAR_NETWORKS
      ? (configuredNetwork as StellarNetworkKey)
      : "testnet"
  ]

export const SOROBAN_NETWORK_PASSPHRASE = EXPECTED_STELLAR_NETWORK.passphrase
export const SOROBAN_RPC_URL = EXPECTED_STELLAR_NETWORK.sorobanRpcUrl
export const HORIZON_URL = EXPECTED_STELLAR_NETWORK.horizonUrl

const NETWORK_PASSPHRASES = {
  TESTNET: STELLAR_NETWORKS.testnet.passphrase,
  PUBLIC: STELLAR_NETWORKS.public.passphrase,
  FUTURENET: STELLAR_NETWORKS.futurenet.passphrase,
} as const

const FREIGHTER_EXTERNAL_MSG_REQUEST = "FREIGHTER_EXTERNAL_MSG_REQUEST"
const FREIGHTER_EXTERNAL_MSG_RESPONSE = "FREIGHTER_EXTERNAL_MSG_RESPONSE"
const FREIGHTER_CONNECTION_STATUS = "REQUEST_CONNECTION_STATUS"
const FREIGHTER_PING_TIMEOUT_MS = 400
const FREIGHTER_PING_ATTEMPTS = 4

type FreighterWindow = Window & {
  freighter?: boolean
  freighterApi?: unknown
}

function hasFreighterHint(): boolean {
  if (typeof window === "undefined") {
    return false
  }

  const freighterWindow = window as FreighterWindow
  return typeof freighterWindow.freighter !== "undefined" || !!freighterWindow.freighterApi
}

// Detect the extension via a lightweight postMessage handshake.
async function pingFreighter(timeoutMs: number): Promise<boolean> {
  if (typeof window === "undefined") {
    return false
  }

  return new Promise((resolve) => {
    const messageId = Date.now() + Math.random()
    let timeoutId: number | undefined

    const cleanup = () => {
      window.removeEventListener("message", handleMessage)
      if (timeoutId) {
        window.clearTimeout(timeoutId)
      }
    }

    const handleMessage = (event: MessageEvent) => {
      if (event.source !== window) {
        return
      }
      const data = event.data as { source?: string; messagedId?: number; messageId?: number }
      if (data?.source !== FREIGHTER_EXTERNAL_MSG_RESPONSE) {
        return
      }
      const responseId = data.messagedId ?? data.messageId
      if (responseId !== messageId) {
        return
      }
      cleanup()
      resolve(true)
    }

    window.addEventListener("message", handleMessage)
    window.postMessage(
      {
        source: FREIGHTER_EXTERNAL_MSG_REQUEST,
        messageId,
        type: FREIGHTER_CONNECTION_STATUS,
      },
      window.location.origin,
    )

    timeoutId = window.setTimeout(() => {
      cleanup()
      resolve(false)
    }, timeoutMs)
  })
}

function freighterErrorMessage(error: unknown, fallback: string): string {
  if (!error) {
    return fallback
  }
  if (typeof error === "string") {
    return error
  }
  if (typeof (error as { message?: string }).message === "string") {
    return (error as { message?: string }).message || fallback
  }
  return fallback
}

export async function isFreighterInstalled(): Promise<boolean> {
  if (typeof window === "undefined") {
    return false
  }

  if (hasFreighterHint()) {
    return true
  }

  for (let attempt = 0; attempt < FREIGHTER_PING_ATTEMPTS; attempt += 1) {
    const timeout = FREIGHTER_PING_TIMEOUT_MS + attempt * 250
    if (await pingFreighter(timeout)) {
      return true
    }
  }

  return false
}

export async function getFreighterNetworkPassphrase(): Promise<string | null> {
  if (!(await isFreighterInstalled())) {
    return null
  }

  const details = await getNetworkDetails()
  if (!details.error && details.networkPassphrase) {
    return details.networkPassphrase
  }

  const network = await getNetwork()
  if (!network.error) {
    if (network.networkPassphrase) {
      return network.networkPassphrase
    }
    if (network.network) {
      const normalized = network.network.toUpperCase()
      return NETWORK_PASSPHRASES[normalized as keyof typeof NETWORK_PASSPHRASES] ?? network.network
    }
  }

  return null
}

export function getNetworkLabel(passphrase: string | null | undefined): string {
  if (!passphrase) {
    return "Unknown network"
  }

  const network = Object.values(STELLAR_NETWORKS).find(
    (candidate) => candidate.passphrase === passphrase,
  )
  return network?.label ?? passphrase
}

export function isExpectedNetwork(passphrase: string | null | undefined): boolean {
  return !!passphrase && passphrase === EXPECTED_STELLAR_NETWORK.passphrase
}

export function getNetworkMismatchMessage(
  passphrase: string | null | undefined,
): string {
  const currentLabel = getNetworkLabel(passphrase)
  return `Switch Freighter from ${currentLabel} to ${EXPECTED_STELLAR_NETWORK.label} to continue.`
}

export async function connectWallet(): Promise<string> {
  if (!(await isFreighterInstalled())) {
    throw new Error("Freighter not installed")
  }

  const response = await requestAccess()
  if (response.error) {
    throw new Error(freighterErrorMessage(response.error, "Freighter unavailable"))
  }
  if (!response.address) {
    throw new Error("Freighter not connected")
  }
  return response.address
}

export async function getWalletPublicKey(): Promise<string> {
  if (!(await isFreighterInstalled())) {
    throw new Error("Freighter not installed")
  }

  const connection = await freighterIsConnected()
  if (connection.error) {
    throw new Error(freighterErrorMessage(connection.error, "Freighter unavailable"))
  }
  if (!connection.isConnected) {
    throw new Error("Freighter not connected")
  }

  const response = await getAddress()
  if (response.error) {
    throw new Error(freighterErrorMessage(response.error, "Freighter unavailable"))
  }
  if (!response.address) {
    throw new Error("Freighter not connected")
  }
  return response.address
}

export async function signWithFreighter(txXdr: string, networkPassphrase?: string): Promise<string> {
  if (!(await isFreighterInstalled())) {
    throw new Error("Freighter not installed")
  }

  const response = await freighterSignTransaction(txXdr, {
    // Default to the Soroban testnet passphrase, but allow callers to override
    networkPassphrase: networkPassphrase ?? SOROBAN_NETWORK_PASSPHRASE,
  })

  if (response.error) {
    throw new Error(freighterErrorMessage(response.error, "Freighter unavailable"))
  }
  if (!response.signedTxXdr) {
    throw new Error("Freighter unavailable")
  }
  return response.signedTxXdr
}
