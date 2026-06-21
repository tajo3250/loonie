import gsap from 'gsap'
import { rpc } from '../lib/rpc.js'
import { getAta, listAllowances, listKids } from '../lib/subscriptions.js'
import { formatMoney, timeAgo, truncateAddress } from '../lib/format.js'
import { MERCHANTS, explorerTx } from '../lib/config.js'

const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
const el = sel => document.querySelector(sel)

let merchantsByAta = null

async function getMerchantsByAta() {
	if (merchantsByAta) return merchantsByAta
	const entries = await Promise.all(MERCHANTS.map(async m => [String(await getAta(m.address)), m]))
	merchantsByAta = new Map(entries)
	return merchantsByAta
}

function transferAmount(info) {
	if (info.tokenAmount) return Number(info.tokenAmount.uiAmount ?? Number(info.tokenAmount.amount) / 1e6)
	return Number(info.amount) / 1e6
}

function parsedTransfers(tx) {
	const top = tx?.transaction?.message?.instructions ?? []
	const inner = (tx?.meta?.innerInstructions ?? []).flatMap(group => group.instructions)
	return [...top, ...inner]
		.map(ix => ix?.parsed)
		.filter(p => p && (p.type === 'transfer' || p.type === 'transferChecked') && p.info?.destination)
		.map(p => p.info)
}

async function parsePull(entry, ataMap) {
	let tx
	try {
		tx = await rpc.getTransaction(entry.sig, { encoding: 'jsonParsed', maxSupportedTransactionVersion: 0 }).send()
	} catch {
		return null
	}
	if (!tx) return null

	for (const info of parsedTransfers(tx)) {
		const merchant = ataMap.get(String(info.destination))
		if (merchant) {
			return {
				kid: entry.delegation.data.header.delegatee,
				amount: transferAmount(info),
				merchant,
				blockTime: entry.blockTime,
				sig: entry.sig,
			}
		}
	}
	return null
}

async function fetchPulls(owner) {
	const [asParent, asKid] = await Promise.all([listKids(owner), listAllowances(owner)])
	const delegations = [...asParent, ...asKid].filter(
		(d, i, arr) => arr.findIndex(x => x.address === d.address) === i
	)
	if (!delegations.length) return []

	const groups = await Promise.all(
		delegations.map(async d => {
			const sigs = await rpc.getSignaturesForAddress(d.address, { limit: 8 }).send()
			return sigs.filter(s => !s.err).map(s => ({ sig: s.signature, blockTime: Number(s.blockTime ?? 0), delegation: d }))
		})
	)
	const entries = groups
		.flat()
		.filter((e, i, arr) => arr.findIndex(x => x.sig === e.sig) === i)
		.sort((a, b) => b.blockTime - a.blockTime)
		.slice(0, 12)

	const ataMap = await getMerchantsByAta()
	const pulls = await Promise.all(entries.map(e => parsePull(e, ataMap)))
	return pulls.filter(Boolean)
}

function pullRow(p) {
	const a = document.createElement('a')
	a.href = explorerTx(p.sig)
	a.target = '_blank'
	a.rel = 'noopener'
	a.className = 'flex items-center gap-3 rounded-card bg-white border border-sand p-4 hover:border-loon transition-colors'
	a.innerHTML = `
		<div class="w-9 h-9 rounded-full bg-loon/10 text-loon flex items-center justify-center shrink-0">
			<svg class="w-5 h-5" aria-hidden="true"><use href="#${p.merchant.icon}"/></svg>
		</div>
		<div class="min-w-0 flex-1">
			<div class="font-semibold text-sm truncate">${truncateAddress(p.kid)} → ${p.merchant.name}</div>
			<div class="text-muted text-xs">${timeAgo(p.blockTime)}</div>
		</div>
		<div class="font-bold text-sm">${formatMoney(p.amount)}</div>`
	return a
}

export async function refreshActivity(session) {
	const connected = el('[data-activity="connected"]')
	const disconnected = el('[data-activity="disconnected"]')

	if (!session?.account) {
		connected.hidden = true
		disconnected.hidden = false
		return
	}

	disconnected.hidden = true
	connected.hidden = false

	const list = el('[data-activity-list]')
	const empty = el('[data-activity-empty]')
	const loading = el('[data-activity-loading]')
	list.innerHTML = ''
	empty.hidden = true
	loading.hidden = false

	let pulls = []
	try {
		pulls = await fetchPulls(session.account.address)
	} catch (err) {
		console.error('Activity load failed:', err)
	}

	loading.hidden = true
	empty.hidden = pulls.length > 0
	if (!pulls.length) {
		if (!reduced) gsap.from(empty, { y: 12, opacity: 0, duration: 0.4, ease: 'power2.out', clearProps: 'all' })
		return
	}

	pulls.forEach(p => list.appendChild(pullRow(p)))
	if (!reduced) {
		gsap.from(list.children, { y: 12, opacity: 0, duration: 0.4, ease: 'power2.out', stagger: 0.06, clearProps: 'all' })
	}
}
