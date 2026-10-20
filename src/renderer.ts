import {
	NOTE_OFFSETS,
	SCALE_INTERVALS,
	STAFF_BEATS,
} from "./constants.ts";
import type {
	Effect,
	Instrument,
	Partial,
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
	if (!Number.isInteger(noteIndex))
		throw new Error("noteIndex must be an integer");
	const intervals = SCALE_INTERVALS[scale];
	const octaveOffset = Math.floor(noteIndex / intervals.length);
	const scaleIndex =
		((noteIndex % intervals.length) + intervals.length) % intervals.length;
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

function validateInstrument(instrument: Instrument): void {
	if (!Number.isFinite(instrument.amplitude) || instrument.amplitude < 0) {
		throw new Error("Instrument amplitude must be a non-negative number");
	}
	if (instrument.partials.length === 0) {
		throw new Error("Instrument needs at least one partial");
	}
	for (const partial of instrument.partials) {
		if (!Number.isFinite(partial.ratio) || partial.ratio <= 0) {
			throw new Error("Partial ratios must be positive numbers");
		}
		if (!Number.isFinite(partial.level) || partial.level < 0) {
			throw new Error("Partial levels must be non-negative numbers");
		}
		if (
			partial.detuneCents !== undefined &&
			!Number.isFinite(partial.detuneCents)
		) {
			throw new Error("Partial detuning must be a finite number");
		}
	}
	const { attack, decay, release, curve } = instrument.envelope;
	if (
		![attack, decay, release].every(Number.isFinite) ||
		attack < 0 ||
		decay < 0 ||
		release < 0 ||
		(curve !== "linear" && curve !== "exponential")
	) {
		throw new Error("Envelope times must be non-negative and curve must be valid");
	}
	const { volume, brightness } = instrument.velocityResponse;
	if (
		![volume, brightness].every(Number.isFinite) ||
		volume < 0 ||
		volume > 1 ||
		brightness < 0 ||
		brightness > 1
	) {
		throw new Error("Velocity response values must be between zero and one");
	}
}

function envelopeLevel(voice: Voice, elapsed: number): number {
	const { attack, decay, curve } = voice.instrument.envelope;
	if (attack > 0 && elapsed < attack) return elapsed / attack;
	const decayElapsed = Math.max(0, elapsed - attack);
	if (decay === 0) return 0;
	if (curve === "linear") return Math.max(0, 1 - decayElapsed / decay);
	return Math.exp((-5 * decayElapsed) / decay);
}

function envelope(voice: Voice, sample: number, sampleRate: number): number {
	const elapsed = (sample - voice.startSample) / sampleRate;
	const duration = (voice.endSample - voice.startSample) / sampleRate;
	if (elapsed < duration) return envelopeLevel(voice, elapsed);
	const releaseElapsed = elapsed - duration;
	const release = voice.instrument.envelope.release;
	if (release === 0) return 0;
	return envelopeLevel(voice, duration) * Math.exp((-5 * releaseElapsed) / release);
}

function preparePartials(
	voice: Voice,
): { partial: Partial; level: number; frequency: number }[] {
	const brightness = voice.instrument.velocityResponse.brightness;
	const maximumRatio = Math.max(
		...voice.instrument.partials.map((partial) => partial.ratio),
	);
	const adjustedLevels = voice.instrument.partials.map((partial) =>
		partial.level *
			(1 + brightness * voice.velocity * (partial.ratio / maximumRatio)),
	);
	const levelTotal = adjustedLevels.reduce((sum, level) => sum + level, 0);
	if (levelTotal === 0) return [];
	return voice.instrument.partials.map((partial, index) => ({
		partial,
		level: (adjustedLevels[index] ?? 0) / levelTotal,
		frequency:
			voice.frequency *
			partial.ratio *
			2 ** ((partial.detuneCents ?? 0) / 1200),
	}));
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
	const staffBlockCounts = stack.staffs.map((staff) => {
		let blockCount = 1;
		for (const event of staff.events) {
			if (event.start < 0 || event.duration <= 0) {
				throw new Error(
					"Note events need a non-negative start and positive duration",
				);
			}
			blockCount = Math.max(
				blockCount,
				Math.ceil((event.start + event.duration) / STAFF_BEATS),
			);
		}
		return blockCount;
	});
	const staffCount = Math.max(1, ...staffBlockCounts);

	const itterations = stack.iterations ?? 1;
	if (!Number.isInteger(itterations) || itterations < 0) {
		throw new Error("Stack itterations must be a non-negative integer");
	}

	for (let iteration = 0; iteration < itterations; iteration++) {
		const iterationStart =
			stackStart + iteration * STAFF_BEATS * staffCount;
		for (const [staffIndex, staff] of stack.staffs.entries()) {
			const scale = staff.scale ?? "major";
			const noteStart = staff.noteStart ?? "C";
			const octaveStart = staff.octaveStart ?? 4;
			const instrument = staff.instrument;
			validateInstrument(instrument);
			const blockCount = staffBlockCounts[staffIndex] ?? 1;
			const repeats = Math.ceil(staffCount / blockCount);
			for (let repeat = 0; repeat < repeats; repeat++) {
				const repeatStart = iterationStart + repeat * blockCount * STAFF_BEATS;
				for (const event of staff.events) {
					const effect = mergeEffects(
						trackEffect,
						stack.effect,
						staff.effect,
						event.effect,
					);
					const startBeat = repeatStart + event.start;
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
						phase: instrument.partials.map(() => 0),
					});
				}
			}
		}
	}
	return STAFF_BEATS * staffCount * itterations;
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
						Math.ceil(
							voice.instrument.envelope.release * options.sampleRate,
						),
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
			voice.endSample + voice.instrument.envelope.release * options.sampleRate;
		const partials = preparePartials(voice);
		const velocityGain =
			voice.velocity * voice.instrument.velocityResponse.volume;

		for (let sample = voice.startSample; sample < voiceEnd; sample++) {
			let sampleValue = 0;
			for (const [index, { partial, level, frequency }] of partials.entries()) {
				const phase = voice.phase[index] ?? 0;
				sampleValue += level * waveformSample(partial.waveform, phase);
				voice.phase[index] =
					(phase + (2 * Math.PI * frequency) / options.sampleRate) %
					(2 * Math.PI);
			}
			const amplitude =
				sampleValue * voice.instrument.amplitude * velocityGain * envelope(voice, sample, options.sampleRate);

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
