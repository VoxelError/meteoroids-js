const sound_on = true

class Sound {
	constructor(source, maxStreams = 1, vol = 0.05) {
		this.streamNum = 0
		this.streams = []
		for (let i = 0; i < maxStreams; i++) {
			this.streams.push(new Audio(source))
			this.streams[i].volume = vol
		}

		this.play = function () {
			if (sound_on) {
				this.streamNum = (this.streamNum + 1) % maxStreams
				this.streams[this.streamNum].play()
			}
		}

		this.stop = function () {
			this.streams[this.streamNum].pause()
			this.streams[this.streamNum].currentTime = 0
		}
	}
}

export const fxExplode = new Sound("sounds/explode.m4a")
export const fxHit = new Sound("sounds/hit.m4a", 5)
export const fxLaser = new Sound("sounds/laser.m4a", 5)
export const fxThrust = new Sound("sounds/thrust.m4a")