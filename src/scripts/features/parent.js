import gsap from 'gsap'
import { fetchAuthority, getParentAta, initAuthority } from '../lib/subscriptions.js'
import { getTokenUiAmount } from '../lib/rpc.js'
import { formatMoney } from '../lib/format.js'
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
}

async function loadBalance(owner) {
	const node = el('[data-parent-balance]')
	node.textContent = '…'
	try {
		const ata = await getParentAta(owner)
		animateBalance(node, await getTokenUiAmount(ata))
	} catch (err) {
		console.error('Balance load failed:', err)
		node.textContent = '—'
	}
}

function animateBalance(node, amount) {
	const render = v => formatMoney(v, 'USD')
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

async function loadAuthority(owner) {
	const hint = el('[data-auth-hint]')
	const btn = el('[data-init-authority]')
	setStatus('gold', 'Checking…')
	btn.hidden = true

	let auth
	try {
		auth = await fetchAuthority(owner)
	} catch (err) {
		console.error('Authority check failed:', err)
		setStatus('maple', 'Could not check status')
		return
	}

	if (auth.exists) {
		setStatus('loon', 'Ready')
		hint.textContent = 'Your allowance authority is set up. You can add kids.'
		btn.hidden = true
	} else {
		setStatus('maple', 'Not set up')
		hint.textContent = 'A one-time setup that lets you delegate allowances on this mint. No funds move.'
		btn.hidden = false
		btn.textContent = 'Set up authority'
	}
}

function wireInit() {
	const btn = el('[data-init-authority]')
	btn.addEventListener('click', async () => {
		if (!currentSigner) return
		btn.disabled = true
		btn.textContent = 'Confirm in wallet…'
		try {
			const sig = await initAuthority(currentSigner)
			console.log('initSubscriptionAuthority:', explorerTx(sig))
			await loadAuthority(currentSigner.address)
		} catch (err) {
			console.error('Init authority failed:', err)
			btn.textContent = 'Failed — try again'
		} finally {
			btn.disabled = false
		}
	})
}

export function initParentFeature() {
	wireInit()
}
