import {
  Account,
  Asset,
  BASE_FEE,
  Horizon,
  Memo,
  Operation,
  StrKey,
  Transaction,
  TransactionBuilder,
} from '@stellar/stellar-sdk'

export interface SignAndSubmitPaymentInput {
  amount: number
  destination: string
  sourceAccount: string
  networkPassphrase: string
  horizonUrl: string
  memo?: string
  memoType?: 'text' | 'id' | 'hash'
  signTransaction: (txXdr: string) => Promise<string>
}

export interface PaymentSubmissionResult {
  success: boolean
  txHash?: string
  error?: string
}

function buildMemo(
  memo: string | undefined,
  memoType: SignAndSubmitPaymentInput['memoType'],
) {
  if (!memo) {
    return undefined
  }

  if (memoType === 'id') {
    return Memo.id(memo)
  }

  if (memoType === 'hash') {
    return Memo.hash(memo)
  }

  return Memo.text(memo.slice(0, 28))
}

export async function signAndSubmitPayment({
  amount,
  destination,
  sourceAccount,
  networkPassphrase,
  horizonUrl,
  memo,
  memoType,
  signTransaction,
}: SignAndSubmitPaymentInput): Promise<PaymentSubmissionResult> {
  if (!Number.isFinite(amount) || amount <= 0) {
    return {
      success: false,
      error: 'Payment amount must be greater than zero.',
    }
  }

  if (!StrKey.isValidEd25519PublicKey(destination)) {
    return {
      success: false,
      error: 'Destination wallet address is invalid.',
    }
  }

  if (!StrKey.isValidEd25519PublicKey(sourceAccount)) {
    return {
      success: false,
      error: 'Connect a valid Stellar wallet before paying.',
    }
  }

  try {
    const server = new Horizon.Server(horizonUrl)
    const source = await server.loadAccount(sourceAccount)
    const transactionBuilder = new TransactionBuilder(
      new Account(source.accountId(), source.sequence),
      {
        fee: BASE_FEE,
        networkPassphrase,
      },
    )

    transactionBuilder.addOperation(
      Operation.payment({
        destination,
        asset: Asset.native(),
        amount: amount.toFixed(7).replace(/\.?0+$/, ''),
      }),
    )

    const transactionMemo = buildMemo(memo, memoType)
    if (transactionMemo) {
      transactionBuilder.addMemo(transactionMemo)
    }

    const unsignedTransaction = transactionBuilder.setTimeout(120).build()
    const signedXdr = await signTransaction(unsignedTransaction.toXDR())
    const signedTransaction = new Transaction(signedXdr, networkPassphrase)
    const submission = await server.submitTransaction(signedTransaction)

    return {
      success: true,
      txHash: submission.hash,
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Payment submission failed.',
    }
  }
}
