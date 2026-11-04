'use strict'

const COUNT = 10
const MIN_LEN = 1
const MAX_LEN = 64
const DEFAULT_LEN = 16
const STORAGE_KEY = 'passgen:settings:v2'

// def — набор по умолчанию (без похожих символов I, O, l, 0, 1 и части знаков)
const GROUPS = [
	{ key: 'lowercase', title: 'Строчные', all: 'abcdefghijklmnopqrstuvwxyz', def: 'abcdefghijkmnopqrstuvwxyz' },
	{ key: 'uppercase', title: 'Прописные', all: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ', def: 'ABCDEFGHJKLMNPQRSTUVWXYZ' },
	{ key: 'number', title: 'Числа', all: '0123456789', def: '23456789' },
	{ key: 'symb', title: 'Символы', all: '!"#$%&\'()*+,-./:;<=>?@[\\]^_`{|}~', def: '!#$%&*+-=?@_~' },
]

const $ = (id) => document.getElementById(id)
const lengthInput = $('passlength')
const rangeInput = $('range')
const list = $('passList')
const statusEl = $('status')

let state = defaultState()
let passwords = []
let statusTimer = null
let copiedTimer = null
const ui = {} // key -> { toggle, grid, boxes: Map(char -> input) }

/* ---------- random ---------- */
const randomInt = (max) => {
	const limit = Math.floor(2 ** 32 / max) * max // без смещения распределения
	const buf = new Uint32Array(1)
	do { crypto.getRandomValues(buf) } while (buf[0] >= limit)
	return buf[0] % max
}

const shuffle = (arr) => {
	for (let i = arr.length - 1; i > 0; i--) {
		const j = randomInt(i + 1);
		[arr[i], arr[j]] = [arr[j], arr[i]]
	}
	return arr
}

// pools — массив строк (по одной на включённую группу)
const generate = (length, pools) => {
	const all = pools.join('')
	const chars = []
	for (const pool of shuffle([...pools])) {
		if (chars.length >= length) break
		chars.push(pool[randomInt(pool.length)])
	}
	while (chars.length < length) chars.push(all[randomInt(all.length)])
	return shuffle(chars).join('')
}

/* ---------- state / storage ---------- */
function defaultState() {
	const groups = {}
	GROUPS.forEach((g) => { groups[g.key] = { enabled: true, chars: g.def } })
	return { length: DEFAULT_LEN, groups }
}

const inAlphabetOrder = (g, set) => [...g.all].filter((c) => set.has(c)).join('')

const loadState = () => {
	const s = defaultState()
	try {
		const raw = JSON.parse(localStorage.getItem(STORAGE_KEY))
		if (!raw || typeof raw !== 'object') return s
		const len = Number(raw.length)
		if (Number.isInteger(len) && len >= MIN_LEN && len <= MAX_LEN) s.length = len
		if (raw.groups && typeof raw.groups === 'object') {
			GROUPS.forEach((g) => {
				const r = raw.groups[g.key]
				if (!r || typeof r.chars !== 'string') return
				s.groups[g.key] = {
					enabled: r.enabled !== false,
					chars: inAlphabetOrder(g, new Set(r.chars)), // оставляем только допустимые символы
				}
			})
		}
	} catch (e) { /* хранилище недоступно или данные повреждены — значения по умолчанию */ }
	return s
}

const saveState = () => {
	try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)) } catch (e) { /* приватный режим */ }
}

/* ---------- UI build ---------- */
const buildGroups = () => {
	const root = $('groups')
	GROUPS.forEach((g) => {
		const wrap = document.createElement('section')
		wrap.className = 'group'

		const head = document.createElement('div')
		head.className = 'group-head'

		const toggleLabel = document.createElement('label')
		toggleLabel.className = 'toggle'
		toggleLabel.innerHTML =
			'<input class="checkbox" type="checkbox"><span class="track"><span class="knob"></span></span>' +
			'<span class="set-input"></span>'
		toggleLabel.querySelector('.set-input').textContent = g.title
		const toggle = toggleLabel.querySelector('input')

		const btnAll = document.createElement('button')
		btnAll.type = 'button'
		btnAll.className = 'link'
		btnAll.textContent = 'Выбрать все'

		head.append(toggleLabel, btnAll)

		const grid = document.createElement('div')
		grid.className = 'chars'
		const boxes = new Map()
		for (const ch of g.all) {
			const label = document.createElement('label')
			label.className = 'ch'
			const input = document.createElement('input')
			input.type = 'checkbox'
			input.setAttribute('aria-label', `${g.title}: ${ch}`)
			const span = document.createElement('span')
			span.textContent = ch
			label.append(input, span)
			grid.appendChild(label)
			boxes.set(ch, input)

			input.addEventListener('change', () => {
				const set = new Set(state.groups[g.key].chars)
				input.checked ? set.add(ch) : set.delete(ch)
				state.groups[g.key].chars = inAlphabetOrder(g, set)
				commit()
			})
		}

		toggle.addEventListener('change', () => {
			state.groups[g.key].enabled = toggle.checked
			syncGroup(g)
			commit()
		})
		btnAll.addEventListener('click', () => {
			state.groups[g.key] = { enabled: true, chars: g.all }
			syncGroup(g)
			commit()
		})

		wrap.append(head, grid)
		root.appendChild(wrap)
		ui[g.key] = { toggle, grid, boxes }
	})

	list.innerHTML = ''
	for (let i = 0; i < COUNT; i++) {
		const li = document.createElement('li')
		const btn = document.createElement('button')
		btn.type = 'button'
		btn.className = 'pass'
		btn.dataset.index = i
		btn.title = 'Нажмите, чтобы скопировать'
		li.appendChild(btn)
		list.appendChild(li)
	}
}

const syncGroup = (g) => {
	const s = state.groups[g.key]
	const u = ui[g.key]
	u.toggle.checked = s.enabled
	u.grid.classList.toggle('off', !s.enabled)
	for (const [ch, input] of u.boxes) {
		input.checked = s.chars.includes(ch)
		input.disabled = !s.enabled
	}
}

const syncAll = () => {
	GROUPS.forEach(syncGroup)
	lengthInput.value = state.length
	rangeInput.value = state.length
}

/* ---------- generation ---------- */
const getLength = () => {
	const n = parseInt(lengthInput.value, 10)
	return Number.isNaN(n) ? NaN : n
}
const lengthValid = (n) => Number.isInteger(n) && n >= MIN_LEN && n <= MAX_LEN

const activePools = () =>
	GROUPS.filter((g) => state.groups[g.key].enabled && state.groups[g.key].chars.length > 0)
		.map((g) => state.groups[g.key].chars)

const showStatus = (text, isError = false, ms = 0) => {
	clearTimeout(statusTimer)
	statusEl.textContent = text
	statusEl.classList.toggle('error', isError)
	if (ms) statusTimer = setTimeout(() => showStatus(''), ms)
}

const clearCopied = () => {
	clearTimeout(copiedTimer)
	list.querySelectorAll('.copied').forEach((el) => el.classList.remove('copied'))
}

const start = () => {
	clearCopied()
	const length = getLength()
	if (!lengthValid(length)) {
		showStatus(`Введите длину пароля от ${MIN_LEN} до ${MAX_LEN}`, true)
		return
	}
	const pools = activePools()
	if (pools.length === 0) {
		showStatus('Выберите хотя бы один символ', true)
		return
	}
	showStatus('')
	passwords = Array.from({ length: COUNT }, () => generate(length, pools))
	list.querySelectorAll('.pass').forEach((btn, i) => { btn.textContent = passwords[i] })
}

const commit = () => { saveState(); start() }

/* ---------- copy ---------- */
const copyText = async (text) => {
	try {
		await navigator.clipboard.writeText(text)
		return true
	} catch (e) {
		const ta = document.createElement('textarea')
		ta.value = text
		ta.setAttribute('readonly', '')
		ta.style.cssText = 'position:fixed;opacity:0;top:0;left:0'
		document.body.appendChild(ta)
		ta.select()
		let ok = false
		try { ok = document.execCommand('copy') } catch (e2) { ok = false }
		ta.remove()
		return ok
	}
}

list.addEventListener('click', async (e) => {
	const btn = e.target.closest('.pass')
	if (!btn) return
	const text = passwords[Number(btn.dataset.index)]
	if (!text) return
	if (await copyText(text)) {
		clearCopied()
		btn.classList.add('copied')
		showStatus('Пароль скопирован', false, 1500)
		copiedTimer = setTimeout(clearCopied, 1200)
	} else {
		showStatus('Не удалось скопировать. Выделите пароль вручную.', true, 4000)
	}
})

/* ---------- events ---------- */
rangeInput.addEventListener('input', () => {
	lengthInput.value = rangeInput.value
	state.length = Number(rangeInput.value)
	commit()
})

lengthInput.addEventListener('input', () => {
	const n = getLength()
	if (lengthValid(n)) {
		rangeInput.value = n
		state.length = n
		saveState()
	}
	start()
})

lengthInput.addEventListener('change', () => {
	const n = getLength()
	const v = Number.isNaN(n) ? DEFAULT_LEN : Math.min(MAX_LEN, Math.max(MIN_LEN, n))
	lengthInput.value = v
	rangeInput.value = v
	state.length = v
	commit()
})

$('btnCreate').addEventListener('click', start)

$('btnReset').addEventListener('click', () => {
	const len = state.length
	state = defaultState()
	state.length = len // длину не трогаем
	syncAll()
	commit()
})

/* ---------- init ---------- */
state = loadState()
buildGroups()
syncAll()
$('year').textContent = new Date().getFullYear()
start()
