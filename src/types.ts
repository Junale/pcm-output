import type { NOTE_OFFSETS } from "./constants.ts";

export type Waveform = "sine" | "square" | "saw" | "triangle" | "noise";

export type Partial = {
	ratio: number;
	level: number;
	waveform: Waveform;
	detuneCents?: number;
};

export type Envelope = {
	attack: number;
	decay: number;
	release: number;
	curve: "linear" | "exponential";
};

export type VelocityResponse = {
	/** Loudness multiplier for event velocity, constrained to [0, 1]. */
	volume: number;
	/** Higher-partial boost for event velocity, constrained to [0, 1]. */
	brightness: number;
};

export type Instrument = {
	amplitude: number;
	partials: Partial[];
	envelope: Envelope;
	velocityResponse: VelocityResponse;
};

export type NoteName = keyof typeof NOTE_OFFSETS;

export type Scale =
	| "chromatic"
	| "major"
	| "minor"
	| "dorian"
	| "phrygian"
	| "lydian"
	| "mixolydian"
	| "locrian";

export type Effect = {
	velocity?: number;
	pan?: number;
};

export type NoteEvent = {
	start: number;
	duration: number;
	noteIndex: number;
	effect?: Effect;
};

export type Staff = {
	instrument: Instrument;
	events: NoteEvent[];
	scale?: Scale;
	noteStart?: NoteName;
	octaveStart?: number;
	effect?: Effect;
};

export type Stack = {
	staffs: Staff[];
	effect?: Effect;
	iterations?: number;
};

export type Track = {
	bpm: number;
	loop: boolean;
	sequence: Stack[];
	effect?: Effect;
};

export type MusicEngineOptions = {
	sampleRate?: number;
	channels?: number;
};

export type AudioOutputOptions = {
	sampleRate?: number;
	channels?: number;
};

export type RenderOptions = {
	sampleRate: number;
	channels: number;
};

export type Voice = {
	startSample: number;
	endSample: number;
	frequency: number;
	velocity: number;
	pan: number;
	instrument: Instrument;
	phase: number[];
};
