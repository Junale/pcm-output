import { AudioOutput } from "pcm-output";

const audio = new AudioOutput();

let phase = 0;

setInterval(() => {
	const samples = new Float32Array(48000 / 100);

	for (let i = 0; i < samples.length; i++) {
		samples[i] = Math.sin(phase) * 0.2;

		phase += (2 * Math.PI * 440) / 48000;
	}

	audio.write(samples);
}, 10);
