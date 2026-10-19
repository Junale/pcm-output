import { MusicEngine, type Instrument, type Stack, type Staff, type Track } from "./index.ts";

const Kick: Instrument = {
    waveform: "sine",
    amplitude: 1,
    attack: 0.001,
    decay: 0.1,
    sustain: 0,
    release: 0.1,
};

const Synth: Instrument = {
    waveform: "saw",
    amplitude: 0.5,
    attack: 0.01,
    decay: 0.1,
    sustain: 0.7,
    release: 0.2,
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

const SynthLine: Staff = {
    instrument: Synth,
    scale: "major",
    noteStart: "C",
    octaveStart: 4,
    events: [
        { start: 0, duration: 1, noteIndex: 0, effect: { velocity: 0.8 } },
        { start: 1, duration: 1, noteIndex: 2, effect: { velocity: 0.8 } },
        { start: 2, duration: 1, noteIndex: 4, effect: { velocity: 0.8 } },
        { start: 3, duration: 1, noteIndex: 5, effect: { velocity: 0.8 } },
    ],
};


const Intro: Stack = {
    staffs: [DrumLine],
    itterations: 2,
    
};

const Verse: Stack = {
    staffs: [SynthLine, DrumLine],
};


const music: Track = {
	bpm: 120,
	loop: true,
	sequence: [
        Intro,
        Verse,
	],
};

const engine = new MusicEngine();
engine.play(music);