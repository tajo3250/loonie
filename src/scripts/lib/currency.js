let currency = 'CAD'
const listeners = new Set()

export const getCurrency = () => currency

export function setCurrency(next) {
	if (next === currency) return
	currency = next
	listeners.forEach(fn => fn(currency))
}

export function toggleCurrency() {
	setCurrency(currency === 'CAD' ? 'USD' : 'CAD')
}

export function onCurrencyChange(fn) {
	listeners.add(fn)
	return () => listeners.delete(fn)
}
