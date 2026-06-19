import { createSolanaRpc, createSolanaRpcSubscriptions } from '@solana/kit'
import { RPC_URL, RPC_SUBSCRIPTIONS_URL } from './config.js'

export const rpc = createSolanaRpc(RPC_URL)
export const rpcSubscriptions = createSolanaRpcSubscriptions(RPC_SUBSCRIPTIONS_URL)

export async function getSolBalance(addr) {
	const { value } = await rpc.getBalance(addr).send()
	return Number(value) / 1e9
}
