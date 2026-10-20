import { AudioOutput } from "./audio-output.ts";
import { renderMusic } from "./renderer.ts";
import type { MusicEngineOptions, RenderOptions, Track } from "./types.ts";

function createFloatWav(
	samples: Float32Array,
	sampleRate: number,
	channels: number,
): Uint8Array {
	const dataSize = samples.byteLength;
	const buffer = new ArrayBuffer(44 + dataSize);
	const view = new DataView(buffer);
	const bytes = new Uint8Array(buffer);

	const writeText = (offset: number, text: string): void => {
		for (let i = 0; i < text.length; i++) {
			view.setUint8(offset + i, text.charCodeAt(i));
		}
	};

	writeText(0, "RIFF");
	view.setUint32(4, 36 + dataSize, true);
	writeText(8, "WAVE");
	writeText(12, "fmt ");
	view.setUint32(16, 16, true);
	view.setUint16(20, 3, true);
	view.setUint16(22, channels, true);
	view.setUint32(24, sampleRate, true);
	view.setUint32(28, sampleRate * channels * 4, true);
	view.setUint16(32, channels * 4, true);
	view.setUint16(34, 32, true);
	writeText(36, "data");
	view.setUint32(40, dataSize, true);
	bytes.set(new Uint8Array(samples.buffer, samples.byteOffset, dataSize), 44);

	return bytes;
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

	async writeWav(path: string, music: Track): Promise<void> {
		const samples = renderMusic(music, this.options);
		await Bun.write(
			path,
			createFloatWav(samples, this.options.sampleRate, this.options.channels),
		);
	}

	play(music: Track): void {
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
