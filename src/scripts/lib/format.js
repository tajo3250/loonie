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

export function timeAgo(unixSeconds) {
	if (!unixSeconds) return ''
	const diff = Math.max(0, Math.floor(Date.now() / 1000) - Number(unixSeconds))
	if (diff < 60) return 'just now'
	if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
	if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
	return `${Math.floor(diff / 86400)}d ago`
}

export function formatDate(unixSeconds) {
	return new Date(Number(unixSeconds) * 1000).toLocaleDateString('en-CA', {
		month: 'short',
		day: 'numeric',
		year: 'numeric',
	})
}

export function currencySymbol(currency = getCurrency()) {
	return currency === 'CAD' ? 'CA$' : 'US$'
}

export function toUsd(displayAmount, currency = getCurrency()) {
	return currency === 'CAD' ? displayAmount / USD_TO_CAD : displayAmount
}

export function formatMoney(amount, currency = getCurrency()) {
	const value = currency === 'CAD' ? amount * USD_TO_CAD : amount
	const symbol = currency === 'CAD' ? 'CA$' : 'US$'
	const number = new Intl.NumberFormat('en-CA', {
		minimumFractionDigits: 2,
		maximumFractionDigits: 2,
	}).format(value)
	return `${symbol}${number}`
}
