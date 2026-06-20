import gsap from 'gsap'
import { listAllowances, spend, summarizeDelegation } from '../lib/subscriptions.js'
import { formatMoney, periodLabel, truncateAddress } from '../lib/format.js'
import { MERCHANTS, explorerTx } from '../lib/config.js'

const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
const el = sel => document.querySelector(sel)

let currentSigner = null

export async function refreshKid(session) {
	currentSigner = session?.signer ?? null
	const connected = el('[data-kid="connected"]')
	const disconnected = el('[data-kid="disconnected"]')

	if (!session?.account) {
		connected.hidden = true
		disconnected.hidden = false
		return
	}

	disconnected.hidden = true
	connected.hidden = false
	loadAllowances(session.account.address)
}

async function loadAllowances(kid) {
	const wrap = el('[data-allowances]')
	const empty = el('[data-allowances-empty]')
	let items = []
	try {
		items = await listAllowances(kid)
	} catch (err) {
		console.error('Allowances load failed:', err)
	}
	wrap.innerHTML = ''
	empty.hidden = items.length > 0
	items.forEach(d => wrap.appendChild(allowanceCard(d)))
	if (!reduced && items.length) {
		gsap.from(wrap.children, { y: 12, opacity: 0, duration: 0.4, ease: 'power2.out', stagger: 0.06, clearProps: 'all' })
	}
}

function merchantOptions() {
	return MERCHANTS.map(m => `<option value="${m.id}">${m.name}</option>`).join('')
}

function allowanceCard(d) {
	const { amount, remaining, expired, periodLen } = summarizeDelegation(d)
	const per = periodLabel(periodLen)
	const pct = amount > 0 ? Math.round((remaining / amount) * 100) : 0

	const card = document.createElement('div')
	card.className = 'rounded-card bg-white border border-sand p-5'
	if (expired) card.classList.add('opacity-70')
	card.innerHTML = `
		<div class="flex items-center justify-between gap-3">
			<div>
				<div class="text-muted text-sm">Allowance from ${truncateAddress(d.data.header.delegator)}</div>
				<div class="text-3xl font-bold mt-0.5" data-remaining>${formatMoney(remaining, 'USD')}</div>
				<div class="text-xs text-muted">of ${formatMoney(amount, 'USD')} this ${per}</div>
			</div>
			<div class="w-12 h-12 rounded-full bg-loon/10 text-loon flex items-center justify-center shrink-0" data-coin>
				<svg class="w-6 h-6"><use href="#i-coin"/></svg>
			</div>
		</div>
		<div class="mt-3 h-2 rounded-full bg-sand overflow-hidden">
			<div class="h-full bg-loon rounded-full" data-bar style="width:0%"></div>
		</div>
		${
			expired
				? '<div class="mt-4 text-sm text-maple">This allowance has expired.</div>'
				: `<form data-spend class="mt-4 grid grid-cols-[1fr_auto_auto] gap-2 items-end">
			<label class="block"><span class="text-muted text-xs">Spend</span>
				<input name="amount" type="number" min="1" step="1" value="5" class="mt-1 w-full rounded-xl border border-sand bg-cream px-3 py-2 text-sm focus:outline-none focus:border-loon" /></label>
			<label class="block"><span class="text-muted text-xs">At</span>
				<select name="merchant" class="mt-1 rounded-xl border border-sand bg-cream px-3 py-2 text-sm focus:outline-none focus:border-loon">${merchantOptions()}</select></label>
			<button type="submit" class="rounded-full bg-maple hover:bg-maple-dark text-white font-semibold px-4 py-2.5 text-sm transition-colors disabled:opacity-60">Spend</button>
			<p data-spend-msg class="col-span-3 text-sm" hidden></p>
		</form>`
		}`

	const bar = card.querySelector('[data-bar]')
	const remEl = card.querySelector('[data-remaining]')
	if (reduced) {
		bar.style.width = `${pct}%`
	} else {
		gsap.to(bar, { width: `${pct}%`, duration: 0.7, ease: 'power2.out' })
		const obj = { v: 0 }
		gsap.to(obj, { v: remaining, duration: 0.7, ease: 'power2.out', onUpdate: () => (remEl.textContent = formatMoney(obj.v, 'USD')) })
	}

	const form = card.querySelector('[data-spend]')
	if (form) form.addEventListener('submit', e => onSpend(e, d, card))
	return card
}

function showMsg(node, text, color) {
	node.textContent = text
	node.className = `col-span-3 text-sm text-${color}`
	node.hidden = false
}

function pop(card) {
	if (reduced) return
	const coin = card.querySelector('[data-coin]')
	gsap.fromTo(coin, { scale: 0.8 }, { scale: 1, duration: 0.5, ease: 'back.out(3)' })
}

async function onSpend(e, d, card) {
	e.preventDefault()
	if (!currentSigner) return

	const form = e.currentTarget
	const data = new FormData(form)
	const amountUsdc = Number(data.get('amount'))
	const msg = form.querySelector('[data-spend-msg]')
	const { remaining } = summarizeDelegation(d)

	if (!(amountUsdc > 0)) return showMsg(msg, 'Enter an amount.', 'maple')
	if (amountUsdc > remaining + 1e-9) return showMsg(msg, `Only ${formatMoney(remaining, 'USD')} left this period.`, 'maple')

	const merchant = MERCHANTS.find(m => m.id === data.get('merchant'))
	const btn = form.querySelector('button')
	const label = btn.textContent
	btn.disabled = true
	btn.textContent = 'Confirm…'
	try {
		const sig = await spend({ signer: currentSigner, delegation: d, merchant: merchant.address, amountUsdc })
		console.log('transferRecurring:', explorerTx(sig))
		showMsg(msg, `Sent ${formatMoney(amountUsdc, 'USD')} to ${merchant.name}`, 'loon')
		pop(card)
		setTimeout(() => loadAllowances(currentSigner.address), 700)
	} catch (err) {
		console.error('Spend failed:', err)
		showMsg(msg, err?.message ? String(err.message).slice(0, 140) : 'Transaction failed.', 'maple')
	} finally {
		btn.disabled = false
		btn.textContent = label
	}
}
