import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import {
	airdropFactory,
	appendTransactionMessageInstructions,
	createKeyPairSignerFromPrivateKeyBytes,
	createSolanaRpc,
	createSolanaRpcSubscriptions,
	createTransactionMessage,
	getBase58Decoder,
	getBase58Encoder,
	getSignatureFromTransaction,
	lamports,
	pipe,
	sendAndConfirmTransactionFactory,
	setTransactionMessageFeePayerSigner,
	setTransactionMessageLifetimeUsingBlockhash,
	signTransactionMessageWithSigners,
} from '@solana/kit'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ENV_PATH = path.join(__dirname, '..', '.env.local')

export const RPC_URL = process.env.RPC_URL ?? 'https://api.devnet.solana.com'
export const RPC_SUBSCRIPTIONS_URL = process.env.RPC_SUBSCRIPTIONS_URL ?? 'wss://api.devnet.solana.com'

export const rpc = createSolanaRpc(RPC_URL)
export const rpcSubscriptions = createSolanaRpcSubscriptions(RPC_SUBSCRIPTIONS_URL)

export function readEnv() {
	if (!fs.existsSync(ENV_PATH)) return {}
	const env = {}
	for (const line of fs.readFileSync(ENV_PATH, 'utf-8').split('\n')) {
		const match = line.match(/^([A-Z0-9_]+)=(.*)$/)
		if (match) env[match[1]] = match[2].trim()
	}
	return env
}

export function writeEnv(key, value) {
	const env = readEnv()
	env[key] = value
	const body = Object.entries(env)
		.map(([k, v]) => `${k}=${v}`)
		.join('\n')
	fs.writeFileSync(ENV_PATH, `${body}\n`)
}

export async function getFunder() {
	const env = readEnv()
	let secret = env.SEED_FUNDER_SECRET
	if (!secret) {
		const bytes = crypto.getRandomValues(new Uint8Array(32))
		secret = getBase58Decoder().decode(bytes)
		writeEnv('SEED_FUNDER_SECRET', secret)
		console.log('Generated a new funder keypair (saved to .env.local).')
	}
	const privateKeyBytes = new Uint8Array(getBase58Encoder().encode(secret))
	return createKeyPairSignerFromPrivateKeyBytes(privateKeyBytes)
}

const sleep = ms => new Promise(r => setTimeout(r, ms))

export async function ensureSol(addr, minSol = 1, topUpSol = 1, attempts = 6) {
	const { value } = await rpc.getBalance(addr).send()
	if (Number(value) / 1e9 >= minSol) return
	const airdrop = airdropFactory({ rpc, rpcSubscriptions })
	for (let i = 1; i <= attempts; i++) {
		try {
			console.log(`Airdropping ${topUpSol} SOL to ${addr} (attempt ${i}/${attempts}) …`)
			await airdrop({
				commitment: 'confirmed',
				recipientAddress: addr,
				lamports: lamports(BigInt(topUpSol * 1e9)),
			})
			return
		} catch (err) {
			if (i === attempts) throw err
			await sleep(2000 * i)
		}
	}
}

export async function sendInstructions(feePayer, instructions) {
	const { value: blockhash } = await rpc.getLatestBlockhash().send()
	const message = pipe(
		createTransactionMessage({ version: 0 }),
		m => setTransactionMessageFeePayerSigner(feePayer, m),
		m => setTransactionMessageLifetimeUsingBlockhash(blockhash, m),
		m => appendTransactionMessageInstructions(instructions, m)
	)
	const signed = await signTransactionMessageWithSigners(message)
	const sendAndConfirm = sendAndConfirmTransactionFactory({ rpc, rpcSubscriptions })
	await sendAndConfirm(signed, { commitment: 'confirmed' })
	return getSignatureFromTransaction(signed)
}
