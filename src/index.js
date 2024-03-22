import { fxExplode, fxHit, fxLaser, fxThrust } from "./sounds"

const canvas = document.getElementById("game_canvas")
const context = canvas.getContext("2d")

const pi = Math.PI
const to_radians = (num) => (num * pi) / 180
const distance = (x1, y1, x2, y2) => Math.sqrt(((x2 - x1) ** 2) + ((y2 - y1) ** 2))

const fps = 60
const friction = 0.7
const starting_lives = 3
const ship_size = 30
const laser_speed = 15

const debug_collisions = false
const debug_dot = false

const save_key_score = "highscore"
const high_score = () => localStorage.getItem(save_key_score) ?? 0
const set_high_score = (value) => localStorage.setItem(save_key_score, value)

let ship
let text
let text_alpha = 0
let game_score
let game_level
let game_lives
let flicker = 0

const asteroids_list = []
const asteroids = {
	vertices: 10,
	jaggedness: 0.4,
	initial: {
		amount: 3,
		size: 100,
		max_velocity: 50
	},
	points: {
		large: 20,
		medium: 50,
		small: 100
	}
}

const default_ship = () => {
	return {
		x: canvas.width / 2,
		y: canvas.height / 2,
		a: to_radians(90),
		r: ship_size / 2,
		blink_num: 15,
		blink_time: 6,
		can_shoot: true,
		is_dead: false,
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
	event.code == "ArrowRight" && (ship.rot = -to_radians(270) / fps)
	event.code == "ArrowLeft" && (ship.rot = to_radians(270) / fps)
	event.code == "Space" && shoot_laser()
})

document.addEventListener("keyup", (event) => {
	if (ship.is_dead) return
	event.code == "ArrowUp" && (ship.is_thrusting = false)
	event.code == "ArrowRight" && (ship.rot = 0)
	event.code == "ArrowLeft" && (ship.rot = 0)
	event.code == "Space" && (ship.can_shoot = true)
})

const new_asteroid = (x_coord, y_coord, radius) => {
	const level_multiplier = 1 + (game_level * 0.1)
	const vertices = Math.floor(Math.random() * (asteroids.vertices + 1) + asteroids.vertices / 2)
	return {
		x: x_coord,
		y: y_coord,
		r: radius,
		a: Math.random() * pi * 2, // in radians
		xv: Math.random() * asteroids.initial.max_velocity * level_multiplier * (Math.random() < 0.5 ? 1 : -1) / fps,
		yv: Math.random() * asteroids.initial.max_velocity * level_multiplier * (Math.random() < 0.5 ? 1 : -1) / fps,
		offs: Array(vertices).fill(0).map(() => (Math.random() * asteroids.jaggedness * 2) - asteroids.jaggedness + 1),
		vert: vertices
	}
}

const new_level = () => {
	text = `Level ${game_level}`
	text_alpha = 1.0
	asteroids_list.length = 0
	Array(asteroids.initial.amount + game_level).fill(0).forEach(() => {
		let x, y
		do {
			x = Math.floor(Math.random() * canvas.width)
			y = Math.floor(Math.random() * canvas.height)
		} while (distance(ship.x, ship.y, x, y) < asteroids.initial.size * 2 + ship.r)
		asteroids_list.push(new_asteroid(x, y, Math.ceil(asteroids.initial.size / 2)))
	})
}

const new_game = () => {
	game_level = 1
	game_score = 0
	game_lives = starting_lives
	ship = default_ship()
	new_level()
}

const destroy_asteroid = (asteroid, index) => {
	if (asteroid.r == Math.ceil(asteroids.initial.size / 2)) { // large asteroid
		asteroids_list.push(new_asteroid(asteroid.x, asteroid.y, Math.ceil(asteroids.initial.size / 4)))
		asteroids_list.push(new_asteroid(asteroid.x, asteroid.y, Math.ceil(asteroids.initial.size / 4)))
		game_score += asteroids.points.large
	} else if (asteroid.r == Math.ceil(asteroids.initial.size / 4)) { // medium asteroid
		asteroids_list.push(new_asteroid(asteroid.x, asteroid.y, Math.ceil(asteroids.initial.size / 8)))
		asteroids_list.push(new_asteroid(asteroid.x, asteroid.y, Math.ceil(asteroids.initial.size / 8)))
		game_score += asteroids.points.medium
	} else {
		game_score += asteroids.points.small
	}

	game_score > high_score() && set_high_score(game_score)

	asteroids_list.splice(index, 1)
	fxHit.play()

	if (asteroids_list.length) return
	game_level++
	new_level()
}

const draw_ship = (x, y, a) => {
	context.strokeStyle = "white"
	context.lineWidth = ship_size / 20
	context.beginPath()
	context.moveTo( // nose of the ship
		x + 4 / 3 * ship.r * Math.cos(a),
		y - 4 / 3 * ship.r * Math.sin(a)
	)
	context.lineTo( // rear left
		x - ship.r * (2 / 3 * Math.cos(a) + Math.sin(a)),
		y + ship.r * (2 / 3 * Math.sin(a) - Math.cos(a))
	)
	context.lineTo( // rear right
		x - ship.r * (2 / 3 * Math.cos(a) - Math.sin(a)),
		y + ship.r * (2 / 3 * Math.sin(a) + Math.cos(a))
	)
	context.closePath()
	context.stroke()
}

const shoot_laser = () => {
	if (ship.can_shoot && ship.lasers.length < 10) {
		ship.lasers.push({ // from the nose of the ship
			x: ship.x + 4 / 3 * ship.r * Math.cos(ship.a),
			y: ship.y - 4 / 3 * ship.r * Math.sin(ship.a),
			xv: laser_speed * Math.cos(ship.a),
			yv: -laser_speed * Math.sin(ship.a),
			dist: 0,
			explode_time: 0
		})
		fxLaser.play()
	}
	ship.can_shoot = false
}

const explode = () => {
	// draw explosion
	const draw_circle = (color, radius) => {
		// context.fillStyle = color
		context.beginPath()
		context.arc(ship.x, ship.y, ship.r * radius, 0, pi * 2, false)
		context.fill()
	}
	draw_circle("darkred", 1.7)
	draw_circle("red", 1.4)
	draw_circle("orange", 1.1)
	draw_circle("yellow", 0.8)
	draw_circle("white", 0.5)
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

setInterval(() => {
	game_lives == null && new_game()

	const blink_on = ship.blink_num % 2 == 0
	const exploding = ship.explode_time > 0

	draw_space()

	debug_collisions && draw_collision(ship.x, ship.y, ship.r)
	debug_dot && draw_dot()

	// draw score
	context.textAlign = "right"
	context.textBaseline = "middle"
	context.fillStyle = "white"
	context.font = "20px Emulogic"
	context.fillText(game_score, canvas.width - ship_size / 2, ship_size)

	// draw high score
	context.textAlign = "center"
	context.textBaseline = "middle"
	context.fillStyle = "white"
	context.font = "20px Emulogic"
	context.fillText("HIGH SCORE", canvas.width / 2, 30)
	context.fillText(high_score(), canvas.width / 2, 60)

	const i_frames = () => {
		blink_on && !ship.is_dead && draw_ship(ship.x, ship.y, ship.a)
		ship.blink_num > 0 && ship.blink_time--
		if (ship.blink_time == 0) {
			ship.blink_time = 6
			ship.blink_num--
		}
	}

	exploding ? explode() : i_frames()

	// draw asteroids
	asteroids_list.forEach((asteroid) => {
		context.strokeStyle = "slategrey"
		context.lineWidth = ship_size / 20

		// draw the path
		context.beginPath()
		context.moveTo(
			asteroid.x + asteroid.r * asteroid.offs[0] * Math.cos(asteroid.a),
			asteroid.y + asteroid.r * asteroid.offs[0] * Math.sin(asteroid.a)
		)

		// draw the polygon
		asteroid.offs.forEach((offset, index) => {
			context.lineTo(
				asteroid.x + asteroid.r * offset * Math.cos(asteroid.a + index * pi * 2 / asteroid.vert),
				asteroid.y + asteroid.r * offset * Math.sin(asteroid.a + index * pi * 2 / asteroid.vert)
			)
		})
		context.closePath()
		context.stroke()

		debug_collisions && draw_collision(asteroid.x, asteroid.y, asteroid.r)
	})

	// thrust the ship
	if (ship.is_thrusting && !ship.is_dead) {
		ship.thrust.x += Math.cos(ship.a) * 5 / fps
		ship.thrust.y -= Math.sin(ship.a) * 5 / fps
		fxThrust.play()

		// draw the thruster
		if (!exploding && blink_on) {
			context.strokeStyle = "white"
			context.beginPath()
			context.moveTo( // rear left
				ship.x - ship.r * (2 / 3 * Math.cos(ship.a) + 0.5 * Math.sin(ship.a)),
				ship.y + ship.r * (2 / 3 * Math.sin(ship.a) - 0.5 * Math.cos(ship.a))
			)
			context.lineTo( // rear centre (behind the ship)
				ship.x - ship.r * 5 / 3 * Math.cos(ship.a),
				ship.y + ship.r * 5 / 3 * Math.sin(ship.a)
			)
			context.lineTo( // rear right
				ship.x - ship.r * (2 / 3 * Math.cos(ship.a) - 0.5 * Math.sin(ship.a)),
				ship.y + ship.r * (2 / 3 * Math.sin(ship.a) + 0.5 * Math.cos(ship.a))
			)
			context.closePath()
			flicker > 2 && context.stroke()
		}

		flicker++
		flicker > 4 && (flicker = 0)
	} else {
		// apply friction (slow the ship down when not is_thrusting)
		ship.thrust.x -= friction * ship.thrust.x / fps
		ship.thrust.y -= friction * ship.thrust.y / fps
		fxThrust.stop()
	}

	// draw the lasers
	ship.lasers.forEach((laser) => {
		if (laser.explode_time == 0) {
			context.beginPath()
			context.arc(laser.x, laser.y, ship_size / 15, 0, pi * 2, false)
			context.fill()
		}
	})

	// draw the game text
	if (text_alpha > 0) {
		context.textAlign = "center"
		context.textBaseline = "middle"
		context.fillStyle = `rgba(255, 255, 255, ${text_alpha})`
		context.font = `small-caps 40px Emulogic`
		context.fillText(text, canvas.width / 2, canvas.height * 0.75)
		text_alpha -= 0.008
	}

	ship.is_dead && text_alpha <= 0 && new_game()

	// draw lives
	Array(game_lives).fill(0).forEach((value, index) =>
		draw_ship(
			((index * 1.2) + 1) * ship_size,
			ship_size,
			pi / 2
		)
	)

	// detect laser hits on asteroids
	asteroids_list.forEach((asteroid, index) => {
		ship.lasers.forEach((laser) => {
			if (laser.explode_time == 0 && distance(asteroid.x, asteroid.y, laser.x, laser.y) < asteroid.r) {
				destroy_asteroid(asteroid, index)
				laser.explode_time = 6
			}
		})
	})

	if (!exploding) {
		ship.a += ship.rot
		ship.x += ship.thrust.x / 2
		ship.y += ship.thrust.y / 2

		!ship.is_dead &&
			ship.blink_num == 0 &&
			asteroids_list.forEach((asteroid, index) => {
				if (distance(ship.x, ship.y, asteroid.x, asteroid.y) < ship.r + asteroid.r) {
					destroy_asteroid(asteroid, index)
					ship.explode_time = 20
					fxExplode.play()
				}
			})
	} else {
		// reduce the explode time
		ship.explode_time--

		// reset the ship after the explosion has finished
		if (ship.explode_time == 0) {
			game_lives--
			ship = default_ship()

			if (game_lives > 0) return
			ship.is_dead = true
			text = "Game Over"
			text_alpha = 1.0
		}
	}

	// handle edge of screen
	if (ship.x < 0 - ship.r) {
		ship.x = canvas.width + ship.r
	} else if (ship.x > canvas.width + ship.r) {
		ship.x = 0 - ship.r
	}
	if (ship.y < 0 - ship.r) {
		ship.y = canvas.height + ship.r
	} else if (ship.y > canvas.height + ship.r) {
		ship.y = 0 - ship.r
	}

	// move the lasers
	ship.lasers.forEach((laser, index) => {
		laser.dist > canvas.width * 0.6 && ship.lasers.splice(index, 1)

		// handle the explosion
		if (laser.explode_time > 0) {
			laser.explode_time--
			laser.explode_time == 0 && ship.lasers.splice(index, 1)
		}
		else {
			// move the laser
			laser.x += laser.xv
			laser.y += laser.yv

			// calculate the distance travelled
			laser.dist += Math.sqrt(Math.pow(laser.xv, 2) + Math.pow(laser.yv, 2))
		}

		// handle edge of screen
		if (laser.x < 0) {
			laser.x = canvas.width
		} else if (laser.x > canvas.width) {
			laser.x = 0
		}
		if (laser.y < 0) {
			laser.y = canvas.height
		} else if (laser.y > canvas.height) {
			laser.y = 0
		}
	})

	// move asteroids and handle screen wrap
	asteroids_list.forEach((asteroid) => {
		asteroid.x += asteroid.xv
		asteroid.y += asteroid.yv

		if (asteroid.x < -asteroid.r) asteroid.x = canvas.width + asteroid.r
		if (asteroid.x > canvas.width + asteroid.r) asteroid.x = -asteroid.r

		if (asteroid.y < -asteroid.r) asteroid.y = canvas.height + asteroid.r
		if (asteroid.y > canvas.height + asteroid.r) asteroid.y = -asteroid.r
	})
}, 1000 / fps)