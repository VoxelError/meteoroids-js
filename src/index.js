import "./styles.scss"
import { fxExplode, fxHit, fxLaser, fxThrust } from "./sounds"
import { floor, pi, rng, sin, cos, tau, phi, degrees, min } from "./util/math"
import { draw_arc, draw_text, stroke_polygon } from "./util/draws"

let keybinds = {
	ArrowUp: false,
	ArrowDown: false,
	ArrowRight: false,
	ArrowLeft: false,
	Space: false,
}

const key_listen = (key) => {
	document.addEventListener("keydown", ({ code }) => code == key && (keybinds[key] = true))
	document.addEventListener("keyup", ({ code }) => code == key && (keybinds[key] = false))
}

key_listen("ArrowUp")
key_listen("ArrowDown")
key_listen("ArrowRight")
key_listen("ArrowLeft")
key_listen("Space")

const canvas = document.createElement("canvas")
canvas.width = window.innerWidth
canvas.height = window.innerHeight
document.body.append(canvas)

const context = canvas.getContext("2d")

const distance = (x1, y1, x2, y2) => Math.sqrt(((x2 - x1) ** 2) + ((y2 - y1) ** 2))
const to_array = (length, fill = 0) => Array(length).fill(fill)

const high_score = () => localStorage.getItem("highscore") ?? 0
const set_high_score = (value) => localStorage.setItem("highscore", value)

const debug_collisions = false

const asteroids_list = []

class Ship {
	x = canvas.width / 2
	y = canvas.height / 2
	radius = 15
	a = phi

	blink_num = 6
	blink_time = 6

	cooldown = 0
	is_dead = false
	has_crashed = false
	explode_time = 0
	lasers = []
	rot = 0
	is_thrusting = false
	thrust = { x: 0, y: 0 }

	turn_speed = tau / 120
	acceleration = 0.06
	friction = 0.994
}

class Laser {
	static speed = 8

	constructor() {
		this.x = ship.x + (4 / 3) * ship.radius * cos(ship.a)
		this.y = ship.y - (4 / 3) * ship.radius * sin(ship.a)
		this.xv = Laser.speed * cos(ship.a)
		this.yv = -Laser.speed * sin(ship.a)
		this.dist = 0
		this.explode_time = 0
	}
}

let ship
let text_content
let title_alpha = 0
let game_score
let game_level
let game_lives
let flicker = 0

const new_level = () => {
	asteroids_list.length = 0
	game_level++
	text_content = `Level ${game_level}`
	title_alpha = 1.0
	to_array(2 + game_level).forEach(() => {
		let x, y
		do {
			x = floor(rng(canvas.width))
			y = floor(rng(canvas.height))
		} while (distance(x, y, ship.x, ship.y) < ship.radius + 200)
		new_asteroid(x, y, 50)
	})
}

const new_game = () => {
	game_level = 0
	game_score = 0
	game_lives = 3
	ship = new Ship()
	new_level()
}

const new_asteroid = (x, y, r) => {
	const angle = rng() * pi * 2
	const vertices = floor(rng(11, 5))
	const offsets = to_array(vertices).map(() => rng(0.8, 0.6))
	const velocity = () => {
		const roll = rng(0.1, 0.1)
		const flip = rng() < 0.5 ? -1 : 1
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

	debug_collisions && draw_arc(context, {
		center: [x, y],
		radius: r,
		stroke: { style: "red" }
	})
})

const draw_lasers = () => ship.lasers.forEach((laser) => {
	if (laser.explode_time != 0) return
	context.beginPath()
	context.arc(laser.x, laser.y, 1.8, 0, 2 * pi)
	context.fillStyle = "white"
	context.fill()
})

const break_asteroids = () => asteroids_list.forEach((asteroid, index) => {
	ship.lasers.forEach((laser) => {
		if (laser.explode_time == 0 && distance(asteroid.x, asteroid.y, laser.x, laser.y) < asteroid.r) {
			destroy_asteroid(asteroid, index)
			laser.explode_time = 6
		}
	})
})

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
	if (ship.is_dead) return

	keybinds.ArrowRight && (ship.a -= ship.turn_speed)
	keybinds.ArrowLeft && (ship.a += ship.turn_speed)

	if (keybinds.ArrowUp) {
		ship.thrust.x += cos(ship.a) * ship.acceleration
		ship.thrust.y -= sin(ship.a) * ship.acceleration
		fxThrust.play()
	} else {
		ship.thrust.x *= ship.friction
		ship.thrust.y *= ship.friction
		fxThrust.stop()
	}

	if (keybinds.ArrowDown) {
		ship.thrust.x = 0
		ship.thrust.y = 0
	}

	ship.x += ship.thrust.x
	ship.y += ship.thrust.y

	if (ship.x < 0 - ship.radius) { ship.x += canvas.width + ship.radius }
	if (ship.x > canvas.width + ship.radius) { ship.x -= canvas.width + ship.radius }

	if (ship.y < 0 - ship.radius) { ship.y += canvas.height + ship.radius }
	if (ship.y > canvas.height + ship.radius) { ship.y -= canvas.height + ship.radius }

	if (ship.explode_time > 0) return

	if (keybinds.Space) {
		ship.lasers.push(new Laser())

		keybinds.Space = false
		fxLaser.play()
	}
}

const draw_hull = (x, y, a) => {
	const calc_point = (length, offset = 0) => [
		x + (length * ship.radius * cos(a + offset)),
		y - (length * ship.radius * sin(a + offset)),
	]

	stroke_polygon(context, {
		points: [
			calc_point(1.35),
			calc_point(1.2, tau * 0.36),
			calc_point(1.2, -tau * 0.36),
		]
	})
}

const draw_ship = () => {
	if (ship.explode_time > 0) {
		draw_arc(context, {
			center: [ship.x, ship.y],
			radius: ship.radius * 1.5,
			fill: {},
		})
	}

	ship.blink_num % 2 == 0 && !ship.is_dead && draw_hull(ship.x, ship.y, ship.a)
	ship.blink_num > 0 && ship.blink_time--
	if (ship.blink_time == 0) {
		ship.blink_time = 6
		ship.blink_num--
	}

	if (ship.explode_time > 0) {
		ship.explode_time--
		if (ship.explode_time == 0) {
			game_lives--
			ship = new Ship()
			if (game_lives <= 0) {
				ship.is_dead = true
				text_content = "Game Over"
				title_alpha = 1.0
			}
		}
	} else {
		!ship.is_dead && ship.blink_num == 0 && asteroids_list.forEach((asteroid, index) => {
			if (distance(ship.x, ship.y, asteroid.x, asteroid.y) < ship.radius + asteroid.r) {
				destroy_asteroid(asteroid, index)
				ship.explode_time = 40
				// ship.cooldown = 40
				fxExplode.play()
			}
		})
	}

	flicker++
	flicker > 8 && (flicker = 0)

	if (keybinds.ArrowUp && ship.explode_time <= 0 && ship.blink_num % 2 == 0) {
		context.beginPath()
		context.moveTo(
			ship.x - ship.radius * (2 / 3 * cos(ship.a) + 0.5 * sin(ship.a)),
			ship.y + ship.radius * (2 / 3 * sin(ship.a) - 0.5 * cos(ship.a))
		)
		context.lineTo(
			ship.x - ship.radius * 5 / 3 * cos(ship.a),
			ship.y + ship.radius * 5 / 3 * sin(ship.a)
		)
		context.lineTo(
			ship.x - ship.radius * (2 / 3 * cos(ship.a) - 0.5 * sin(ship.a)),
			ship.y + ship.radius * (2 / 3 * sin(ship.a) + 0.5 * cos(ship.a))
		)
		context.strokeStyle = "white"
		flicker > 4 && context.stroke()
	}

	debug_collisions && draw_arc(context, {
		center: [ship.x, ship.y],
		radius: ship.r,
		stroke: { style: "red" }
	})
}

const draw_ui = () => {
	draw_text(context, {
		font: "20px Emulogic",
		align: "center",
		baseline: "middle",
		text: "HIGH SCORE",
		pos: [canvas.width / 2, 30],
		fill: {},
	})

	draw_text(context, {
		font: "20px Emulogic",
		align: "center",
		baseline: "middle",
		text: high_score(),
		pos: [canvas.width / 2, 60],
		fill: {},
	})

	draw_text(context, {
		font: "20px Emulogic",
		align: "right",
		baseline: "middle",
		text: game_score,
		pos: [canvas.width - 15, 30],
		fill: {},
	})

	if (title_alpha <= 0) return

	draw_text(context, {
		font: "small-caps 40px Emulogic",
		align: "center",
		baseline: "middle",
		text: text_content,
		pos: [canvas.width / 2, canvas.height * 0.75],
		fill: { alpha: title_alpha },
	})

	title_alpha -= 0.004
}

!function render() {
	context.reset()

	// context.translate(canvas.width / 2, canvas.height / 2)

	game_lives ?? new_game()
	ship.is_dead && title_alpha <= 0 && new_game()
	!asteroids_list.length && new_level()

	for (let i = 0; i < game_lives; i++) {
		draw_hull((i * 36) + 30, 30, phi)
	}

	draw_ui()

	move_ship()
	draw_ship()

	move_lasers()
	draw_lasers()

	move_asteroids()
	draw_asteroids()
	break_asteroids()

	requestAnimationFrame(render)
}()