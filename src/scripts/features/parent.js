import gsap from 'gsap'
import { address } from '@solana/kit'
import { addKid, fetchAuthority, getAta, initAuthority, listKids, revokeKid, summarizeDelegation } from '../lib/subscriptions.js'
import { getTokenUiAmount } from '../lib/rpc.js'
import {
	formatDate,
	formatMoney,
	periodLabel,
	toUsd,
	truncateAddress,
	PERIOD_MONTH,
	PERIOD_WEEK,
} from '../lib/format.js'
import { getNickname, setNickname } from '../lib/nicknames.js'
import { explorerTx } from '../lib/config.js'

const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
const el = sel => document.querySelector(sel)

let currentSigner = null

export async function refreshParent(session) {
	currentSigner = session?.signer ?? null
	const connected = el('[data-parent="connected"]')
	const disconnected = el('[data-parent="disconnected"]')

	if (!session?.account) {
		connected.hidden = true
		disconnected.hidden = false
		return
	}

	disconnected.hidden = true
	connected.hidden = false

	const owner = session.account.address
	loadBalance(owner)
	loadAuthority(owner)
	loadKids(owner)
}

async function loadBalance(owner) {
	const node = el('[data-parent-balance]')
	node.textContent = '…'
	try {
		const ata = await getAta(owner)
		animateBalance(node, await getTokenUiAmount(ata))
	} catch (err) {
		console.error('Balance load failed:', err)
		node.textContent = '—'
	}
}

function animateBalance(node, amount) {
	const render = v => formatMoney(v)
	if (reduced) {
		node.textContent = render(amount)
		return
	}
	const obj = { v: 0 }
	gsap.to(obj, {
		v: amount,
		duration: 0.8,
		ease: 'power2.out',
		onUpdate: () => (node.textContent = render(obj.v)),
	})
}

function setStatus(color, label) {
	el('[data-auth-status]').innerHTML = `<span class="w-2 h-2 rounded-full bg-${color}"></span> ${label}`
}

function setAddKidEnabled(enabled) {
	const form = el('[data-add-kid]')
	form.querySelectorAll('input, select, button').forEach(node => (node.disabled = !enabled))
	form.classList.toggle('opacity-60', !enabled)
}

async function loadAuthority(owner) {
	const btn = el('[data-init-authority]')
	setStatus('gold', 'Checking…')
	btn.hidden = true
	setAddKidEnabled(false)

	let auth
	try {
		auth = await fetchAuthority(owner)
	} catch (err) {
		console.error('Authority check failed:', err)
		setStatus('maple', 'Error')
		return
	}

	if (auth.exists) {
		setStatus('loon', 'Ready')
		btn.hidden = true
		setAddKidEnabled(true)
	} else {
		setStatus('maple', 'Not set up')
		btn.hidden = false
		btn.textContent = 'Set up'
	}
}

function kidCard(d) {
	const kid = d.data.header.delegatee
	const { amount, remaining, resetTs, expiry, expired, periodLen } = summarizeDelegation(d)
	const per = periodLabel(periodLen)
	const pct = amount > 0 ? Math.round((remaining / amount) * 100) : 0

	const card = document.createElement('div')
	card.className = 'rounded-card bg-white border border-sand p-5'
	if (expired) card.classList.add('opacity-70')
	card.innerHTML = `
		<div class="flex items-start justify-between gap-3">
			<div class="flex items-center gap-3 min-w-0">
				<div class="w-10 h-10 rounded-full bg-loon/10 text-loon flex items-center justify-center shrink-0">
					<svg class="w-5 h-5" aria-hidden="true"><use href="#i-user"/></svg>
				</div>
				<div class="min-w-0">
					<div class="flex items-center gap-1.5 min-w-0" data-name-wrap></div>
					<div class="text-muted text-sm">${formatMoney(amount)} / ${per}</div>
				</div>
			</div>
			<button data-revoke class="text-muted hover:text-maple text-sm font-medium inline-flex items-center gap-1 transition-colors disabled:opacity-50">
				<svg class="w-4 h-4" aria-hidden="true"><use href="#i-revoke"/></svg> Revoke
			</button>
		</div>
		<div class="mt-4">
			<div class="flex justify-between text-sm mb-1.5">
				<span class="text-muted">Remaining this ${per}</span>
				<span class="font-semibold" data-remaining>${formatMoney(remaining)}</span>
			</div>
			<div class="h-2 rounded-full bg-sand overflow-hidden">
				<div class="h-full bg-loon rounded-full" data-bar style="width:0%"></div>
			</div>
		</div>
		<div class="mt-3 text-xs text-muted">${expired ? 'Expired' : `Resets ${formatDate(resetTs)} · Expires ${formatDate(expiry)}`}</div>`

	renderName(card.querySelector('[data-name-wrap]'), kid)

	const bar = card.querySelector('[data-bar]')
	const remEl = card.querySelector('[data-remaining]')
	if (reduced) {
		bar.style.width = `${pct}%`
	} else {
		gsap.to(bar, { width: `${pct}%`, duration: 0.7, ease: 'power2.out' })
		const obj = { v: 0 }
		gsap.to(obj, { v: remaining, duration: 0.7, ease: 'power2.out', onUpdate: () => (remEl.textContent = formatMoney(obj.v)) })
	}

	card.querySelector('[data-revoke]').addEventListener('click', () => onRevoke(d, card))
	return card
}

function renderName(wrap, kid) {
	wrap.innerHTML = ''
	const span = document.createElement('span')
	span.className = 'font-semibold truncate'
	span.title = kid
	span.textContent = getNickname(kid) || truncateAddress(kid)
	const btn = document.createElement('button')
	btn.className = 'text-muted hover:text-loon shrink-0 transition-colors'
	btn.setAttribute('aria-label', 'Rename kid')
	btn.innerHTML = '<svg class="w-3.5 h-3.5" aria-hidden="true"><use href="#i-pencil"/></svg>'
	btn.addEventListener('click', () => editName(wrap, kid))
	wrap.append(span, btn)
}

function editName(wrap, kid) {
	wrap.innerHTML = ''
	const input = document.createElement('input')
	input.className = 'font-semibold rounded-lg border border-loon bg-cream px-2 py-0.5 text-sm w-full focus:outline-none'
	input.maxLength = 24
	input.value = getNickname(kid)
	input.placeholder = truncateAddress(kid)
	const save = () => {
		setNickname(kid, input.value)
		renderName(wrap, kid)
	}
	input.addEventListener('keydown', e => {
		if (e.key === 'Enter') {
			e.preventDefault()
			save()
		} else if (e.key === 'Escape') {
			renderName(wrap, kid)
		}
	})
	input.addEventListener('blur', save)
	wrap.append(input)
	input.focus()
	input.select()
}

async function onRevoke(d, card) {
	if (!currentSigner) return
	const btn = card.querySelector('[data-revoke]')
	const label = btn.innerHTML
	btn.disabled = true
	btn.textContent = 'Revoking…'
	try {
		const sig = await revokeKid({ signer: currentSigner, delegationAccount: d.address })
		console.log('revokeDelegation:', explorerTx(sig))
		const finish = () => loadKids(currentSigner.address)
		if (reduced) finish()
		else gsap.to(card, { opacity: 0, y: -8, duration: 0.25, ease: 'power2.in', onComplete: finish })
	} catch (err) {
		console.error('Revoke failed:', err)
		btn.disabled = false
		btn.innerHTML = label
	}
}

async function loadKids(owner) {
	const wrap = el('[data-kids]')
	const empty = el('[data-kids-empty]')
	let kids = []
	try {
		kids = await listKids(owner)
	} catch (err) {
		console.error('Kids load failed:', err)
	}
	wrap.innerHTML = ''
	empty.hidden = kids.length > 0
	kids.forEach(d => wrap.appendChild(kidCard(d)))
	if (!reduced) {
		const targets = kids.length ? wrap.children : empty
		gsap.from(targets, { y: 12, opacity: 0, duration: 0.4, ease: 'power2.out', stagger: 0.06, clearProps: 'all' })
	}
}

function showError(message) {
	const node = el('[data-add-kid-error]')
	node.textContent = message
	node.hidden = false
}

function hideError() {
	el('[data-add-kid-error]').hidden = true
}

function wireInit() {
	el('[data-init-authority]').addEventListener('click', async () => {
		if (!currentSigner) return
		const btn = el('[data-init-authority]')
		btn.disabled = true
		btn.textContent = 'Confirm…'
		try {
			const sig = await initAuthority(currentSigner)
			console.log('initSubscriptionAuthority:', explorerTx(sig))
			await loadAuthority(currentSigner.address)
		} catch (err) {
			console.error('Init authority failed:', err)
			btn.textContent = 'Retry'
		} finally {
			btn.disabled = false
		}
	})
}

function wireAddKid() {
	const form = el('[data-add-kid]')
	form.addEventListener('submit', async e => {
		e.preventDefault()
		hideError()
		if (!currentSigner) return

		const data = new FormData(form)
		let kid
		try {
			kid = address(String(data.get('kid')).trim())
		} catch {
			return showError('Enter a valid wallet address.')
		}
		const entered = Number(data.get('amount'))
		if (!(entered > 0)) return showError('Amount must be greater than zero.')
		const amountUsdc = toUsd(entered)
		const periodSeconds = data.get('period') === 'week' ? PERIOD_WEEK : PERIOD_MONTH
		const expiryTs = Math.floor(Date.now() / 1000) + 365 * 24 * 60 * 60

		const btn = el('[data-add-kid-submit]')
		const label = btn.innerHTML
		btn.disabled = true
		btn.textContent = 'Confirm…'
		try {
			const sig = await addKid({ signer: currentSigner, kid, amountUsdc, periodSeconds, expiryTs })
			console.log('createRecurringDelegation:', explorerTx(sig))
			form.reset()
			await loadKids(currentSigner.address)
		} catch (err) {
			console.error('Add kid failed:', err)
			showError(err?.message ? String(err.message).slice(0, 160) : 'Transaction failed.')
		} finally {
			btn.disabled = false
			btn.innerHTML = label
		}
	})
}

export function initParentFeature() {
	wireInit()
	wireAddKid()
}
