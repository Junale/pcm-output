import {
	DEFAULT_INSTRUMENT,
	NOTE_OFFSETS,
	SCALE_INTERVALS,
	STAFF_BEATS,
} from "./constants.ts";
import type {
	Effect,
	RenderOptions,
	Scale,
	Stack,
	Track,
	Voice,
	Waveform,
} from "./types.ts";

function noteToFrequency(
	noteIndex: number,
	noteStart: keyof typeof NOTE_OFFSETS,
	octaveStart: number,
	scale: Scale,
): number {
	if (!Number.isInteger(noteIndex) || noteIndex < 0)
		throw new Error("noteIndex must be a non-negative integer");
	const intervals = SCALE_INTERVALS[scale];
	const octaveOffset = Math.floor(noteIndex / intervals.length);
	const scaleIndex = noteIndex % intervals.length;
	const interval = intervals[scaleIndex];
	if (interval === undefined)
		throw new Error(`Invalid note index: ${noteIndex}`);
	const semitone =
		NOTE_OFFSETS[noteStart] + interval + (octaveOffset + octaveStart) * 12;
	return 440 * 2 ** ((semitone - 57) / 12);
}

function waveformSample(waveform: Waveform, phase: number): number {
	switch (waveform) {
		case "square":
			return phase < Math.PI ? 1 : -1;
		case "saw":
			return 1 - phase / Math.PI;
		case "triangle":
			return (
				1 -
				4 * Math.abs(Math.round(phase / (2 * Math.PI)) - phase / (2 * Math.PI))
			);
		case "noise":
			return Math.random() * 2 - 1;
		default:
			return Math.sin(phase);
	}
}

function envelope(voice: Voice, sample: number, sampleRate: number): number {
	const elapsed = (sample - voice.startSample) / sampleRate;
	const duration = (voice.endSample - voice.startSample) / sampleRate;
	const attack = Math.max(voice.instrument.attack, 0.000001);
	const decay = Math.max(voice.instrument.decay, 0.000001);
	const release = Math.max(voice.instrument.release, 0.000001);

	if (elapsed < attack) return elapsed / attack;
	if (elapsed < attack + decay) {
		const progress = (elapsed - attack) / decay;
		return 1 - progress * (1 - voice.instrument.sustain);
	}
	if (elapsed < duration) return voice.instrument.sustain;

	const releaseProgress = (elapsed - duration) / release;
	return Math.max(0, voice.instrument.sustain * (1 - releaseProgress));
}

function mergeEffects(...effects: (Effect | undefined)[]): Required<Effect> {
	const merged = Object.assign({}, ...effects);
	return {
		velocity: Math.max(0, Math.min(1, merged.velocity ?? 1)),
		pan: Math.max(-1, Math.min(1, merged.pan ?? 0)),
	};
}

function addStackVoices(
	stack: Stack,
	stackStart: number,
	trackEffect: Effect | undefined,
	bpm: number,
	sampleRate: number,
	voices: Voice[],
): number {
	for (const staff of stack.staffs) {
		for (const event of staff.events) {
			if (event.start < 0 || event.duration <= 0) {
				throw new Error(
					"Note events need a non-negative start and positive duration",
				);
			}
			if (event.start + event.duration > STAFF_BEATS) {
				throw new Error("Staff events must end within four beats");
			}
		}
	}

	const itterations = stack.iterations ?? 1;
	if (!Number.isInteger(itterations) || itterations < 0) {
		throw new Error("Stack itterations must be a non-negative integer");
	}

	for (let iteration = 0; iteration < itterations; iteration++) {
		const iterationStart = stackStart + iteration * STAFF_BEATS;
		for (const staff of stack.staffs) {
			const scale = staff.scale ?? "major";
			const noteStart = staff.noteStart ?? "C";
			const octaveStart = staff.octaveStart ?? 4;
			const instrument = { ...DEFAULT_INSTRUMENT, ...staff.instrument };
			for (const event of staff.events) {
				const effect = mergeEffects(
					trackEffect,
					stack.effect,
					staff.effect,
					event.effect,
				);
				const startBeat = iterationStart + event.start;
				const startSample = Math.round(startBeat * (60 / bpm) * sampleRate);
				const endSample = Math.round(
					(startBeat + event.duration) * (60 / bpm) * sampleRate,
				);
				voices.push({
					startSample,
					endSample,
					frequency: noteToFrequency(
						event.noteIndex,
						noteStart,
						octaveStart,
						scale,
					),
					velocity: effect.velocity,
					pan: effect.pan,
					instrument,
					phase: 0,
				});
			}
		}
	}
	return STAFF_BEATS * itterations;
}

export function renderMusic(
	music: Track,
	options: RenderOptions,
): Float32Array {
	if (music.bpm <= 0) throw new Error("Music BPM must be greater than zero");
	const voices: Voice[] = [];
	let totalBeats = 0;
	for (const stack of music.sequence) {
		totalBeats += addStackVoices(
			stack,
			totalBeats,
			music.effect,
			music.bpm,
			options.sampleRate,
			voices,
		);
	}

	const releaseSamples = music.loop
		? 0
		: voices.reduce(
				(maximum, voice) =>
					Math.max(
						maximum,
						Math.ceil(voice.instrument.release * options.sampleRate),
					),
				0,
			);
	const totalSamples =
		Math.ceil(totalBeats * (60 / music.bpm) * options.sampleRate) +
		releaseSamples;
	const output = new Float32Array(totalSamples * options.channels);

	for (const voice of voices) {
		const left = Math.cos(((voice.pan + 1) * Math.PI) / 4);
		const right = Math.sin(((voice.pan + 1) * Math.PI) / 4);
		const voiceEnd =
			voice.endSample + voice.instrument.release * options.sampleRate;

		for (let sample = voice.startSample; sample < voiceEnd; sample++) {
			const amplitude =
				waveformSample(voice.instrument.waveform, voice.phase) *
				voice.instrument.amplitude *
				voice.velocity *
				envelope(voice, sample, options.sampleRate);
			voice.phase =
				(voice.phase + (2 * Math.PI * voice.frequency) / options.sampleRate) %
				(2 * Math.PI);

			const offset = sample * options.channels;
			if (output[offset] !== undefined) output[offset] += amplitude * left;
			const rightSample = output[offset + 1];
			if (options.channels > 1 && rightSample !== undefined) {
				output[offset + 1] = rightSample + amplitude * right;
			}
		}
	}
	return output;
}
