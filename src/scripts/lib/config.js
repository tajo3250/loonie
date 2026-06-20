import { address } from '@solana/kit'
import { SUBSCRIPTIONS_PROGRAM_ADDRESS } from '@solana/subscriptions'
import { TOKEN_2022_PROGRAM_ADDRESS } from '@solana-program/token-2022'

export const CLUSTER = 'devnet'
export const RPC_URL = 'https://api.devnet.solana.com'
export const RPC_SUBSCRIPTIONS_URL = 'wss://api.devnet.solana.com'
export const WALLET_CHAIN = 'solana:devnet'

export const PROGRAM_ADDRESS = SUBSCRIPTIONS_PROGRAM_ADDRESS
export const TOKEN_PROGRAM_ADDRESS = TOKEN_2022_PROGRAM_ADDRESS

export const USDC_DECIMALS = 6
export const MOCK_USDC_MINT = address('4Axed8cXByjwW8X93r1hC6uc8NhbLR5rdAKcwi3feo57')

export const USD_TO_CAD = 1.37

export const MERCHANTS = [
	{ id: 'timmies', name: 'Timmies', blurb: 'Coffee & a Timbit', icon: 'i-coffee', address: address('G85gkBhLjoYsPPHR9TBQQtD3uvwYmdBATxvZDR4vG9PH') },
	{ id: 'indigo', name: 'Indigo', blurb: 'A weekend read', icon: 'i-book', address: address('AyyPPyiPDGTStnYzsLVtUYDC1EZiG4GesNb1Gu6nCpv2') },
	{ id: 'corner', name: 'Corner Store', blurb: 'After-school snacks', icon: 'i-store', address: address('Hc7cJh7tUJtw6N5i137U8mKGQPqMitNMeVmp6veRyDEC') },
]

export const explorerTx = sig => `https://explorer.solana.com/tx/${sig}?cluster=devnet`
export const explorerAddr = addr => `https://explorer.solana.com/address/${addr}?cluster=devnet`
