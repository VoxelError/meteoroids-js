export const { PI: pi, sin, cos, abs, sqrt, random, floor, sign, min, max } = Math
export const tau = pi * 2
export const phi = pi / 2

export const rng = (range = 1, offset = 0) => random() * range + offset
export const degrees = (theta) => theta * tau / 360
export const ticks = (num) => tau / num
export const sin_wave = (theta, amplitude = 1, v_shift = 0, frequency = 1, phase = 0) => amplitude * sin(frequency * theta - phase) + v_shift
export const cos_wave = (theta, amplitude = 1, v_shift = 0, frequency = 1, phase = 0) => amplitude * cos(frequency * theta - phase) + v_shift