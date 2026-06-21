import { findAssociatedTokenPda, getCreateAssociatedTokenIdempotentInstructionAsync } from '@solana-program/token-2022'
import {
	fetchDelegationsByDelegatee,
	fetchDelegationsByDelegator,
	fetchMaybeSubscriptionAuthority,
	findRecurringDelegationPda,
	findSubscriptionAuthorityPda,
	getCreateRecurringDelegationInstruction,
	getInitSubscriptionAuthorityInstructionAsync,
	getRevokeDelegationInstruction,
	getTransferRecurringInstruction,
} from '@solana/subscriptions'
import { rpc } from './rpc.js'
import { sendWithSigner } from './transactions.js'
import { baseUnitsToUsdc, usdcToBaseUnits } from './format.js'
import { MOCK_USDC_MINT, TOKEN_PROGRAM_ADDRESS } from './config.js'

export async function getAuthorityPda(owner) {
	const [pda] = await findSubscriptionAuthorityPda({ user: owner, tokenMint: MOCK_USDC_MINT })
	return pda
}

export async function fetchAuthority(owner) {
	const pda = await getAuthorityPda(owner)
	return fetchMaybeSubscriptionAuthority(rpc, pda)
}

export async function getAta(owner) {
	const [ata] = await findAssociatedTokenPda({
		mint: MOCK_USDC_MINT,
		owner,
		tokenProgram: TOKEN_PROGRAM_ADDRESS,
	})
	return ata
}

export async function initAuthority(signer) {
	const owner = signer.address
	const userAta = await getAta(owner)
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
		recurringDelegation: {
			nonce,
			amountPerPeriod: usdcToBaseUnits(amountUsdc),
			periodLengthS: BigInt(periodSeconds),
			startTs: BigInt(Math.floor(Date.now() / 1000)),
			expiryTs: BigInt(expiryTs),
			expectedSubscriptionAuthorityInitId: auth.data.initId,
		},
	})
	return sendWithSigner(signer, [ix])
}

export async function listKids(owner) {
	const all = await fetchDelegationsByDelegator(rpc, owner)
	return all.filter(d => d.kind === 'recurring')
}

export async function revokeKid({ signer, delegationAccount }) {
	const ix = getRevokeDelegationInstruction({ authority: signer, delegationAccount })
	return sendWithSigner(signer, [ix])
}

export async function listAllowances(kid) {
	const all = await fetchDelegationsByDelegatee(rpc, kid)
	return all.filter(d => d.kind === 'recurring')
}

export async function spend({ signer, delegation, merchant, amountUsdc }) {
	const delegator = delegation.data.header.delegator
	const delegatorAta = await getAta(delegator)
	const receiverAta = await getAta(merchant)

	const createReceiverAta = await getCreateAssociatedTokenIdempotentInstructionAsync({
		payer: signer,
		mint: MOCK_USDC_MINT,
		owner: merchant,
		tokenProgram: TOKEN_PROGRAM_ADDRESS,
	})
	const transferIx = getTransferRecurringInstruction({
		delegationPda: delegation.address,
		subscriptionAuthority: delegation.data.subscriptionAuthority,
		delegatorAta,
		receiverAta,
		tokenMint: MOCK_USDC_MINT,
		tokenProgram: TOKEN_PROGRAM_ADDRESS,
		delegatee: signer,
		transferData: {
			amount: usdcToBaseUnits(amountUsdc),
			delegator,
			mint: MOCK_USDC_MINT,
		},
	})
	return sendWithSigner(signer, [createReceiverAta, transferIx])
}

export function summarizeDelegation(d) {
	const now = Math.floor(Date.now() / 1000)
	const start = Number(d.data.currentPeriodStartTs)
	const periodLen = Number(d.data.periodLengthS)
	const amount = baseUnitsToUsdc(d.data.amountPerPeriod)
	const pulled = baseUnitsToUsdc(d.data.amountPulledInPeriod)
	const expiry = Number(d.data.expiryTs)
	const expired = now >= expiry

	let remaining, resetTs
	if (periodLen > 0 && now >= start + periodLen) {
		const elapsed = Math.floor((now - start) / periodLen)
		resetTs = start + (elapsed + 1) * periodLen
		remaining = amount
	} else {
		resetTs = start + periodLen
		remaining = Math.max(0, amount - pulled)
	}

	return { amount, remaining, resetTs, expiry, expired, periodLen }
}
