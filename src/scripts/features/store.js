import { MERCHANTS, explorerAddr } from '../lib/config.js'
import { truncateAddress } from '../lib/format.js'

export function initStore() {
	const wrap = document.querySelector('[data-merchants]')
	if (!wrap) return
	wrap.innerHTML = MERCHANTS.map(
		m => `
		<div class="rounded-card bg-white border border-sand p-6">
			<svg class="w-7 h-7 text-maple"><use href="#${m.icon}"/></svg>
			<div class="font-semibold mt-3">${m.name}</div>
			<div class="text-muted text-sm">${m.blurb}</div>
			<a href="${explorerAddr(m.address)}" target="_blank" rel="noopener" class="text-xs text-loon hover:underline mt-3 inline-block">${truncateAddress(m.address)}</a>
		</div>`
	).join('')
}
