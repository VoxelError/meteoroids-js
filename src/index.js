import { fxExplode, fxHit, fxLaser, fxThrust } from "./sounds"

const fps = 60 								// frames per second
const friction = 0.7 						// friction coefficient of space (0 = no friction, 1 = lots of friction)
const starting_lives = 3 					// starting number of lives

const laser_dist = 0.6 						// max distance laser can travel as fraction of screen width
const laser_explode_dur = 0.1 				// duration of the lasers' explosion in seconds
const laser_max = 10 						// maximum number of lasers on screen at once
const laser_spd = 500 						// speed of lasers in pixels per second

const roid_jag = 0.4 						// jaggedness of the asteroids (0 = none, 1 = lots)
const roid_pts_lge = 20 					// points scored for a large asteroid
const roid_pts_med = 50 					// points scored for a medium asteroid
const roid_pts_sml = 100 					// points scored for a small asteroid
const roid_num = 3 							// starting number of asteroids
const roid_size = 100 						// starting size of asteroids in pixels
const roid_spd = 50 						// max starting speed of asteroids in pixels per second
const roid_vert = 10 						// average number of vertices on each asteroid

const save_key_score = "highscore" 			// save key for local storage of high score

const ship_blink_dur = 0.1 					// duration in seconds of a single blink during ship's invisibility
const ship_explode_dur = 0.3 				// duration of the ship's explosion in seconds
const ship_inv_dur = 3 						// duration of the ship's invisibility in seconds
const ship_size = 30 						// ship height in pixels
const ship_thrust = 5 						// acceleration of the ship in pixels per second per second
const ship_turn_spd = 180 					// turn speed in degrees per second

const show_bounding = false 				// show or hide collision bounding
const show_centre_dot = false 				// show or hide ship's centre dot

const text_fade_time = 2.5 					// text fade time in seconds
const text_size = 40 						// text font height in pixels

const canv = document.getElementById("game_canvas")
const ctx = canv.getContext("2d")

document.addEventListener("keydown", keyDown)
document.addEventListener("keyup", keyUp)

setInterval(update, 1000 / fps)

const distBetweenPoints = (x1, y1, x2, y2) => Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2))

let
	asteroids,
	game_level,
	game_lives,
	game_score,
	high_score,
	ship,
	text,
	textAlpha

const newGame = () => {
	game_level = 0
	game_score = 0
	game_lives = starting_lives
	ship = newShip()

	// get the high score from local storage
	var scoreStr = localStorage.getItem(save_key_score)
	if (scoreStr == null) {
		high_score = 0
	} else {
		high_score = parseInt(scoreStr)
	}

	newLevel()
}

newGame()

function createAsteroidBelt() {
	asteroids = []
	var x, y
	for (var i = 0; i < roid_num + game_level; i++) {
		// random asteroid location (not touching spaceship)
		do {
			x = Math.floor(Math.random() * canv.width)
			y = Math.floor(Math.random() * canv.height)
		} while (distBetweenPoints(ship.x, ship.y, x, y) < roid_size * 2 + ship.r)
		asteroids.push(newAsteroid(x, y, Math.ceil(roid_size / 2)))
	}
}

function destroyAsteroid(index) {
	var x = asteroids[index].x
	var y = asteroids[index].y
	var r = asteroids[index].r

	// split the asteroid in two if necessary
	if (r == Math.ceil(roid_size / 2)) { // large asteroid
		asteroids.push(newAsteroid(x, y, Math.ceil(roid_size / 4)))
		asteroids.push(newAsteroid(x, y, Math.ceil(roid_size / 4)))
		game_score += roid_pts_lge
	} else if (r == Math.ceil(roid_size / 4)) { // medium asteroid
		asteroids.push(newAsteroid(x, y, Math.ceil(roid_size / 8)))
		asteroids.push(newAsteroid(x, y, Math.ceil(roid_size / 8)))
		game_score += roid_pts_med
	} else {
		game_score += roid_pts_sml
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
	if (asteroids.length == 0) {
		game_level++
		newLevel()
	}
}

function drawShip(x, y, a, colour = "white") {
	ctx.strokeStyle = colour
	ctx.lineWidth = ship_size / 20
	ctx.beginPath()
	ctx.moveTo( // nose of the ship
		x + 4 / 3 * ship.r * Math.cos(a),
		y - 4 / 3 * ship.r * Math.sin(a)
	)
	ctx.lineTo( // rear left
		x - ship.r * (2 / 3 * Math.cos(a) + Math.sin(a)),
		y + ship.r * (2 / 3 * Math.sin(a) - Math.cos(a))
	)
	ctx.lineTo( // rear right
		x - ship.r * (2 / 3 * Math.cos(a) - Math.sin(a)),
		y + ship.r * (2 / 3 * Math.sin(a) + Math.cos(a))
	)
	ctx.closePath()
	ctx.stroke()
}

function explodeShip() {
	ship.explodeTime = Math.ceil(ship_explode_dur * fps)
	fxExplode.play()
}

function gameOver() {
	ship.dead = true
	text = "Game Over"
	textAlpha = 1.0
}

function keyDown(/** @type {KeyboardEvent} */ ev) {

	if (ship.dead) {
		return
	}

	switch (ev.keyCode) {
		case 32: // space bar (shoot laser)
			shootLaser()
			break
		case 37: // left arrow (rotate ship left)
			ship.rot = ship_turn_spd / 180 * Math.PI / fps
			break
		case 38: // up arrow (thrust the ship forward)
			ship.thrusting = true
			break
		case 39: // right arrow (rotate ship right)
			ship.rot = -ship_turn_spd / 180 * Math.PI / fps
			break
	}
}

function keyUp(/** @type {KeyboardEvent} */ ev) {

	if (ship.dead) {
		return
	}

	switch (ev.keyCode) {
		case 32: // space bar (allow shooting again)
			ship.canShoot = true
			break
		case 37: // left arrow (stop rotating left)
			ship.rot = 0
			break
		case 38: // up arrow (stop thrusting)
			ship.thrusting = false
			break
		case 39: // right arrow (stop rotating right)
			ship.rot = 0
			break
	}
}

function newAsteroid(x, y, r) {
	var lvlMult = 1 + 0.1 * game_level
	var roid = {
		x: x,
		y: y,
		xv: Math.random() * roid_spd * lvlMult / fps * (Math.random() < 0.5 ? 1 : -1),
		yv: Math.random() * roid_spd * lvlMult / fps * (Math.random() < 0.5 ? 1 : -1),
		a: Math.random() * Math.PI * 2, // in radians
		r: r,
		offs: [],
		vert: Math.floor(Math.random() * (roid_vert + 1) + roid_vert / 2)
	}

	// populate the offsets array
	for (var i = 0; i < roid.vert; i++) {
		roid.offs.push(Math.random() * roid_jag * 2 + 1 - roid_jag)
	}

	return roid
}

function newLevel() {
	text = "Level " + (game_level + 1)
	textAlpha = 1.0
	createAsteroidBelt()
}

function newShip() {
	return {
		x: canv.width / 2,
		y: canv.height / 2,
		a: 90 / 180 * Math.PI, // convert to radians
		r: ship_size / 2,
		blinkNum: Math.ceil(ship_inv_dur / ship_blink_dur),
		blinkTime: Math.ceil(ship_blink_dur * fps),
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

function shootLaser() {
	// create the laser object
	if (ship.canShoot && ship.lasers.length < laser_max) {
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
	var blinkOn = ship.blinkNum % 2 == 0
	var exploding = ship.explodeTime > 0

	// draw space
	ctx.fillStyle = "black"
	ctx.fillRect(0, 0, canv.width, canv.height)

	// draw the asteroids
	var a, r, x, y, offs, vert
	for (var i = 0; i < asteroids.length; i++) {
		ctx.strokeStyle = "slategrey"
		ctx.lineWidth = ship_size / 20

		// get the asteroid properties
		a = asteroids[i].a
		r = asteroids[i].r
		x = asteroids[i].x
		y = asteroids[i].y
		offs = asteroids[i].offs
		vert = asteroids[i].vert

		// draw the path
		ctx.beginPath()
		ctx.moveTo(
			x + r * offs[0] * Math.cos(a),
			y + r * offs[0] * Math.sin(a)
		)

		// draw the polygon
		for (var j = 1; j < vert; j++) {
			ctx.lineTo(
				x + r * offs[j] * Math.cos(a + j * Math.PI * 2 / vert),
				y + r * offs[j] * Math.sin(a + j * Math.PI * 2 / vert)
			)
		}
		ctx.closePath()
		ctx.stroke()

		// show asteroid's collision circle
		if (show_bounding) {
			ctx.strokeStyle = "lime"
			ctx.beginPath()
			ctx.arc(x, y, r, 0, Math.PI * 2, false)
			ctx.stroke()
		}
	}

	// thrust the ship
	if (ship.thrusting && !ship.dead) {
		ship.thrust.x += ship_thrust * Math.cos(ship.a) / fps
		ship.thrust.y -= ship_thrust * Math.sin(ship.a) / fps
		fxThrust.play()

		// draw the thruster
		if (!exploding && blinkOn) {
			ctx.fillStyle = "red"
			ctx.strokeStyle = "yellow"
			ctx.lineWidth = ship_size / 10
			ctx.beginPath()
			ctx.moveTo( // rear left
				ship.x - ship.r * (2 / 3 * Math.cos(ship.a) + 0.5 * Math.sin(ship.a)),
				ship.y + ship.r * (2 / 3 * Math.sin(ship.a) - 0.5 * Math.cos(ship.a))
			)
			ctx.lineTo( // rear centre (behind the ship)
				ship.x - ship.r * 5 / 3 * Math.cos(ship.a),
				ship.y + ship.r * 5 / 3 * Math.sin(ship.a)
			)
			ctx.lineTo( // rear right
				ship.x - ship.r * (2 / 3 * Math.cos(ship.a) - 0.5 * Math.sin(ship.a)),
				ship.y + ship.r * (2 / 3 * Math.sin(ship.a) + 0.5 * Math.cos(ship.a))
			)
			ctx.closePath()
			ctx.fill()
			ctx.stroke()
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
				ship.blinkTime = Math.ceil(ship_blink_dur * fps)
				ship.blinkNum--
			}
		}
	} else {
		// draw the explosion (concentric circles of different colours)
		ctx.fillStyle = "darkred"
		ctx.beginPath()
		ctx.arc(ship.x, ship.y, ship.r * 1.7, 0, Math.PI * 2, false)
		ctx.fill()
		ctx.fillStyle = "red"
		ctx.beginPath()
		ctx.arc(ship.x, ship.y, ship.r * 1.4, 0, Math.PI * 2, false)
		ctx.fill()
		ctx.fillStyle = "orange"
		ctx.beginPath()
		ctx.arc(ship.x, ship.y, ship.r * 1.1, 0, Math.PI * 2, false)
		ctx.fill()
		ctx.fillStyle = "yellow"
		ctx.beginPath()
		ctx.arc(ship.x, ship.y, ship.r * 0.8, 0, Math.PI * 2, false)
		ctx.fill()
		ctx.fillStyle = "white"
		ctx.beginPath()
		ctx.arc(ship.x, ship.y, ship.r * 0.5, 0, Math.PI * 2, false)
		ctx.fill()
	}

	// show ship's collision circle
	if (show_bounding) {
		ctx.strokeStyle = "lime"
		ctx.beginPath()
		ctx.arc(ship.x, ship.y, ship.r, 0, Math.PI * 2, false)
		ctx.stroke()
	}

	// show ship's centre dot
	if (show_centre_dot) {
		ctx.fillStyle = "red"
		ctx.fillRect(ship.x - 1, ship.y - 1, 2, 2)
	}

	// draw the lasers
	for (var i = 0; i < ship.lasers.length; i++) {
		if (ship.lasers[i].explodeTime == 0) {
			ctx.fillStyle = "salmon"
			ctx.beginPath()
			ctx.arc(ship.lasers[i].x, ship.lasers[i].y, ship_size / 15, 0, Math.PI * 2, false)
			ctx.fill()
		} else {
			// draw the eplosion
			ctx.fillStyle = "orangered"
			ctx.beginPath()
			ctx.arc(ship.lasers[i].x, ship.lasers[i].y, ship.r * 0.75, 0, Math.PI * 2, false)
			ctx.fill()
			ctx.fillStyle = "salmon"
			ctx.beginPath()
			ctx.arc(ship.lasers[i].x, ship.lasers[i].y, ship.r * 0.5, 0, Math.PI * 2, false)
			ctx.fill()
			ctx.fillStyle = "pink"
			ctx.beginPath()
			ctx.arc(ship.lasers[i].x, ship.lasers[i].y, ship.r * 0.25, 0, Math.PI * 2, false)
			ctx.fill()
		}
	}

	// draw the game text
	if (textAlpha >= 0) {
		ctx.textAlign = "center"
		ctx.textBaseline = "middle"
		ctx.fillStyle = "rgba(255, 255, 255, " + textAlpha + ")"
		ctx.font = "small-caps " + text_size + "px dejavu sans mono"
		ctx.fillText(text, canv.width / 2, canv.height * 0.75)
		textAlpha -= (1.0 / text_fade_time / fps)
	} else if (ship.dead) {
		// after "game over" fades, start a new game
		newGame()
	}

	// draw the lives
	var lifeColour
	for (var i = 0; i < game_lives; i++) {
		lifeColour = exploding && i == game_lives - 1 ? "red" : "white"
		drawShip(ship_size + i * ship_size * 1.2, ship_size, 0.5 * Math.PI, lifeColour)
	}

	// draw the score
	ctx.textAlign = "right"
	ctx.textBaseline = "middle"
	ctx.fillStyle = "white"
	ctx.font = (text_size / 2) + "px Emulogic"
	ctx.fillText(game_score, canv.width - ship_size / 2, ship_size)

	// draw the high score
	ctx.textAlign = "center"
	ctx.textBaseline = "middle"
	ctx.fillStyle = "white"
	ctx.font = (text_size / 2) + "px Emulogic"
	ctx.fillText("HIGH SCORE", canv.width / 2, 30)
	ctx.fillText(high_score, canv.width / 2, 60)

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
			if (ship.lasers[j].explodeTime == 0 && distBetweenPoints(ax, ay, lx, ly) < ar) {

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
				if (distBetweenPoints(ship.x, ship.y, asteroids[i].x, asteroids[i].y) < ship.r + asteroids[i].r) {
					explodeShip()
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
				ship = newShip()
			}
		}
	}

	// handle edge of screen
	if (ship.x < 0 - ship.r) {
		ship.x = canv.width + ship.r
	} else if (ship.x > canv.width + ship.r) {
		ship.x = 0 - ship.r
	}
	if (ship.y < 0 - ship.r) {
		ship.y = canv.height + ship.r
	} else if (ship.y > canv.height + ship.r) {
		ship.y = 0 - ship.r
	}

	// move the lasers
	for (var i = ship.lasers.length - 1; i >= 0; i--) {

		// check distance travelled
		if (ship.lasers[i].dist > laser_dist * canv.width) {
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
			ship.lasers[i].x = canv.width
		} else if (ship.lasers[i].x > canv.width) {
			ship.lasers[i].x = 0
		}
		if (ship.lasers[i].y < 0) {
			ship.lasers[i].y = canv.height
		} else if (ship.lasers[i].y > canv.height) {
			ship.lasers[i].y = 0
		}
	}

	// move the asteroids
	for (var i = 0; i < asteroids.length; i++) {
		asteroids[i].x += asteroids[i].xv
		asteroids[i].y += asteroids[i].yv

		// handle asteroid edge of screen
		if (asteroids[i].x < 0 - asteroids[i].r) {
			asteroids[i].x = canv.width + asteroids[i].r
		} else if (asteroids[i].x > canv.width + asteroids[i].r) {
			asteroids[i].x = 0 - asteroids[i].r
		}
		if (asteroids[i].y < 0 - asteroids[i].r) {
			asteroids[i].y = canv.height + asteroids[i].r
		} else if (asteroids[i].y > canv.height + asteroids[i].r) {
			asteroids[i].y = 0 - asteroids[i].r
		}
	}
}