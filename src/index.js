import { fxExplode, fxHit, fxLaser, fxThrust } from "./sounds"

export const canvas = document.getElementById("game_canvas")
export const context = canvas.getContext("2d")

const pi = Math.PI
const to_radians = (num) => (num * pi) / 180
const distance = (x1, y1, x2, y2) => Math.sqrt(((x2 - x1) ** 2) + ((y2 - y1) ** 2))

const fps = 60
const friction = 0.7 						// 0 - 1 range
const starting_lives = 3

const laser_max_distance = 0.6 				// max distance laser can travel as fraction of screen width
const laser_max_amount = 10 				// maximum number of lasers on screen at once
const laser_speed = 1000 						// speed of lasers in pixels per second
const laser_explode_duration = 0.1 				// duration of the lasers' explosion in seconds

const asteroids = []
const asteroid_small_points = 100
const asteroid_medium_points = 50
const asteroid_large_points = 20
const asteroid_starting_amount = 3
const asteroid_starting_size = 100 			// measured in pixels
const asteroid_max_initial_velocity = 50 	// measured in pixels per second
const asteroid_jaggedness = 0.4 			// min: 0.0, max: 1.0
const asteroid_vertices = 10 				// average number of vertices on each asteroid

const ship_blink_duration = 0.1 			// measured in seconds (a single blink during ship's invisibility)
const ship_invisible_duration = 3 			// measured in seconds
const ship_explosion_duration = 0.3 		// measured in seconds
const ship_angle = 90						// measured in degrees
const ship_turn_speed = 270 				// measured in degrees per second
const ship_thrust = 5 						// measured in pixels per second squared
const ship_size = 30 						// measured in pixels

const text_fade_time = 2.5 					// text fade time in seconds
const text_size = 40 						// text font height in pixels

const save_key_score = "highscore" 			// save key for local storage of high score

const debug_collisions = false 				// show or hide collisions
const debug_dot = false 					// show or hide ship axis

let game_score = 0
let high_score = localStorage.getItem(save_key_score) ?? 0

let game_level = 0
let game_lives = starting_lives

let text = ''
let text_alpha = 0

const default_ship = () => {
	return {
		x: canvas.width / 2,
		y: canvas.height / 2,
		a: to_radians(ship_angle),
		r: ship_size / 2,
		blink_num: Math.ceil(ship_invisible_duration / ship_blink_duration),
		blink_time: Math.ceil(ship_blink_duration * fps),
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

let ship = default_ship()

document.addEventListener("keydown", (event) => {
	if (ship.is_dead) return
	event.code == "ArrowUp" && (ship.is_thrusting = true)
	event.code == "ArrowRight" && (ship.rot = -to_radians(ship_turn_speed) / fps)
	event.code == "ArrowLeft" && (ship.rot = to_radians(ship_turn_speed) / fps)
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
	const level_multiplier = 1 + (game_level / 10)
	const offsets = []
	const vertices = Math.floor(Math.random() * (asteroid_vertices + 1) + asteroid_vertices / 2)

	// populate offsets
	Array(vertices).fill(0).forEach(() => offsets.push((Math.random() * asteroid_jaggedness * 2) - asteroid_jaggedness + 1))

	return {
		x: x_coord,
		y: y_coord,
		r: radius,
		a: Math.random() * pi * 2, // in radians
		xv: Math.random() * asteroid_max_initial_velocity * level_multiplier * (Math.random() < 0.5 ? 1 : -1) / fps,
		yv: Math.random() * asteroid_max_initial_velocity * level_multiplier * (Math.random() < 0.5 ? 1 : -1) / fps,
		offs: offsets,
		vert: vertices
	}
}

const new_level = () => {
	text = `Level ${game_level + 1}`
	text_alpha = 1.0
	asteroids.length = 0
	Array(asteroid_starting_amount + game_level).fill(0).forEach(() => {
		let x, y
		do {
			x = Math.floor(Math.random() * canvas.width)
			y = Math.floor(Math.random() * canvas.height)
		} while (distance(ship.x, ship.y, x, y) < asteroid_starting_size * 2 + ship.r)
		asteroids.push(new_asteroid(x, y, Math.ceil(asteroid_starting_size / 2)))
	})
}

const new_game = () => {
	game_level = 0
	game_score = 0
	game_lives = starting_lives
	ship = default_ship()
	new_level()
}

new_game()

const destroy_asteroid = (index) => {
	if (asteroids[index].r == Math.ceil(asteroid_starting_size / 2)) { // large asteroid
		asteroids.push(new_asteroid(asteroids[index].x, asteroids[index].y, Math.ceil(asteroid_starting_size / 4)))
		asteroids.push(new_asteroid(asteroids[index].x, asteroids[index].y, Math.ceil(asteroid_starting_size / 4)))
		game_score += asteroid_large_points
	} else if (asteroids[index].r == Math.ceil(asteroid_starting_size / 4)) { // medium asteroid
		asteroids.push(new_asteroid(asteroids[index].x, asteroids[index].y, Math.ceil(asteroid_starting_size / 8)))
		asteroids.push(new_asteroid(asteroids[index].x, asteroids[index].y, Math.ceil(asteroid_starting_size / 8)))
		game_score += asteroid_medium_points
	} else {
		game_score += asteroid_small_points
	}

	if (game_score > high_score) {
		high_score = game_score
		localStorage.setItem(save_key_score, high_score)
	}

	// destroy the asteroid
	asteroids.splice(index, 1)
	fxHit.play()

	if (asteroids.length) return
	game_level++
	new_level()
}

const draw = (width, color, path) => {
	context.strokeStyle = color
	context.lineWidth = width
	context.beginPath()
	path()
	closePath()
	context.stroke()
}

function draw_ship(x, y, a, color = "white") {
	context.strokeStyle = color
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

function shoot_laser() {
	if (ship.can_shoot && ship.lasers.length < laser_max_amount) {
		ship.lasers.push({ // from the nose of the ship
			x: ship.x + 4 / 3 * ship.r * Math.cos(ship.a),
			y: ship.y - 4 / 3 * ship.r * Math.sin(ship.a),
			xv: laser_speed * Math.cos(ship.a) / fps,
			yv: -laser_speed * Math.sin(ship.a) / fps,
			dist: 0,
			explode_time: 0
		})
		fxLaser.play()
	}
	ship.can_shoot = false
}

setInterval(() => {
	context.fillStyle = "black"
	context.fillRect(0, 0, canvas.width, canvas.height)

	const blink_on = ship.blink_num % 2 == 0
	const exploding = ship.explode_time > 0

	if (debug_collisions) {
		context.strokeStyle = "lime"
		context.beginPath()
		context.arc(ship.x, ship.y, ship.r, 0, pi * 2, false)
		context.stroke()
	}

	if (debug_dot) {
		context.fillStyle = "red"
		context.fillRect(ship.x - 1, ship.y - 1, 2, 2)
	}

	// draw score
	context.textAlign = "right"
	context.textBaseline = "middle"
	context.fillStyle = "white"
	context.font = (text_size / 2) + "px Emulogic"
	context.fillText(game_score, canvas.width - ship_size / 2, ship_size)

	// draw high score
	context.textAlign = "center"
	context.textBaseline = "middle"
	context.fillStyle = "white"
	context.font = (text_size / 2) + "px Emulogic"
	context.fillText("HIGH SCORE", canvas.width / 2, 30)
	context.fillText(high_score, canvas.width / 2, 60)

	const i_frames = () => {
		blink_on && !ship.is_dead && draw_ship(ship.x, ship.y, ship.a)
		ship.blink_num > 0 && ship.blink_time--
		if (ship.blink_time == 0) {
			ship.blink_time = Math.ceil(ship_blink_duration * fps)
			ship.blink_num--
		}
	}

	const explode = () => {
		// draw explosion
		const draw_circle = (color, radius) => {
			context.fillStyle = color
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

	exploding ? explode() : i_frames()

	// draw asteroids
	asteroids.forEach((asteroid) => {
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

		// show asteroid's collision circle
		if (debug_collisions) {
			context.strokeStyle = "lime"
			context.beginPath()
			context.arc(asteroid.x, asteroid.y, asteroid.r, 0, pi * 2, false)
			context.stroke()
		}
	})

	// thrust the ship
	if (ship.is_thrusting && !ship.is_dead) {
		ship.thrust.x += ship_thrust * Math.cos(ship.a) / fps
		ship.thrust.y -= ship_thrust * Math.sin(ship.a) / fps
		fxThrust.play()

		// draw the thruster
		if (!exploding && blink_on) {
			context.fillStyle = "red"
			context.strokeStyle = "yellow"
			context.lineWidth = ship_size / 10
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
			context.fill()
			context.stroke()
		}
	} else {
		// apply friction (slow the ship down when not is_thrusting)
		ship.thrust.x -= friction * ship.thrust.x / fps
		ship.thrust.y -= friction * ship.thrust.y / fps
		fxThrust.stop()
	}

	// draw the lasers
	for (let i = 0; i < ship.lasers.length; i++) {
		if (ship.lasers[i].explode_time == 0) {
			context.fillStyle = "salmon"
			context.beginPath()
			context.arc(ship.lasers[i].x, ship.lasers[i].y, ship_size / 15, 0, pi * 2, false)
			context.fill()
		} else {
			// draw the eplosion
			context.fillStyle = "orangered"
			context.beginPath()
			context.arc(ship.lasers[i].x, ship.lasers[i].y, ship.r * 0.75, 0, pi * 2, false)
			context.fill()
			context.fillStyle = "salmon"
			context.beginPath()
			context.arc(ship.lasers[i].x, ship.lasers[i].y, ship.r * 0.5, 0, pi * 2, false)
			context.fill()
			context.fillStyle = "pink"
			context.beginPath()
			context.arc(ship.lasers[i].x, ship.lasers[i].y, ship.r * 0.25, 0, pi * 2, false)
			context.fill()
		}
	}

	// draw the game text
	if (text_alpha > 0) {
		context.textAlign = "center"
		context.textBaseline = "middle"
		context.fillStyle = `rgba(255, 255, 255, ${text_alpha})`
		context.font = `small-caps ${text_size}px Emulogic`
		context.fillText(text, canvas.width / 2, canvas.height * 0.75)
		text_alpha -= (1.0 / text_fade_time / fps)
	}

	ship.is_dead && text_alpha <= 0 && new_game()

	// draw lives
	Array(game_lives).fill(0).forEach((value, index) =>
		draw_ship(
			((index * 1.2) + 1) * ship_size,
			ship_size,
			pi / 2,
			(index == (game_lives - 1) && exploding) ? "red" : "white"
		)
	)

	// detect laser hits on asteroids
	asteroids.forEach((asteroid, index) => {
		ship.lasers.forEach((laser) => {
			if (laser.explode_time == 0 && distance(asteroid.x, asteroid.y, laser.x, laser.y) < asteroid.r) {
				destroy_asteroid(index)
				laser.explode_time = Math.ceil(laser_explode_duration * fps)
			}
		})
	})

	// check for asteroid collisions (when not exploding)
	if (!exploding) {

		// only check when not blinking
		if (ship.blink_num == 0 && !ship.is_dead) {
			for (let i = 0; i < asteroids.length; i++) {
				if (distance(ship.x, ship.y, asteroids[i].x, asteroids[i].y) < ship.r + asteroids[i].r) {
					ship.explode_time = Math.ceil(ship_explosion_duration * fps)
					fxExplode.play()
					destroy_asteroid(i)
					break
				}
			}
		}

		// rotate the ship
		ship.a += ship.rot

		// move the ship
		ship.x += ship.thrust.x
		ship.y += ship.thrust.y
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
	for (let i = ship.lasers.length - 1; i >= 0; i--) {

		// check distance travelled
		if (ship.lasers[i].dist > laser_max_distance * canvas.width) {
			ship.lasers.splice(i, 1)
			continue
		}

		// handle the explosion
		if (ship.lasers[i].explode_time > 0) {
			ship.lasers[i].explode_time--

			// destroy the laser after the duration is up
			if (ship.lasers[i].explode_time == 0) {
				ship.lasers.splice(i, 1)
				continue
			}
		} else {
			// move the laser
			ship.lasers[i].x += ship.lasers[i].xv
			ship.lasers[i].y += ship.lasers[i].yv

			// calculate the distance travelled
			ship.lasers[i].dist += Math.sqrt(Math.pow(ship.lasers[i].xv, 2) + Math.pow(ship.lasers[i].yv, 2))
		}

		// handle edge of screen
		if (ship.lasers[i].x < 0) {
			ship.lasers[i].x = canvas.width
		} else if (ship.lasers[i].x > canvas.width) {
			ship.lasers[i].x = 0
		}
		if (ship.lasers[i].y < 0) {
			ship.lasers[i].y = canvas.height
		} else if (ship.lasers[i].y > canvas.height) {
			ship.lasers[i].y = 0
		}
	}

	// move asteroids and handle screen wrap
	asteroids.forEach((asteroid) => {
		asteroid.x += asteroid.xv
		asteroid.y += asteroid.yv

		if (asteroid.x < -asteroid.r) asteroid.x = canvas.width + asteroid.r
		if (asteroid.x > canvas.width + asteroid.r) asteroid.x = -asteroid.r

		if (asteroid.y < -asteroid.r) asteroid.y = canvas.height + asteroid.r
		if (asteroid.y > canvas.height + asteroid.r) asteroid.y = -asteroid.r
	})
}, 1000 / fps)