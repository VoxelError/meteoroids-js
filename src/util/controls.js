export const cursor = {
	x: 0,
	y: 0,
	button: "",
	click: () => { },
	held: false,
	show: true,
}

export const keydown = (event, key, func) => event.code == key && func()

export const listen = (canvas) => {
	canvas.addEventListener("mousedown", (event) => {
		if (event.button == 0) { cursor.button = "left" }
		if (event.button == 1) { cursor.button = "middle" }
		if (event.button == 2) { cursor.button = "right" }
		cursor.held = true
		cursor.click()
	})
	canvas.addEventListener("mouseup", () => {
		cursor.button = ""
		cursor.held = false
	})
	canvas.addEventListener("mousemove", (event) => {
		cursor.x = event.offsetX
		cursor.y = event.offsetY
	})
	canvas.addEventListener("mouseover", () => cursor.show = true)
	canvas.addEventListener("mouseleave", () => {
		cursor.held = false
		cursor.show = false
	})
	canvas.addEventListener("wheel", (event) => {
		// 	e.preventDefault()
		// 	cursor.size += e.deltaY * 0.1
	})
	canvas.addEventListener("contextmenu", (event) => event.preventDefault())
}