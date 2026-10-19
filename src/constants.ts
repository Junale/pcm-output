import type { Instrument } from "./types.ts";

export const DEFAULT_INSTRUMENT: Required<Instrument> = {
	waveform: "sine",
	amplitude: 0.25,
	attack: 0.01,
	decay: 0.1,
	sustain: 0.7,
	release: 0.2,
};

export const NOTE_OFFSETS: Record<string, number> = {
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
};