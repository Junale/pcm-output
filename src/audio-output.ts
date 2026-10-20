import { dlopen, FFIType, suffix } from "bun:ffi";
import { join } from "node:path";
import type { AudioOutputOptions } from "./types.ts";

const lib = dlopen(join(import.meta.dir, `../native/libpcm-output.${suffix}`), {
	audio_init: {
		args: [FFIType.i32, FFIType.i32],
		returns: FFIType.i32,
	},
	audio_write: {
		args: [FFIType.ptr, FFIType.u32],
		returns: FFIType.i32,
	},
	audio_close: {
		args: [],
		returns: FFIType.void,
	},
});

export class AudioOutput {
	private closed = false;
	private readonly channels: number;

	constructor(options: AudioOutputOptions = {}) {
		const sampleRate = options.sampleRate ?? 48000;
		const channels = options.channels ?? 2;

		if (!Number.isInteger(sampleRate) || sampleRate <= 0) {
			throw new RangeError("sampleRate must be a positive integer");
		}

		if (channels !== 1 && channels !== 2) {
			throw new RangeError("channels must be 1 or 2");
		}

		const result = lib.symbols.audio_init(sampleRate, channels);
		if (result !== 0) {
			throw new Error(`audio_init failed: ${result}`);
		}

		this.channels = channels;
	}

	write(samples: Float32Array): void {
		if (this.closed) {
			throw new Error("AudioOutput is closed");
		}

		if (samples.length % this.channels !== 0) {
			throw new RangeError(
				`Sample count must be divisible by ${this.channels}`,
			);
		}

		const result = lib.symbols.audio_write(samples, samples.length);
		if (result !== samples.length) {
			throw new Error(`audio_write failed: ${result}`);
		}
	}

	close(): void {
		if (this.closed) return;

		this.closed = true;
		lib.symbols.audio_close();
	}
}
