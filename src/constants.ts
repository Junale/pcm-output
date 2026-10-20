import type { Instrument } from "./types.ts";

export const STAFF_BEATS = 4;

export const DEFAULT_INSTRUMENT: Required<Instrument> = {
	amplitude: 0.25,
	partials: [{ ratio: 1, level: 1, waveform: "sine" }],
	envelope: {
		attack: 0.01,
		decay: 0.1,
		release: 0.2,
		curve: "exponential",
	},
	velocityResponse: {
		volume: 1,
		brightness: 0,
	},
};

export const NOTE_OFFSETS = {
	C: 0,
	"C#": 1,
	Db: 1,
	D: 2,
	"D#": 3,
	Eb: 3,
	E: 4,
	F: 5,
	"F#": 6,
	Gb: 6,
	G: 7,
	"G#": 8,
	Ab: 8,
	A: 9,
	"A#": 10,
	Bb: 10,
	B: 11,
} as const;

export const SCALE_INTERVALS = {
	chromatic: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11],
	major: [0, 2, 4, 5, 7, 9, 11],
	minor: [0, 2, 3, 5, 7, 8, 10],
	dorian: [0, 2, 3, 5, 7, 9, 10],
	phrygian: [0, 1, 3, 5, 7, 8, 10],
	lydian: [0, 2, 4, 6, 7, 9, 11],
	mixolydian: [0, 2, 4, 5, 7, 9, 10],
	locrian: [0, 1, 3, 5, 6, 8, 10],
} as const;