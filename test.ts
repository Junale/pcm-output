import { MusicEngine, type Instrument, type Stack, type Staff, type Track } from "./index.ts";

const Kick: Instrument = {
    waveform: "sine",
    amplitude: 1,
    attack: 0.001,
    decay: 0.1,
    sustain: 0,
    release: 0.1,
};

const DrumLine: Staff = {
    instrument: Kick,
    scale: "major",
    noteStart: "C",
    octaveStart: 4,
    events: [
        { start: 0, duration: 0.5, noteIndex: 0, effect: { velocity: 1 } },
        { start: 1, duration: 0.5, noteIndex: 0, effect: { velocity: 1 } },
        { start: 2, duration: 0.5, noteIndex: 0, effect: { velocity: 1 } },
        { start: 3, duration: 0.5, noteIndex: 0, effect: { velocity: 1 } },
    ],
};

const Intro: Stack = {
    staffs: [DrumLine],
    itterations: 1,
};

const music: Track = {
	bpm: 120,
	loop: true,
	sequence: [
        Intro,
	],
};

const engine = new MusicEngine();
engine.play(music);