const KEY = 'loonie:nicknames'

function readAll() {
	try {
		return JSON.parse(localStorage.getItem(KEY) ?? '{}')
	} catch {
		return {}
	}
}

export function getNickname(addr) {
	return readAll()[String(addr)] ?? ''
}

export function setNickname(addr, name) {
	const all = readAll()
	const trimmed = name.trim()
	if (trimmed) all[String(addr)] = trimmed
	else delete all[String(addr)]
	localStorage.setItem(KEY, JSON.stringify(all))
}
