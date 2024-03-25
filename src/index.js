import { fxExplode, fxHit, fxLaser, fxThrust } from "./sounds"

const canvas = document.getElementById("game_canvas")
const context = canvas.getContext("2d")

const pi = Math.PI
const { floor, random } = Math
const sin = (value) => Math.sin(value)
const cos = (value) => Math.cos(value)
const rng = (range, min = 1) => floor(Math.random() * range) + min
const to_radians = (num) => (num * pi) / 180
const distance = (x1, y1, x2, y2) => Math.sqrt(((x2 - x1) ** 2) + ((y2 - y1) ** 2))
const to_array = (length, fill = 0) => Array(length).fill(fill)

const high_score = () => localStorage.getItem("highscore") ?? 0
const set_high_score = (value) => localStorage.setItem("highscore", value)

const debug_collisions = false
const debug_dot = false

const asteroids_list = []

let ship
let text_content
let text_alpha = 0
let game_score
let game_level
let game_lives
let flicker = 0

const default_ship = () => {
	return {
		x: canvas.width / 2,
		y: canvas.height / 2,
		r: 15,
		a: to_radians(90),
		blink_num: 15,
		blink_time: 6,
		can_shoot: true,
		is_dead: false,
		has_crashed: false,
		explode_time: 0,
		lasers: [],
		rot: 0,
		is_thrusting: false,
		thrust: {
			x: 0,
			y: 0
		}
	}
}

document.addEventListener("keydown", (event) => {
	if (ship.is_dead) return
	event.code == "ArrowUp" && (ship.is_thrusting = true)
	event.code == "ArrowRight" && (ship.rot = -to_radians(3))
	event.code == "ArrowLeft" && (ship.rot = to_radians(3))
	if (ship.explode_time > 0) return
	event.code == "Space" && shoot_laser()
})

document.addEventListener("keyup", (event) => {
	if (ship.is_dead) return
	event.code == "ArrowUp" && (ship.is_thrusting = false)
	event.code == "ArrowRight" && (ship.rot = 0)
	event.code == "ArrowLeft" && (ship.rot = 0)
	event.code == "Space" && (ship.can_shoot = true)
})

const new_life = () => {
	game_lives--
	ship = default_ship()
	game_lives <= 0 && game_over()
}

const new_level = () => {
	asteroids_list.length = 0
	game_level++
	text_content = `Level ${game_level}`
	text_alpha = 1.0
	to_array(2 + game_level).forEach(() => {
		let x, y
		do {
			x = rng(canvas.width)
			y = rng(canvas.height)
		} while (distance(x, y, ship.x, ship.y) < ship.r + 200)
		new_asteroid(x, y, 50)
	})
}

const new_game = () => {
	game_level = 0
	game_score = 0
	game_lives = 3
	ship = default_ship()
	new_level()
}

const game_over = () => {
	ship.is_dead = true
	text_content = "Game Over"
	text_alpha = 1.0
}

const new_asteroid = (x, y, r) => {
	const angle = random() * pi * 2
	const vertices = rng(11, 5)
	const offsets = to_array(vertices).map(() => (random() * 0.8) + 0.6)
	const velocity = () => {
		const roll = (random() * 0.2) + 0.2
		const flip = random() < 0.5 ? -1 : 1
		const mult = game_level * 1.1
		return roll * flip * mult
	}
	asteroids_list.push({ x, y, r, a: angle, xv: velocity(), yv: velocity(), offs: offsets, vert: vertices })
}

const destroy_asteroid = (asteroid, index) => {
	const { x, y, r } = asteroid

	if (r == 50) {
		game_score += 20
		new_asteroid(x, y, 25)
		new_asteroid(x, y, 25)
	} else if (r == 25) {
		game_score += 50
		new_asteroid(x, y, 12.5)
		new_asteroid(x, y, 12.5)
	} else game_score += 100

	game_score > high_score() && set_high_score(game_score)

	asteroids_list.splice(index, 1)
	fxHit.play()
}

const shoot_laser = () => {
	const { x, y, r, a } = ship
	const laser_speed = 8

	if (ship.can_shoot && ship.lasers.length < 10) {
		ship.lasers.push({
			x: x + (4 / 3) * r * cos(a),
			y: y - (4 / 3) * r * sin(a),
			xv: laser_speed * cos(a),
			yv: -laser_speed * sin(a),
			dist: 0,
			explode_time: 0
		})
		fxLaser.play()
	}
	ship.can_shoot = false
}

const draw_space = () => {
	context.fillStyle = "black"
	context.fillRect(0, 0, canvas.width, canvas.height)
}

const draw_collision = (x, y, r) => {
	context.strokeStyle = "lime"
	context.beginPath()
	context.arc(x, y, r, 0, pi * 2, false)
	context.stroke()
}

const draw_dot = () => {
	context.fillStyle = "red"
	context.fillRect(ship.x - 1, ship.y - 1, 2, 2)
}

const draw_score = () => {
	context.textAlign = "right"
	context.textBaseline = "middle"
	context.fillStyle = "white"
	context.font = "20px Emulogic"
	context.fillText(game_score, canvas.width - 15, 30)
}

const draw_high_score = () => {
	context.textAlign = "center"
	context.textBaseline = "middle"
	context.fillStyle = "white"
	context.font = "20px Emulogic"
	context.fillText("HIGH SCORE", canvas.width / 2, 30)
	context.fillText(high_score(), canvas.width / 2, 60)
}

const draw_asteroids = () => asteroids_list.forEach((asteroid) => {
	const { x, y, r, a, vert } = asteroid
	const offsets = asteroid.offs
	const vertex = (x_axis, index) => (x_axis
		? x + (r * offsets[index] * cos(a + (index * pi * 2 / vert)))
		: y + (r * offsets[index] * sin(a + (index * pi * 2 / vert)))
	)

	context.strokeStyle = "grey"
	context.beginPath()
	context.moveTo(vertex(true, 0), vertex(false, 0))
	offsets.forEach((v, index) => context.lineTo(vertex(true, index), vertex(false, index)))
	context.closePath()
	context.stroke()

	debug_collisions && draw_collision(x, y, r)
})

const draw_lasers = () => ship.lasers.forEach((laser) => {
	if (laser.explode_time != 0) return
	context.beginPath()
	context.arc(laser.x, laser.y, 1.8, 0, 2 * pi)
	context.fillStyle = "white"
	context.fill()
})

const draw_text = () => {
	context.textAlign = "center"
	context.textBaseline = "middle"
	context.fillStyle = `rgba(255, 255, 255, ${text_alpha})`
	context.font = `small-caps 40px Emulogic`
	if (text_alpha > 0) {
		context.fillText(text_content, canvas.width / 2, canvas.height * 0.75)
		text_alpha -= 0.008
	} else {
		context.beginPath()
	}
}

const thrust_ship = () => {
	const { x, y, r, a } = ship

	ship.thrust.x += (cos(a) * 0.083)
	ship.thrust.y -= (sin(a) * 0.083)
	fxThrust.play()

	flicker++
	flicker > 4 && (flicker = 0)

	if (ship.explode_time <= 0 && ship.blink_num % 2 == 0) {
		context.beginPath()
		context.moveTo(
			x - r * (2 / 3 * cos(a) + 0.5 * sin(a)),
			y + r * (2 / 3 * sin(a) - 0.5 * cos(a))
		)
		context.lineTo(
			x - r * 5 / 3 * cos(a),
			y + r * 5 / 3 * sin(a)
		)
		context.lineTo(
			x - r * (2 / 3 * cos(a) - 0.5 * sin(a)),
			y + r * (2 / 3 * sin(a) + 0.5 * cos(a))
		)
		context.closePath()
		context.strokeStyle = "white"
		flicker > 2 && context.stroke()
	}
}

const brake_ship = () => {
	const friction = 0.006
	ship.thrust.x -= (ship.thrust.x * friction)
	ship.thrust.y -= (ship.thrust.y * friction)
	fxThrust.stop()
}

const break_asteroids = () => asteroids_list.forEach((asteroid, index) => {
	ship.lasers.forEach((laser) => {
		if (laser.explode_time == 0 && distance(asteroid.x, asteroid.y, laser.x, laser.y) < asteroid.r) {
			destroy_asteroid(asteroid, index)
			laser.explode_time = 6
		}
	})
})

const ship_crash = () => {
	asteroids_list.forEach((asteroid, index) => {
		if (distance(ship.x, ship.y, asteroid.x, asteroid.y) < ship.r + asteroid.r) {
			destroy_asteroid(asteroid, index)
			ship.explode_time = 20
			ship.can_shoot = false
			fxExplode.play()
		}
	})
}

const move_lasers = () => ship.lasers.forEach((laser, index) => {
	laser.dist > (canvas.width * 0.6) && ship.lasers.splice(index, 1)

	if (laser.explode_time > 0) {
		laser.explode_time--
		laser.explode_time == 0 && ship.lasers.splice(index, 1)
	} else {
		laser.x += laser.xv
		laser.y += laser.yv
		laser.dist += Math.hypot(laser.xv, laser.yv)
	}

	laser.x < 0 && (laser.x = canvas.width)
	laser.x > canvas.width && (laser.x = 0)
	laser.y < 0 && (laser.y = canvas.height)
	laser.y > canvas.height && (laser.y = 0)
})

const move_asteroids = () => asteroids_list.forEach((asteroid) => {
	asteroid.x += asteroid.xv
	asteroid.y += asteroid.yv

	asteroid.x < -asteroid.r && (asteroid.x = canvas.width + asteroid.r)
	asteroid.x > canvas.width + asteroid.r && (asteroid.x = -asteroid.r)
	asteroid.y < -asteroid.r && (asteroid.y = canvas.height + asteroid.r)
	asteroid.y > canvas.height + asteroid.r && (asteroid.y = -asteroid.r)
})

const move_ship = () => {
	ship.is_thrusting && !ship.is_dead ? thrust_ship() : brake_ship()

	ship.x < 0 - ship.r && (ship.x = canvas.width + ship.r)
	ship.x > canvas.width + ship.r && (ship.x = 0 - ship.r)
	ship.y < 0 - ship.r && (ship.y = canvas.height + ship.r)
	ship.y > canvas.height + ship.r && (ship.y = 0 - ship.r)
}

const draw_hull = (x, y, a) => {
	const { r } = ship
	context.beginPath()
	context.moveTo(
		x + (4 / 3) * r * cos(a),
		y - (4 / 3) * r * sin(a)
	)
	context.lineTo(
		x - ((cos(a) * 2 / 3) + sin(a)) * r,
		y + ((sin(a) * 2 / 3) - cos(a)) * r
	)
	context.lineTo(
		x - ((cos(a) * 2 / 3) - sin(a)) * r,
		y + ((sin(a) * 2 / 3) + cos(a)) * r
	)
	context.closePath()
	context.strokeStyle = "white"
	context.stroke()
}

const draw_ship = () => {
	if (ship.explode_time > 0) {
		context.beginPath()
		context.arc(ship.x, ship.y, ship.r * 1.5, 0, pi * 2, false)
		context.fillStyle = "white"
		context.fill()
	} else {
		ship.blink_num % 2 == 0 && !ship.is_dead && draw_hull(ship.x, ship.y, ship.a)
		ship.blink_num > 0 && ship.blink_time--
		if (ship.blink_time == 0) {
			ship.blink_time = 6
			ship.blink_num--
		}
	}

	if (ship.explode_time > 0) {
		ship.explode_time--
		ship.explode_time == 0 && new_life()
	} else {
		ship.a += ship.rot
		ship.x += ship.thrust.x / 2
		ship.y += ship.thrust.y / 2

		!ship.is_dead && ship.blink_num == 0 && ship_crash()
	}

	debug_collisions && draw_collision(ship.x, ship.y, ship.r)
	debug_dot && draw_dot()
}

const draw_lives = () => to_array(game_lives).forEach((v, i) => draw_hull((i * 36) + 30, 30, pi / 2))

setInterval(() => {
	game_lives ?? new_game()
	ship.is_dead && text_alpha <= 0 && new_game()
	!asteroids_list.length && new_level()

	draw_space()

	draw_lives()
	draw_high_score()
	draw_score()

	draw_text()

	move_ship()
	draw_ship()

	move_lasers()
	draw_lasers()

	move_asteroids()
	draw_asteroids()
	break_asteroids()
}, 16)