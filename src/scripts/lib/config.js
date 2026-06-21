import { address } from '@solana/kit'
import { TOKEN_2022_PROGRAM_ADDRESS } from '@solana-program/token-2022'

export const RPC_URL = __RPC_URL__
export const WALLET_CHAIN = 'solana:devnet'

export const TOKEN_PROGRAM_ADDRESS = TOKEN_2022_PROGRAM_ADDRESS

export const USDC_DECIMALS = 6
export const MOCK_USDC_MINT = address('4Axed8cXByjwW8X93r1hC6uc8NhbLR5rdAKcwi3feo57')

export const USD_TO_CAD = 1.37

export const explorerTx = sig => `https://explorer.solana.com/tx/${sig}?cluster=devnet`
