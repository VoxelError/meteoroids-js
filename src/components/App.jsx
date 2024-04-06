import React, { useEffect, useRef } from 'react'
import draw from "../draw.js"

export default () => {
	const canvas_ref = useRef(null)

	useEffect(() => {
		const context = canvas_ref.current.getContext("2d")
		const frame = () => {
			draw(context)
			requestAnimationFrame(frame)
		}
		frame()
	}, [])

	return <canvas ref={canvas_ref} width={1440} height={900}></canvas>
}