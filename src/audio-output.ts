import { dlopen, FFIType, suffix } from "bun:ffi";
import { join } from "node:path";
import type { AudioOutputOptions } from "./types.ts";

const lib = dlopen(join(import.meta.dir, `../native/libpcm-output.${suffix}`), {
	audio_init: {
		args: [FFIType.i32, FFIType.i32],
		returns: FFIType.void,
	},
	audio_write: {
		args: [FFIType.ptr, FFIType.u32],
		returns: FFIType.void,
	},
	audio_close: {
		args: [],
		returns: FFIType.void,
	},
});

export class AudioOutput {
	constructor(options: AudioOutputOptions = {}) {
		lib.symbols.audio_init(options.sampleRate ?? 48000, options.channels ?? 2);
	}

	write(samples: Float32Array): void {
		lib.symbols.audio_write(samples, samples.length);
	}

	close(): void {
		lib.symbols.audio_close();
	}
}
