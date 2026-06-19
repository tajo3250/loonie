import { getWallets } from '@wallet-standard/app'
import { getTransactionEncoder } from '@solana/kit'
import { WALLET_CHAIN } from './config.js'

const STANDARD_CONNECT = 'standard:connect'
const STANDARD_DISCONNECT = 'standard:disconnect'
const SOLANA_SIGN_AND_SEND = 'solana:signAndSendTransaction'

const { get, on } = getWallets()

export function listSolanaWallets() {
	return get().filter(w => SOLANA_SIGN_AND_SEND in w.features && STANDARD_CONNECT in w.features)
}

export function onWalletsChange(callback) {
	const offRegister = on('register', callback)
	const offUnregister = on('unregister', callback)
	return () => {
		offRegister()
		offUnregister()
	}
}

export async function connect(wallet) {
	const { accounts } = await wallet.features[STANDARD_CONNECT].connect()
	const account = accounts.find(a => a.chains.includes(WALLET_CHAIN)) ?? accounts[0]
	if (!account) throw new Error('Wallet returned no account.')
	return account
}

export async function disconnect(wallet) {
	const feature = wallet.features[STANDARD_DISCONNECT]
	if (feature) await feature.disconnect()
}

export function createWalletSigner(wallet, account) {
	const feature = wallet.features[SOLANA_SIGN_AND_SEND]
	const encoder = getTransactionEncoder()
	return {
		address: account.address,
		async signAndSendTransactions(transactions) {
			return Promise.all(
				transactions.map(async transaction => {
					const [output] = await feature.signAndSendTransaction({
						account,
						chain: WALLET_CHAIN,
						transaction: encoder.encode(transaction),
					})
					return output.signature
				})
			)
		},
	}
}
