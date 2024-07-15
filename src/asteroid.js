import { floor, phi, rng } from "./util/math"

const to_array = (length, fill = 0) => Array(length).fill(fill)

export class Asteroid {
	constructor(x, y, size, game_object) {
		this.x = x
		this.y = y
		this.r = 50 / 2 ** (3 - size)
		this.a = rng(phi)

		this.xv = rng(0.3) * (rng() < 0.5 ? -1 : 1) * (4 - size) * game_object.level
		this.yv = rng(0.3) * (rng() < 0.5 ? -1 : 1) * (4 - size) * game_object.level
		this.vert = floor(rng(11, 5))
		this.offs = to_array(this.vert).map(() => rng(0.8, 0.6))
	}
}