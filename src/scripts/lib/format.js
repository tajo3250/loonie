import { USDC_DECIMALS, USD_TO_CAD } from './config.js'

export function truncateAddress(addr, lead = 4, tail = 4) {
	const s = String(addr)
	if (s.length <= lead + tail + 1) return s
	return `${s.slice(0, lead)}…${s.slice(-tail)}`
}

export function baseUnitsToUsdc(units) {
	return Number(units) / 10 ** USDC_DECIMALS
}

export function usdcToBaseUnits(amount) {
	return BigInt(Math.round(Number(amount) * 10 ** USDC_DECIMALS))
}

export function formatMoney(amount, currency = 'CAD') {
	const value = currency === 'CAD' ? amount * USD_TO_CAD : amount
	return new Intl.NumberFormat('en-CA', {
		style: 'currency',
		currency,
		maximumFractionDigits: 2,
	}).format(value)
}
