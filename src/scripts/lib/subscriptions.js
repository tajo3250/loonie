import { address } from '@solana/kit'
import { getTransferSolInstruction } from '@solana-program/system'
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

const MEMO_PROGRAM_ADDRESS = address('MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr')

// Parent prepays this much SOL to each kid for future withdrawal fees (~0.02 SOL).
const KID_SOL_TOPUP_LAMPORTS = 20_000_000n

function memoInstruction(text) {
	return {
		programAddress: MEMO_PROGRAM_ADDRESS,
		accounts: [],
		data: new TextEncoder().encode(text),
	}
}

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

	const delegationIx = getCreateRecurringDelegationInstruction({
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

	// Parent prepays the kid's costs: create the kid's token account and send a little SOL
	// for future withdrawal fees, so the kid never needs to fund their own wallet.
	const createKidAta = await getCreateAssociatedTokenIdempotentInstructionAsync({
		payer: signer,
		mint: MOCK_USDC_MINT,
		owner: kid,
		tokenProgram: TOKEN_PROGRAM_ADDRESS,
	})
	const fundKidSol = getTransferSolInstruction({
		source: signer,
		destination: kid,
		amount: KID_SOL_TOPUP_LAMPORTS,
	})

	return sendWithSigner(signer, [delegationIx, createKidAta, fundKidSol])
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

export async function withdraw({ signer, delegation, amountUsdc, note }) {
	const delegator = delegation.data.header.delegator
	const kid = signer.address
	const delegatorAta = await getAta(delegator)
	const receiverAta = await getAta(kid)

	const createReceiverAta = await getCreateAssociatedTokenIdempotentInstructionAsync({
		payer: signer,
		mint: MOCK_USDC_MINT,
		owner: kid,
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
	const instructions = [createReceiverAta, transferIx]
	if (note) instructions.push(memoInstruction(note))
	return sendWithSigner(signer, instructions)
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
