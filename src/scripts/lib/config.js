import { SUBSCRIPTIONS_PROGRAM_ADDRESS } from '@solana/subscriptions'

export const CLUSTER = 'devnet'
export const RPC_URL = 'https://api.devnet.solana.com'
export const RPC_SUBSCRIPTIONS_URL = 'wss://api.devnet.solana.com'
export const WALLET_CHAIN = 'solana:devnet'

export const PROGRAM_ADDRESS = SUBSCRIPTIONS_PROGRAM_ADDRESS

export const USDC_DECIMALS = 6
export const MOCK_USDC_MINT = null

export const USD_TO_CAD = 1.37

export const explorerTx = sig => `https://explorer.solana.com/tx/${sig}?cluster=devnet`
export const explorerAddr = addr => `https://explorer.solana.com/address/${addr}?cluster=devnet`
