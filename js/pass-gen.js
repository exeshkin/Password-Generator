const btnCreate = document.querySelector('.btn-create')

const passBoxs = document.querySelectorAll('.pass')
const passCopieds = document.querySelectorAll('.pass-copied')
const checkboxs = document.querySelectorAll('.checkbox')

const passLenght = document.getElementById('passlenght')
const lowercase = document.getElementById('lowercase')
const uppercase = document.getElementById('uppercase')
const number = document.getElementById('number')
const symb = document.getElementById('symb')

let checkLowercase = true
let checkUppercase = true
let checkNumber = true
let checkSymb = true

const arr_abc_lowercase = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k', 'l', 'm', 'n', 'o', 'p', 'q', 'r', 's', 't', 'u', 'v', 'w', 'x', 'y', 'z']
const arr_abc_uppercase = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z']
const arr_symb = ['!', '@', '#', '$', '%', '&', '?', '-', '+', '=', '~']

let pass = []
let allPassArray = []

const getRandomInt = (max) => {
	return Math.floor(Math.random() * max)
}

const functions = {
	getRndSimbLower() {
		pass.push(arr_abc_lowercase[getRandomInt(arr_abc_lowercase.length)])
	},
	getRndSimbUpper() {
		pass.push(arr_abc_uppercase[getRandomInt(arr_abc_uppercase.length)])
	},
	getRndNumber() {
		pass.push(getRandomInt(10))
	},
	getRndSpecSimb() {
		pass.push(arr_symb[getRandomInt(arr_symb.length)])
	}
}

let funcKeyArray = Object.keys(functions)

const toggleFunc = () => {
	if (!(checkLowercase === false && checkUppercase === false && checkNumber === false && checkSymb === false)) {
		if (checkLowercase === false) funcKeyArray = funcKeyArray.filter((n) => { return n != 'getRndSimbLower' })
		if (checkUppercase === false) funcKeyArray = funcKeyArray.filter((n) => { return n != 'getRndSimbUpper' })
		if (checkNumber === false) funcKeyArray = funcKeyArray.filter((n) => { return n != 'getRndNumber' })
		if (checkSymb === false) funcKeyArray = funcKeyArray.filter((n) => { return n != 'getRndSpecSimb' })
	} else {
		funcKeyArray = []
	}
}

const rndFunc = () => {
	if (funcKeyArray.length !== 0) {
		for (let i = 0; i < passLenght.value; i++) {
			functions[funcKeyArray[getRandomInt(funcKeyArray.length)]]()
		}
	}
}

const errorMessege = (str) => {
	passBoxs.forEach(box => box.innerHTML = str)
}

const printPass = (div) => {
	if (funcKeyArray.length === 0) {
		errorMessege('Выбирите составляющие для пароля')
		return
	}

	if (!(passLenght.value > 0 && passLenght.value <= 64)) {
		errorMessege('Введите длину пароля от 1 до 64')
		return
	}

	const readyPassword = pass.join('')
	div.innerHTML = readyPassword
	allPassArray.push(readyPassword)
}

const removeClassCopied = (classArray) => {
	classArray.forEach(box => {
		box.classList.remove('_copied')
	})
}

const setWidthPassCopied = () => {
	passCopieds.forEach(elem => setTimeout(() => {elem.style.width = `${passBoxs[0].clientWidth}px`}, 1000))
}

const start = () => {
	allPassArray = []
	removeClassCopied(passBoxs)
	toggleFunc()
	passBoxs.forEach(div => {
		pass = []
		rndFunc()
		printPass(div)
	})
	setWidthPassCopied()
}

lowercase.addEventListener('change', () => {
	lowercase.checked ? checkLowercase = true : checkLowercase = false
	funcKeyArray = Object.keys(functions)
})

uppercase.addEventListener('change', () => {
	uppercase.checked ? checkUppercase = true : checkUppercase = false
	funcKeyArray = Object.keys(functions)
})

number.addEventListener('change', () => {
	number.checked ? checkNumber = true : checkNumber = false
	funcKeyArray = Object.keys(functions)
})

symb.addEventListener('change', () => {
	symb.checked ? checkSymb = true : checkSymb = false
	funcKeyArray = Object.keys(functions)
})

btnCreate.addEventListener('click', (e) => {
	e.preventDefault()
	start()
})

for (let i = 0; i < passBoxs.length; i++) {
	passBoxs[i].addEventListener('click', (e) => {
		e.preventDefault()
		navigator.clipboard.writeText(allPassArray[i])
			.then(() => {
				removeClassCopied(passBoxs)
				passBoxs[i].classList.add('_copied')
				passCopieds[i].classList.add('_copied')
				setTimeout(() => removeClassCopied(passCopieds), 800)
			})
			.catch(err => {
				console.log(err)
			})
	})
}

passLenght.oninput = () => setTimeout(start, 10)

for (const checkbox of checkboxs) {
	checkbox.addEventListener('click', () => {
		setTimeout(start, 10)
	})
}

window.addEventListener('resize', setWidthPassCopied)

start()
