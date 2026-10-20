import {
	type Instrument,
	MusicEngine,
	type Stack,
	type Staff,
	type Track,
} from "./index.ts";

const Kick: Instrument = {
	waveform: "sine",
	amplitude: 1,
	attack: 0.0005,
	decay: 0.1,
	sustain: 0,
	release: 0.15,
};

const Snare: Instrument = {
	waveform: "noise",
	amplitude: 0.8,
	attack: 0.001,
	decay: 0.08,
	sustain: 0,
	release: 0.08,
};

const KickLine: Staff = {
	instrument: Kick,
	scale: "major",
	noteStart: "E",
	octaveStart: 2,
	events: [
		{ start: 0, duration: 0.5, noteIndex: 0, effect: { velocity: 1 } },
		{ start: 1, duration: 0.5, noteIndex: 0, effect: { velocity: 1 } },
		{ start: 2, duration: 0.5, noteIndex: 0, effect: { velocity: 1 } },
		{ start: 3, duration: 0.5, noteIndex: 0, effect: { velocity: 1 } },
	],
};

const SnareLine: Staff = {
	instrument: Snare,
	scale: "major",
	noteStart: "C",
	octaveStart: 4,
	events: [
		{ start: 1, duration: 0.5, noteIndex: 0, effect: { velocity: 1 } },
		{ start: 3, duration: 0.5, noteIndex: 0, effect: { velocity: 1 } },
	],
};

const Intro: Stack = {
	staffs: [KickLine, SnareLine],
	itterations: 1,
};

const music: Track = {
	bpm: 120,
	loop: true,
	sequence: [Intro],
};

const engine = new MusicEngine();
engine.play(music);
