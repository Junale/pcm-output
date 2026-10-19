
import { MusicEngine, type Music } from "./index.ts";


const music: Music = {
    bpm: 120,
    loop: true,
    tracks: [
        {
            instrument: {
                waveform: "saw",
                attack: 0.01,
                decay: 0.1,
                sustain: 0.7,
                release: 0.2,
            },
            events: [
                    { start: 0, duration: 1, note: "C4", velocity: 0.8 },
                    { start: 1, duration: 1, note: "D4", velocity: 0.8 },
                    { start: 2, duration: 2, note: "E4", velocity: 0.8 },
            ],
        },
        {
            instrument: {
                waveform: "sine",
                attack: 0.001,
                decay: 0.1,
                sustain: 0,
                release: 0.05,
            },
            events: [
                    { start: 0, duration: 0.25, note: "C2" },
                    { start: 1, duration: 0.25, note: "C2" },
            ],
        },
    ],
};

const engine = new MusicEngine();
engine.play(music);