import { USDC_DECIMALS, USD_TO_CAD } from './config.js'
import { getCurrency } from './currency.js'

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

export const PERIOD_WEEK = 7 * 24 * 60 * 60
export const PERIOD_MONTH = 30 * 24 * 60 * 60

export function periodLabel(seconds) {
	const s = Number(seconds)
	if (s === PERIOD_WEEK) return 'week'
	if (s === PERIOD_MONTH) return 'month'
	return `${Math.round(s / 86400)} days`
}

export function formatDate(unixSeconds) {
	return new Date(Number(unixSeconds) * 1000).toLocaleDateString('en-CA', {
		month: 'short',
		day: 'numeric',
		year: 'numeric',
	})
}

export function formatMoney(amount, currency = getCurrency()) {
	const value = currency === 'CAD' ? amount * USD_TO_CAD : amount
	return new Intl.NumberFormat('en-CA', {
		style: 'currency',
		currency,
		maximumFractionDigits: 2,
	}).format(value)
}
