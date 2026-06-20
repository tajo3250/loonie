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
	return getBase58Decoder().decode(signature)
}
