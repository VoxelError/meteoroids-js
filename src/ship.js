import { Laser } from "./laser"
import { abs, cos, phi, sin, tau } from "./util/math"

export class Ship {
	x = 0
	y = 0
	radius = 15
	a = phi

	turn_speed = tau / 120
	acceleration = 0.06
	friction = 0.994

	dead_timer = 0
	blink_num = 6
	blink_time = 6

	lasers = []
	thrust = { x: 0, y: 0 }

	controls = (canvas, keybinds, game_object) => {
		if (game_object.over) return

		if (this.dead_timer > 0) {
			this.thrust.x = 0
			this.thrust.y = 0
			return
		}

		keybinds.ArrowRight && (this.a -= this.turn_speed)
		keybinds.ArrowLeft && (this.a += this.turn_speed)

		if (keybinds.ArrowUp) {
			this.thrust.x += cos(this.a) * this.acceleration
			this.thrust.y -= sin(this.a) * this.acceleration
		} else {
			this.thrust.x *= this.friction
			this.thrust.y *= this.friction
		}

		if (keybinds.ArrowDown) {
			this.thrust.x *= 0.98
			this.thrust.y *= 0.98
		}

		this.x += this.thrust.x
		this.y += this.thrust.y

		if (abs(this.x) > canvas.width / 2 + this.radius) { this.x *= -1 }
		if (abs(this.y) > canvas.height / 2 + this.radius) { this.y *= -1 }

		if (keybinds.Space) {
			this.lasers.push(new Laser(this))

			keybinds.Space = false
		}
	}
}