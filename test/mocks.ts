import type { RenderOptions, Track } from "../src/types.ts";

export const options: RenderOptions = { sampleRate: 100, channels: 1 };

export function track(sequence: Track["sequence"], bpm = 60): Track {
	return { bpm, loop: false, sequence };
}

export function staff(noteIndex: number, duration = 1, effect?: { velocity?: number; pan?: number }) {
	return {
		instrument: {
			waveform: "sine" as const,
			amplitude: 1,
			attack: 0,
			decay: 0,
			sustain: 1,
			release: 0.1,
		},
		octaveStart: -1,
		events: [{ start: 0, duration, noteIndex, effect }],
	};
}
