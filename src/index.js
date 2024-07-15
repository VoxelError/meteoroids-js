import "./styles.scss"
import { fxExplode, fxHit, fxLaser, fxThrust } from "./sounds"
import { floor, pi, rng, sin, cos, tau, phi, degrees, min, abs, sign, hypot, atan2 } from "./util/math"
import { draw_arc, draw_text, stroke_polygon } from "./util/draws"
import { Ship } from "./ship"
import { key_listen, keybinds } from "./util/controls"
import { Asteroid } from "./asteroid"

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

let ship
let game_object
let text_content
let title_alpha = 0
let flicker = 0

class Game {
	dead_timer = 0
	over = false
	score = 0
	level = 0
	lives = 3
	asteroids = []

	new_level = () => {
		ship = new Ship()
		this.asteroids = []
		this.level++
		text_content = `Level ${this.level}`
		title_alpha = 1.0
		to_array(2 + this.level).forEach(() => {
			let x, y
			do {
				x = floor(rng(canvas.width, -canvas.width / 2))
				y = floor(rng(canvas.height, -canvas.height / 2))
			} while (distance(x, y, ship.x, ship.y) < ship.radius + 200)
			this.asteroids.push(new Asteroid(x, y, 3, this))
		})
	}
}

const new_game = () => {
	game_object = new Game()
	game_object.new_level()
}

const destroy_asteroid = (asteroid, index) => {
	const { x, y, r } = asteroid

	if (r == 50) {
		game_object.score += 20
		game_object.asteroids.push(new Asteroid(x, y, 2, game_object))
		game_object.asteroids.push(new Asteroid(x, y, 2, game_object))
	} else if (r == 25) {
		game_object.score += 50
		game_object.asteroids.push(new Asteroid(x, y, 1, game_object))
		game_object.asteroids.push(new Asteroid(x, y, 1, game_object))
	} else game_object.score += 100

	game_object.score > high_score() && set_high_score(game_object.score)

	game_object.asteroids.splice(index, 1)
	fxHit.play()
}

const draw_asteroids = () => game_object.asteroids.forEach((asteroid) => {
	const { x, y, r, a, vert } = asteroid
	const offsets = asteroid.offs
	const vertices = []
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
})

const break_asteroids = () => game_object.asteroids.forEach((asteroid, index) => {
	ship.lasers.forEach((laser) => {
		if (distance(asteroid.x, asteroid.y, laser.x, laser.y) < asteroid.r) {
			destroy_asteroid(asteroid, index)
			laser.delete = true
		}
	})
})

const move_asteroids = () => game_object.asteroids.forEach((asteroid) => {
	asteroid.x += asteroid.xv
	asteroid.y += asteroid.yv
	if (abs(asteroid.x) > canvas.width / 2 + asteroid.r) { asteroid.x *= -1 }
	if (abs(asteroid.y) > canvas.height / 2 + asteroid.r) { asteroid.y *= -1 }
})

const draw_hull = (x, y, a) => {
	const calc_point = (radius, theta = 0) => [
		x + (radius * ship.radius * cos(a + theta)),
		y - (radius * ship.radius * sin(a + theta)),
	]

	// stroke_polygon(context, {
	// 	points: [
	// 		calc_point(6, pi),
	// 		calc_point(4.2, tau / 8),
	// 		calc_point(2),
	// 		calc_point(4.2, -tau / 8),
	// 	],
	// 	close: true
	// })

	stroke_polygon(context, {
		points: [
			calc_point(2),
			calc_point(1, -5 * tau / 8),
			calc_point(1, pi),
			calc_point(1, 5 * tau / 8),
		],
		close: true
	})
}

const draw_ship = () => {
	if (game_object.over) return

	ship.blink_num > 0 && ship.blink_time--
	if (ship.blink_time == 0) {
		ship.blink_time = 6
		ship.blink_num--
	}

	if (ship.blink_num == 0) {
		game_object.asteroids.forEach((asteroid, index) => {
			if (distance(ship.x, ship.y, asteroid.x, asteroid.y) < ship.radius + asteroid.r) {
				destroy_asteroid(asteroid, index)
				ship.dead_timer++
			}
		})
	}

	ship.blink_num % 2 == 0 && draw_hull(ship.x, ship.y, ship.a)

	flicker++
	flicker %= 8

	if (keybinds.ArrowUp && ship.blink_num % 2 == 0) {
		flicker > 4 && stroke_polygon(context, {
			points: [
				[
					ship.x - ship.radius * (2 / 3 * cos(ship.a) + 0.5 * sin(ship.a)),
					ship.y + ship.radius * (2 / 3 * sin(ship.a) - 0.5 * cos(ship.a))
				],
				[
					ship.x - ship.radius * 5 / 3 * cos(ship.a),
					ship.y + ship.radius * 5 / 3 * sin(ship.a)
				],
				[
					ship.x - ship.radius * (2 / 3 * cos(ship.a) - 0.5 * sin(ship.a)),
					ship.y + ship.radius * (2 / 3 * sin(ship.a) + 0.5 * cos(ship.a))
				],
			]
		})
	}
}

const do_dead = () => {
	ship.dead_timer++

	if (ship.dead_timer > 40) {
		game_object.lives--

		if (game_object.lives < 1) {
			game_object.over = true
			text_content = "Game Over"
			title_alpha = 1.0
		} else {
			ship = new Ship()
		}
	}

	draw_arc(context, {
		center: [ship.x, ship.y],
		radius: ship.radius * 1.5,
		stroke: {},
	})
}

const draw_ui = () => {
	draw_text(context, {
		font: "20px Emulogic",
		align: "right",
		baseline: "middle",
		text: high_score(),
		pos: [canvas.width / 2 - 15, 30 - canvas.height / 2],
		fill: { style: "hsl(120, 50%, 75%)" },
	})

	draw_text(context, {
		font: "20px Emulogic",
		align: "right",
		baseline: "middle",
		text: game_object.score,
		pos: [canvas.width / 2 - 15, 60 - canvas.height / 2],
		fill: {},
	})

	for (let i = 0; i < game_object.lives; i++) {
		draw_hull(
			(i * 36) + 30 - canvas.width / 2,
			40 - canvas.height / 2,
			phi
		)
	}

	if (title_alpha > 0) {
		draw_text(context, {
			font: "small-caps 40px Emulogic",
			align: "center",
			baseline: "middle",
			text: text_content,
			pos: [0, canvas.height / 2 - 60],
			fill: { alpha: title_alpha },
		})

		title_alpha -= 0.004
	}
}

!function render() {
	context.reset()
	context.translate(canvas.width / 2, canvas.height / 2)

	game_object ?? new_game()
	game_object.over && title_alpha <= 0 && new_game()
	!game_object.asteroids.length && game_object.new_level()

	draw_ui()

	ship.controls(canvas, keybinds, game_object)
	ship.dead_timer > 0 ? do_dead() : draw_ship()

	ship.lasers.forEach((laser, i) => {
		laser.delete && ship.lasers.splice(i, 1)
		laser.update(canvas, context)
	})

	move_asteroids()
	draw_asteroids()
	break_asteroids()

	requestAnimationFrame(render)
}()