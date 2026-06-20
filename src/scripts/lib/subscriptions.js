import { findAssociatedTokenPda, getCreateAssociatedTokenIdempotentInstructionAsync } from '@solana-program/token-2022'
import {
	fetchMaybeSubscriptionAuthority,
	findSubscriptionAuthorityPda,
	getInitSubscriptionAuthorityInstructionAsync,
} from '@solana/subscriptions'
import { rpc } from './rpc.js'
import { sendWithSigner } from './transactions.js'
import { MOCK_USDC_MINT, TOKEN_PROGRAM_ADDRESS } from './config.js'

export async function getAuthorityPda(owner) {
	const [pda] = await findSubscriptionAuthorityPda({ user: owner, tokenMint: MOCK_USDC_MINT })
	return pda
}

export async function fetchAuthority(owner) {
	const pda = await getAuthorityPda(owner)
	return fetchMaybeSubscriptionAuthority(rpc, pda)
}

export async function getParentAta(owner) {
	const [ata] = await findAssociatedTokenPda({
		mint: MOCK_USDC_MINT,
		owner,
		tokenProgram: TOKEN_PROGRAM_ADDRESS,
	})
	return ata
}

export async function initAuthority(signer) {
	const owner = signer.address
	const userAta = await getParentAta(owner)
	const createAtaIx = await getCreateAssociatedTokenIdempotentInstructionAsync({
		payer: signer,
		mint: MOCK_USDC_MINT,
		owner,
		tokenProgram: TOKEN_PROGRAM_ADDRESS,
	})
	const initIx = await getInitSubscriptionAuthorityInstructionAsync({
		owner: signer,
		tokenMint: MOCK_USDC_MINT,
		userAta,
		tokenProgram: TOKEN_PROGRAM_ADDRESS,
	})
	return sendWithSigner(signer, [createAtaIx, initIx])
}
