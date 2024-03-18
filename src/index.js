import { fxExplode, fxHit, fxLaser, fxThrust } from "./sounds"

const pi = Math.PI

const fps = 60
const friction = 0.7 						// 0 - 1 range
const starting_lives = 1

const laser_dist = 0.6 						// max distance laser can travel as fraction of screen width
const laser_cap = 10 						// maximum number of lasers on screen at once
const laser_spd = 1000 						// speed of lasers in pixels per second
const laser_explode_dur = 0.1 				// duration of the lasers' explosion in seconds

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
const ship_turn_speed = 270 				// measured in degrees per second
const ship_thrust = 5 						// measured in pixels per second squared
const ship_size = 30 						// measured in pixels

const show_bounding = false 				// show or hide collision bounding
const show_centre_dot = false 				// show or hide ship's centre dot

const text_fade_time = 2.5 					// text fade time in seconds
const text_size = 40 						// text font height in pixels

const save_key_score = "highscore" 			// save key for local storage of high score

export const canvas = document.getElementById("game_canvas")
export const context = canvas.getContext("2d")

const default_ship = () => {
	return {
		x: canvas.width / 2,
		y: canvas.height / 2,
		a: 90 / 180 * pi, 				// convert to radians
		r: ship_size / 2,
		blinkNum: Math.ceil(ship_invisible_duration / ship_blink_duration),
		blinkTime: Math.ceil(ship_blink_duration * fps),
		canShoot: true,
		dead: false,
		explodeTime: 0,
		lasers: [],
		rot: 0,
		thrusting: false,
		thrust: {
			x: 0,
			y: 0
		}
	}
}

let game_level = 0
let game_score = 0
let ship = default_ship()
let game_lives = starting_lives
let high_score = localStorage.getItem(save_key_score) ?? 0
let text = ''
let textAlpha = 0

document.addEventListener("keydown", (event) => {
	if (ship.dead) return
	event.code == "Space" && shootLaser()
	event.code == "ArrowLeft" && (ship.rot = ship_turn_speed / 180 * pi / fps)
	event.code == "ArrowUp" && (ship.thrusting = true)
	event.code == "ArrowRight" && (ship.rot = -ship_turn_speed / 180 * pi / fps)
})
document.addEventListener("keyup", (event) => {
	if (ship.dead) return
	event.code == "Space" && (ship.canShoot = true)
	event.code == "ArrowLeft" && (ship.rot = 0)
	event.code == "ArrowUp" && (ship.thrusting = false)
	event.code == "ArrowRight" && (ship.rot = 0)
})

const distance = (x1, y1, x2, y2) => Math.sqrt(((x2 - x1) ** 2) + ((y2 - y1) ** 2))

const newAsteroid = (x_coord, y_coord, radius) => {
	const level_multiplier = 1 + (game_level / 10)
	const roid = {
		x: x_coord,
		y: y_coord,
		xv: Math.random() * asteroid_max_initial_velocity * level_multiplier / fps * (Math.random() < 0.5 ? 1 : -1),
		yv: Math.random() * asteroid_max_initial_velocity * level_multiplier / fps * (Math.random() < 0.5 ? 1 : -1),
		a: Math.random() * pi * 2, // in radians
		r: radius,
		offs: [],
		vert: Math.floor(Math.random() * (asteroid_vertices + 1) + asteroid_vertices / 2)
	}

	// populate the offsets array
	for (let i = 0; i < roid.vert; i++) {
		roid.offs.push(Math.random() * asteroid_jaggedness * 2 + 1 - asteroid_jaggedness)
	}

	return roid
}

function newLevel() {
	text = "Level " + (game_level + 1)
	textAlpha = 1.0
	asteroids.length = 0

	for (let i = 0; i < asteroid_starting_amount + game_level; i++) {
		let x, y
		do {
			x = Math.floor(Math.random() * canvas.width)
			y = Math.floor(Math.random() * canvas.height)
		} while (distance(ship.x, ship.y, x, y) < asteroid_starting_size * 2 + ship.r)
		asteroids.push(newAsteroid(x, y, Math.ceil(asteroid_starting_size / 2)))
	}
}

newLevel()

const destroyAsteroid = (index) => {
	const x = asteroids[index].x
	const y = asteroids[index].y
	const r = asteroids[index].r

	// split the asteroid in two if necessary
	if (r == Math.ceil(asteroid_starting_size / 2)) { // large asteroid
		asteroids.push(newAsteroid(x, y, Math.ceil(asteroid_starting_size / 4)))
		asteroids.push(newAsteroid(x, y, Math.ceil(asteroid_starting_size / 4)))
		game_score += asteroid_large_points
	} else if (r == Math.ceil(asteroid_starting_size / 4)) { // medium asteroid
		asteroids.push(newAsteroid(x, y, Math.ceil(asteroid_starting_size / 8)))
		asteroids.push(newAsteroid(x, y, Math.ceil(asteroid_starting_size / 8)))
		game_score += asteroid_medium_points
	} else {
		game_score += asteroid_small_points
	}

	// check high score
	if (game_score > high_score) {
		high_score = game_score
		localStorage.setItem(save_key_score, high_score)
	}

	// destroy the asteroid
	asteroids.splice(index, 1)
	fxHit.play()

	// new level when no more asteroids
	if (!asteroids.length) {
		game_level++
		newLevel()
	}
}

function drawShip(x, y, a, colour = "white") {
	context.strokeStyle = colour
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

function gameOver() {
	ship.dead = true
	text = "Game Over"
	textAlpha = 1.0
}

function shootLaser() {
	// create the laser object
	if (ship.canShoot && ship.lasers.length < laser_cap) {
		ship.lasers.push({ // from the nose of the ship
			x: ship.x + 4 / 3 * ship.r * Math.cos(ship.a),
			y: ship.y - 4 / 3 * ship.r * Math.sin(ship.a),
			xv: laser_spd * Math.cos(ship.a) / fps,
			yv: -laser_spd * Math.sin(ship.a) / fps,
			dist: 0,
			explodeTime: 0
		})
		fxLaser.play()
	}

	// prevent further shooting
	ship.canShoot = false
}

function update() {
	const blinkOn = ship.blinkNum % 2 == 0
	const exploding = ship.explodeTime > 0

	// draw space
	context.fillStyle = "black"
	context.fillRect(0, 0, canvas.width, canvas.height)

	// draw the asteroids
	var a, r, x, y, offs, vert
	for (let i = 0; i < asteroids.length; i++) {
		context.strokeStyle = "slategrey"
		context.lineWidth = ship_size / 20

		// get the asteroid properties
		a = asteroids[i].a
		r = asteroids[i].r
		x = asteroids[i].x
		y = asteroids[i].y
		offs = asteroids[i].offs
		vert = asteroids[i].vert

		// draw the path
		context.beginPath()
		context.moveTo(
			x + r * offs[0] * Math.cos(a),
			y + r * offs[0] * Math.sin(a)
		)

		// draw the polygon
		for (var j = 1; j < vert; j++) {
			context.lineTo(
				x + r * offs[j] * Math.cos(a + j * pi * 2 / vert),
				y + r * offs[j] * Math.sin(a + j * pi * 2 / vert)
			)
		}
		context.closePath()
		context.stroke()

		// show asteroid's collision circle
		if (show_bounding) {
			context.strokeStyle = "lime"
			context.beginPath()
			context.arc(x, y, r, 0, pi * 2, false)
			context.stroke()
		}
	}

	// thrust the ship
	if (ship.thrusting && !ship.dead) {
		ship.thrust.x += ship_thrust * Math.cos(ship.a) / fps
		ship.thrust.y -= ship_thrust * Math.sin(ship.a) / fps
		fxThrust.play()

		// draw the thruster
		if (!exploding && blinkOn) {
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
		// apply friction (slow the ship down when not thrusting)
		ship.thrust.x -= friction * ship.thrust.x / fps
		ship.thrust.y -= friction * ship.thrust.y / fps
		fxThrust.stop()
	}

	// draw the triangular ship
	if (!exploding) {
		if (blinkOn && !ship.dead) {
			drawShip(ship.x, ship.y, ship.a)
		}

		// handle blinking
		if (ship.blinkNum > 0) {

			// reduce the blink time
			ship.blinkTime--

			// reduce the blink num
			if (ship.blinkTime == 0) {
				ship.blinkTime = Math.ceil(ship_blink_duration * fps)
				ship.blinkNum--
			}
		}
	} else {
		// draw the explosion (concentric circles of different colours)
		context.fillStyle = "darkred"
		context.beginPath()
		context.arc(ship.x, ship.y, ship.r * 1.7, 0, pi * 2, false)
		context.fill()
		context.fillStyle = "red"
		context.beginPath()
		context.arc(ship.x, ship.y, ship.r * 1.4, 0, pi * 2, false)
		context.fill()
		context.fillStyle = "orange"
		context.beginPath()
		context.arc(ship.x, ship.y, ship.r * 1.1, 0, pi * 2, false)
		context.fill()
		context.fillStyle = "yellow"
		context.beginPath()
		context.arc(ship.x, ship.y, ship.r * 0.8, 0, pi * 2, false)
		context.fill()
		context.fillStyle = "white"
		context.beginPath()
		context.arc(ship.x, ship.y, ship.r * 0.5, 0, pi * 2, false)
		context.fill()
	}

	// show ship's collision circle
	if (show_bounding) {
		context.strokeStyle = "lime"
		context.beginPath()
		context.arc(ship.x, ship.y, ship.r, 0, pi * 2, false)
		context.stroke()
	}

	// show ship's centre dot
	if (show_centre_dot) {
		context.fillStyle = "red"
		context.fillRect(ship.x - 1, ship.y - 1, 2, 2)
	}

	// draw the lasers
	for (var i = 0; i < ship.lasers.length; i++) {
		if (ship.lasers[i].explodeTime == 0) {
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
	if (textAlpha >= 0) {
		context.textAlign = "center"
		context.textBaseline = "middle"
		context.fillStyle = `rgba(255, 255, 255, ${textAlpha})`
		context.font = `small-caps ${text_size}px Emulogic`
		context.fillText(text, canvas.width / 2, canvas.height * 0.75)
		textAlpha -= (1.0 / text_fade_time / fps)
	} else if (ship.dead) {
		game_level = 0
		game_score = 0
		game_lives = starting_lives
		ship = default_ship()
		newLevel()
	}

	// draw the lives
	var lifeColour
	for (var i = 0; i < game_lives; i++) {
		lifeColour = exploding && i == game_lives - 1 ? "red" : "white"
		drawShip(ship_size + i * ship_size * 1.2, ship_size, 0.5 * pi, lifeColour)
	}

	// draw the score
	context.textAlign = "right"
	context.textBaseline = "middle"
	context.fillStyle = "white"
	context.font = (text_size / 2) + "px Emulogic"
	context.fillText(game_score, canvas.width - ship_size / 2, ship_size)

	// draw the high score
	context.textAlign = "center"
	context.textBaseline = "middle"
	context.fillStyle = "white"
	context.font = (text_size / 2) + "px Emulogic"
	context.fillText("HIGH SCORE", canvas.width / 2, 30)
	context.fillText(high_score, canvas.width / 2, 60)

	// detect laser hits on asteroids
	var ax, ay, ar, lx, ly
	for (var i = asteroids.length - 1; i >= 0; i--) {

		// grab the asteroid properties
		ax = asteroids[i].x
		ay = asteroids[i].y
		ar = asteroids[i].r

		// loop over the lasers
		for (var j = ship.lasers.length - 1; j >= 0; j--) {

			// grab the laser properties
			lx = ship.lasers[j].x
			ly = ship.lasers[j].y

			// detect hits
			if (ship.lasers[j].explodeTime == 0 && distance(ax, ay, lx, ly) < ar) {

				// destroy the asteroid and activate the laser explosion
				destroyAsteroid(i)
				ship.lasers[j].explodeTime = Math.ceil(laser_explode_dur * fps)
				break
			}
		}
	}

	// check for asteroid collisions (when not exploding)
	if (!exploding) {

		// only check when not blinking
		if (ship.blinkNum == 0 && !ship.dead) {
			for (var i = 0; i < asteroids.length; i++) {
				if (distance(ship.x, ship.y, asteroids[i].x, asteroids[i].y) < ship.r + asteroids[i].r) {
					ship.explodeTime = Math.ceil(ship_explosion_duration * fps)
					fxExplode.play()
					destroyAsteroid(i)
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
		ship.explodeTime--

		// reset the ship after the explosion has finished
		if (ship.explodeTime == 0) {
			game_lives--
			if (game_lives == 0) {
				gameOver()
			} else {
				ship = default_ship()
			}
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
	for (var i = ship.lasers.length - 1; i >= 0; i--) {

		// check distance travelled
		if (ship.lasers[i].dist > laser_dist * canvas.width) {
			ship.lasers.splice(i, 1)
			continue
		}

		// handle the explosion
		if (ship.lasers[i].explodeTime > 0) {
			ship.lasers[i].explodeTime--

			// destroy the laser after the duration is up
			if (ship.lasers[i].explodeTime == 0) {
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

	// move the asteroids
	asteroids.forEach((asteroid) => {
		asteroid.x += asteroid.xv
		asteroid.y += asteroid.yv

		// handle asteroid edge of screen
		if (asteroid.x < 0 - asteroid.r) {
			asteroid.x = canvas.width + asteroid.r
		} else if (asteroid.x > canvas.width + asteroid.r) {
			asteroid.x = 0 - asteroid.r
		}
		if (asteroid.y < 0 - asteroid.r) {
			asteroid.y = canvas.height + asteroid.r
		} else if (asteroid.y > canvas.height + asteroid.r) {
			asteroid.y = 0 - asteroid.r
		}
	})
}

setInterval(update, 1000 / fps)