import { createSolanaRpc } from '@solana/kit'
import { RPC_URL } from './config.js'

export const rpc = createSolanaRpc(RPC_URL)

export async function getSolBalance(addr) {
	const { value } = await rpc.getBalance(addr).send()
	return Number(value) / 1e9
}

export async function getTokenUiAmount(ata) {
	try {
		const { value } = await rpc.getTokenAccountBalance(ata).send()
		return Number(value.uiAmount ?? 0)
	} catch {
		return 0
	}
}
