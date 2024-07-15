export let keybinds = {
	ArrowUp: false,
	ArrowDown: false,
	ArrowRight: false,
	ArrowLeft: false,
	Space: false,
}

export const key_listen = (key) => {
	document.addEventListener("keydown", ({ code }) => code == key && (keybinds[key] = true))
	document.addEventListener("keyup", ({ code }) => code == key && (keybinds[key] = false))
}