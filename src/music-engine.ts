import { AudioOutput } from "./audio-output.ts";
import { renderMusic } from "./renderer.ts";
import type { MusicEngineOptions, RenderOptions, Track } from "./types.ts";

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
