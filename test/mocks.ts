import type { Instrument, RenderOptions, Staff, Track } from "../src/types.ts";

export const options: RenderOptions = { sampleRate: 100, channels: 1 };

export function track(sequence: Track["sequence"], bpm = 60): Track {
	return { bpm, loop: false, sequence };
}

export function staff(
	noteIndex: number,
	duration = 1,
	effect?: { velocity?: number; pan?: number },
): Staff {
	return {
		instrument: {
			amplitude: 1,
			partials: [{ ratio: 1, level: 1, waveform: "sine" }],
			envelope: {
				attack: 0,
				decay: 0.1,
				release: 0.1,
				curve: "linear",
			},
			velocityResponse: { volume: 1, brightness: 0 },
		} satisfies Instrument,
		octaveStart: -1,
		events: [{ start: 0, duration, noteIndex, effect }],
	};
}
