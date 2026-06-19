import gsap from 'gsap'
import { address } from '@solana/kit'
import { getSolBalance } from './lib/rpc.js'
import { listSolanaWallets, onWalletsChange, connect, disconnect, createWalletSigner } from './lib/wallet.js'
import { truncateAddress } from './lib/format.js'

const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches

const session = {
	wallet: null,
	account: null,
	signer: null,
}

function setRole(role) {
	document.querySelectorAll('[data-role]').forEach(tab => {
		const active = tab.dataset.role === role
		tab.classList.toggle('bg-white', active)
		tab.classList.toggle('shadow-sm', active)
		tab.classList.toggle('text-ink', active)
		tab.classList.toggle('text-muted', !active)
		tab.setAttribute('aria-selected', String(active))
	})
	document.querySelectorAll('[data-panel]').forEach(panel => {
		panel.hidden = panel.dataset.panel !== role
	})
	revealPanel(role)
}

function reveal(targets, delay = 0) {
	if (prefersReducedMotion || targets.length === 0) return
	gsap.from(targets, {
		y: 16,
		opacity: 0,
		duration: 0.5,
		ease: 'power3.out',
		stagger: 0.08,
		delay,
		clearProps: 'all',
	})
}

function revealPanel(role) {
	const panel = document.querySelector(`[data-panel="${role}"]`)
	if (panel) reveal(panel.querySelectorAll('[data-reveal]'))
}

function closeWalletMenu() {
	const menu = document.querySelector('[data-wallet-menu]')
	menu.hidden = true
	menu.innerHTML = ''
}

function openWalletMenu() {
	const menu = document.querySelector('[data-wallet-menu]')
	menu.innerHTML = ''

	if (session.account) {
		menu.appendChild(menuButton('Disconnect', async () => {
			await handleDisconnect()
			closeWalletMenu()
		}))
		menu.hidden = false
		return
	}

	const wallets = listSolanaWallets()
	if (wallets.length === 0) {
		const empty = document.createElement('div')
		empty.className = 'px-3 py-2 text-muted'
		empty.textContent = 'No Solana wallet detected. Install Phantom to continue.'
		menu.appendChild(empty)
		menu.hidden = false
		return
	}

	wallets.forEach(wallet => {
		menu.appendChild(
			menuButton(wallet.name, async () => {
				closeWalletMenu()
				await handleConnect(wallet)
			}, wallet.icon)
		)
	})
	menu.hidden = false
}

function menuButton(label, onClick, icon) {
	const btn = document.createElement('button')
	btn.className = 'w-full flex items-center gap-2 px-3 py-2 rounded-xl hover:bg-sand text-left font-medium transition-colors'
	if (icon) {
		const img = document.createElement('img')
		img.src = icon
		img.alt = ''
		img.className = 'w-5 h-5 rounded'
		btn.appendChild(img)
	}
	const span = document.createElement('span')
	span.textContent = label
	btn.appendChild(span)
	btn.addEventListener('click', onClick)
	return btn
}

async function handleConnect(wallet) {
	try {
		const account = await connect(wallet)
		session.wallet = wallet
		session.account = account
		session.signer = createWalletSigner(wallet, account)
		await renderConnected()
	} catch (err) {
		console.error('Wallet connect failed:', err)
	}
}

async function handleDisconnect() {
	try {
		if (session.wallet) await disconnect(session.wallet)
	} finally {
		session.wallet = null
		session.account = null
		session.signer = null
		renderDisconnected()
	}
}

async function renderConnected() {
	document.querySelector('[data-connect]').hidden = true
	document.querySelector('[data-wallet]').hidden = false
	document.querySelector('[data-wallet-address]').textContent = truncateAddress(session.account.address)

	const balanceEl = document.querySelector('[data-wallet-balance]')
	balanceEl.textContent = '…'
	try {
		const sol = await getSolBalance(address(session.account.address))
		balanceEl.textContent = `${sol.toFixed(2)} SOL`
	} catch (err) {
		console.error('Balance fetch failed:', err)
		balanceEl.textContent = ''
	}
}

function renderDisconnected() {
	document.querySelector('[data-connect]').hidden = false
	document.querySelector('[data-wallet]').hidden = true
}

function wireEvents() {
	document.querySelectorAll('[data-role]').forEach(tab => {
		tab.addEventListener('click', () => setRole(tab.dataset.role))
	})

	const toggleMenu = e => {
		e.stopPropagation()
		const menu = document.querySelector('[data-wallet-menu]')
		menu.hidden ? openWalletMenu() : closeWalletMenu()
	}
	document.querySelector('[data-connect]').addEventListener('click', toggleMenu)
	document.querySelector('[data-wallet]').addEventListener('click', toggleMenu)
	document.addEventListener('click', closeWalletMenu)

	onWalletsChange(() => {
		const menu = document.querySelector('[data-wallet-menu]')
		if (!menu.hidden && !session.account) openWalletMenu()
	})
}

function init() {
	wireEvents()
	setRole('parent')
	const hero = document.querySelector('main > section:first-of-type')
	if (hero) reveal([hero])
}

init()
