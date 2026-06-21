import gsap from 'gsap'
import { rpc } from '../lib/rpc.js'
import { listAllowances, listKids } from '../lib/subscriptions.js'
import { formatMoney, timeAgo, truncateAddress } from '../lib/format.js'
import { getNickname } from '../lib/nicknames.js'
import { explorerTx } from '../lib/config.js'

const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
const el = sel => document.querySelector(sel)

function transferAmount(info) {
	if (info.tokenAmount) return Number(info.tokenAmount.uiAmount ?? Number(info.tokenAmount.amount) / 1e6)
	return Number(info.amount) / 1e6
}

function allInstructions(tx) {
	const top = tx?.transaction?.message?.instructions ?? []
	const inner = (tx?.meta?.innerInstructions ?? []).flatMap(group => group.instructions)
	return [...top, ...inner]
}

function firstTransfer(tx) {
	const info = allInstructions(tx)
		.map(ix => ix?.parsed)
		.find(p => p && (p.type === 'transfer' || p.type === 'transferChecked') && p.info?.destination)
	return info?.info ?? null
}

function memoFromTx(tx) {
	const memo = allInstructions(tx).find(ix => ix?.program === 'spl-memo')
	if (memo) return typeof memo.parsed === 'string' ? memo.parsed : memo.parsed?.toString?.() ?? ''
	return ''
}

async function parsePull(entry) {
	let tx
	try {
		tx = await rpc.getTransaction(entry.sig, { encoding: 'jsonParsed', maxSupportedTransactionVersion: 0 }).send()
	} catch {
		return null
	}
	if (!tx) return null

	const transfer = firstTransfer(tx)
	if (!transfer) return null
	return {
		kid: entry.delegation.data.header.delegatee,
		amount: transferAmount(transfer),
		note: memoFromTx(tx),
		blockTime: entry.blockTime,
		sig: entry.sig,
	}
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

	const pulls = await Promise.all(entries.map(e => parsePull(e)))
	return pulls.filter(Boolean)
}

function pullRow(p) {
	const a = document.createElement('a')
	a.href = explorerTx(p.sig)
	a.target = '_blank'
	a.rel = 'noopener'
	a.className = 'flex items-center gap-3 rounded-card bg-white border border-sand p-4 hover:border-loon transition-colors'

	const who = getNickname(p.kid) || truncateAddress(p.kid)
	a.innerHTML = `
		<div class="w-9 h-9 rounded-full bg-loon/10 text-loon flex items-center justify-center shrink-0">
			<svg class="w-5 h-5" aria-hidden="true"><use href="#i-coin"/></svg>
		</div>
		<div class="min-w-0 flex-1">
			<div data-title class="font-semibold text-sm truncate"></div>
			<div class="text-muted text-xs">${timeAgo(p.blockTime)}</div>
		</div>
		<div class="font-bold text-sm">${formatMoney(p.amount)}</div>`
	a.querySelector('[data-title]').textContent = p.note ? `${who} · ${p.note}` : `${who} withdrew`
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
