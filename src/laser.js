import { draw_arc } from "./util/draws"
import { abs, cos, sin } from "./util/math"

export class Laser {
	constructor(ship) {
		this.x = ship.x + (4 / 3) * ship.radius * cos(ship.a)
		this.y = ship.y - (4 / 3) * ship.radius * sin(ship.a)

		this.delete = false
		this.speed = 16

		this.xv = this.speed * cos(ship.a)
		this.yv = -this.speed * sin(ship.a)
	}

	update = (canvas, context) => {
		this.x += this.xv
		this.y += this.yv
		if (abs(this.x) > canvas.width / 2) { this.delete = true }
		if (abs(this.y) > canvas.height / 2) { this.delete = true }

		draw_arc(context, {
			center: [this.x, this.y],
			radius: 1.8,
			fill: {}
		})
	}
}