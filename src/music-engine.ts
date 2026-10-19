import { AudioOutput } from "./audio-output.ts";
import { DEFAULT_INSTRUMENT, NOTE_OFFSETS } from "./constants.ts";
import type { Music, MusicEngineOptions, RenderOptions, Voice, Waveform } from "./types.ts";

function noteToFrequency(note: string): number {
	const match = /^([A-Ga-g])([#b]?)(-?\d+)$/.exec(note);
	if (!match) throw new Error(`Invalid note: ${note}`);
	const [, letter, accidental, octaveText] = match;
	if (!letter || accidental === undefined || !octaveText) throw new Error(`Invalid note: ${note}`);

	const pitch = NOTE_OFFSETS[`${letter.toUpperCase()}${accidental}`];
	const octave = Number(octaveText);
	if (pitch === undefined || !Number.isInteger(octave)) throw new Error(`Invalid note: ${note}`);
	return 440 * 2 ** ((octave * 12 + pitch - 57) / 12);
}

function waveformSample(waveform: Waveform, phase: number): number {
	switch (waveform) {
		case "square":
			return phase < Math.PI ? 1 : -1;
		case "saw":
			return 1 - phase / Math.PI;
		case "triangle":
			return 1 - 4 * Math.abs(Math.round(phase / (2 * Math.PI)) - phase / (2 * Math.PI));
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

function renderMusic(music: Music, options: RenderOptions): Float32Array {
	if (music.bpm <= 0) throw new Error("Music BPM must be greater than zero");
	const secondsPerBeat = 60 / music.bpm;
	const voices: Voice[] = [];
	let totalSamples = 0;

	for (const track of music.tracks) {
		const instrument = { ...DEFAULT_INSTRUMENT, ...track.instrument };
		for (const event of track.events) {
			if (event.start < 0 || event.duration <= 0) {
				throw new Error("Note events need a non-negative start and positive duration");
			}

			const startSample = Math.round(event.start * secondsPerBeat * options.sampleRate);
			const endSample = Math.round((event.start + event.duration) * secondsPerBeat * options.sampleRate);
			const releaseEnd = endSample + Math.ceil(instrument.release * options.sampleRate);
			voices.push({
				startSample,
				endSample,
				frequency: noteToFrequency(event.note),
				velocity: Math.max(0, Math.min(1, event.velocity ?? 1)),
				pan: Math.max(-1, Math.min(1, event.pan ?? 0)),
				instrument,
				phase: 0,
			});
			totalSamples = Math.max(totalSamples, releaseEnd);
		}
	}

	const output = new Float32Array(totalSamples * options.channels);
	for (const voice of voices) {
		const left = Math.cos((voice.pan + 1) * Math.PI / 4);
		const right = Math.sin((voice.pan + 1) * Math.PI / 4);
		const voiceEnd = voice.endSample + voice.instrument.release * options.sampleRate;

		for (let sample = voice.startSample; sample < voiceEnd; sample++) {
			const amplitude = waveformSample(voice.instrument.waveform, voice.phase)
				* voice.instrument.amplitude
				* voice.velocity
				* envelope(voice, sample, options.sampleRate);
			voice.phase = (voice.phase + 2 * Math.PI * voice.frequency / options.sampleRate) % (2 * Math.PI);

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

export class MusicEngine {
	private readonly output: AudioOutput;
	private readonly options: RenderOptions;
	private timer: ReturnType<typeof setInterval> | undefined;

	constructor(options: MusicEngineOptions = {}) {
		this.options = {
			sampleRate: options.sampleRate ?? 48000,
			channels: options.channels ?? 2,
		};
		this.output = new AudioOutput(this.options);
	}

	play(music: Music): void {
		this.stop();
		const samples = renderMusic(music, this.options);
		const chunkSamples = Math.floor(this.options.sampleRate / 100) * this.options.channels;
		let offset = 0;
		const writeChunk = () => {
			if (offset >= samples.length) {
				if (!music.loop) {
					this.stop();
					return;
				}
				offset = 0;
			}
			this.output.write(samples.subarray(offset, offset + chunkSamples));
			offset += chunkSamples;
		};

		writeChunk();
		this.timer = setInterval(writeChunk, 10);
	}

	stop(): void {
		if (this.timer !== undefined) {
			clearInterval(this.timer);
			this.timer = undefined;
		}
	}

	close(): void {
		this.stop();
		this.output.close();
	}
}
