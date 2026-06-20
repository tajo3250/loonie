import { findAssociatedTokenPda, getCreateAssociatedTokenIdempotentInstructionAsync } from '@solana-program/token-2022'
import {
	fetchDelegationsByDelegator,
	fetchMaybeSubscriptionAuthority,
	findRecurringDelegationPda,
	findSubscriptionAuthorityPda,
	getCreateRecurringDelegationInstruction,
	getInitSubscriptionAuthorityInstructionAsync,
} from '@solana/subscriptions'
import { rpc } from './rpc.js'
import { sendWithSigner } from './transactions.js'
import { usdcToBaseUnits } from './format.js'
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

export async function addKid({ signer, kid, amountUsdc, periodSeconds, expiryTs }) {
	const delegator = signer.address
	const subscriptionAuthority = await getAuthorityPda(delegator)
	const auth = await fetchMaybeSubscriptionAuthority(rpc, subscriptionAuthority)
	if (!auth.exists) throw new Error('Set up your allowance authority first.')

	const nonce = 0n
	const [delegationAccount] = await findRecurringDelegationPda({
		subscriptionAuthority,
		delegator,
		delegatee: kid,
		nonce,
	})

	const ix = getCreateRecurringDelegationInstruction({
		delegator: signer,
		subscriptionAuthority,
		delegationAccount,
		delegatee: kid,
		nonce,
		amountPerPeriod: usdcToBaseUnits(amountUsdc),
		periodLengthS: BigInt(periodSeconds),
		startTs: BigInt(Math.floor(Date.now() / 1000)),
		expiryTs: BigInt(expiryTs),
		expectedSubscriptionAuthorityInitId: auth.data.initId,
	})
	return sendWithSigner(signer, [ix])
}

export async function listKids(owner) {
	const all = await fetchDelegationsByDelegator(rpc, owner)
	return all.filter(d => d.kind === 'recurring')
}
