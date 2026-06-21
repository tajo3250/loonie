import {
	appendTransactionMessageInstructions,
	createTransactionMessage,
	getBase58Decoder,
	pipe,
	setTransactionMessageFeePayerSigner,
	setTransactionMessageLifetimeUsingBlockhash,
	signAndSendTransactionMessageWithSigners,
} from '@solana/kit'
import { rpc } from './rpc.js'

export async function sendWithSigner(signer, instructions) {
	const { value: blockhash } = await rpc.getLatestBlockhash().send()
	const message = pipe(
		createTransactionMessage({ version: 0 }),
		m => setTransactionMessageFeePayerSigner(signer, m),
		m => setTransactionMessageLifetimeUsingBlockhash(blockhash, m),
		m => appendTransactionMessageInstructions(instructions, m)
	)
	const signature = await signAndSendTransactionMessageWithSigners(message)
	const sig = getBase58Decoder().decode(signature)
	await confirmSignature(sig)
	return sig
}

async function confirmSignature(signature, { timeoutMs = 25000, intervalMs = 800 } = {}) {
	const deadline = Date.now() + timeoutMs
	while (Date.now() < deadline) {
		const { value } = await rpc.getSignatureStatuses([signature]).send()
		const status = value[0]
		if (status) {
			if (status.err) throw new Error('Transaction failed on-chain.')
			if (status.confirmationStatus === 'confirmed' || status.confirmationStatus === 'finalized') return
		}
		await new Promise(r => setTimeout(r, intervalMs))
	}
}
