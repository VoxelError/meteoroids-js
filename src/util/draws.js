import { pi } from "./math"

export const stroke_line = (context, { start, end, width, dash, offset, style, cap, alpha }) => {
	context.beginPath()
	context.moveTo(start[0], start[1])
	context.lineTo(end[0], end[1])
	context.lineWidth = width ?? 1
	context.setLineDash(dash ?? [])
	context.lineDashOffset = offset ?? 0
	context.strokeStyle = style ?? "white"
	context.lineCap = cap ?? "butt"
	context.globalAlpha = alpha ?? 1
	context.stroke()
}

export const stroke_polygon = (context, { points, close = false, width, dash, offset, style, cap, alpha }) => {
	if (points.length < 3) {
		console.log("insufficient points")
		return
	}

	context.beginPath()
	context.moveTo(points[0][0], points[0][1])

	for (let i = 1; i < points.length; i++) {
		context.lineTo(points[i][0], points[i][1])
	}

	context.lineWidth = width ?? 1
	context.setLineDash(dash ?? [])
	context.lineDashOffset = offset ?? 0
	context.strokeStyle = style ?? "white"
	context.lineCap = cap ?? "butt"
	context.globalAlpha = alpha ?? 1

	close && context.closePath()
	context.stroke()
}

export const draw_text = (context, { font = "", text = "", align, baseline, pos, fill, stroke }) => {
	context.font = font
	context.textAlign = align
	context.textBaseline = baseline

	if (fill) {
		const { alpha, style } = fill

		context.globalAlpha = alpha ?? 1
		context.fillStyle = style ?? "white"
		context.fillText(text, pos[0], pos[1])
	}

	if (stroke) {
		const { dash, offset, width, alpha, style, cap } = stroke

		context.setLineDash(dash ?? [])
		context.lineDashOffset = offset ?? 0
		context.lineCap = cap ?? "butt"
		context.lineWidth = width ?? 1
		context.globalAlpha = alpha ?? 1
		context.strokeStyle = style ?? "white"
		context.strokeText(text, pos.x, pos.y)
	}
}

export const draw_arc = (context, { center, radius, fill, stroke }) => {
	context.beginPath()
	context.arc(
		center[0],
		center[1],
		radius,
		0,
		2 * pi
	)

	if (fill) {
		const { alpha, style } = fill

		context.globalAlpha = alpha ?? 1
		context.fillStyle = style ?? "white"
		context.fill()
	}

	if (stroke) {
		const { dash, offset, width, alpha, style, cap } = stroke

		context.setLineDash(dash ?? [])
		context.lineDashOffset = offset ?? 0
		context.lineCap = cap ?? "butt"
		context.lineWidth = width ?? 1
		context.globalAlpha = alpha ?? 1
		context.strokeStyle = style ?? "white"
		context.stroke()
	}
}