import { describe, expect, test } from "bun:test";
import { unlink } from "node:fs/promises";
import { MusicEngine } from "../src/music-engine.ts";
import { staff, track } from "./mocks.ts";

describe("MusicEngine WAV output", () => {
	test("writes interleaved 32-bit float WAV data", async () => {
		const path = `/tmp/pcm-output-${crypto.randomUUID()}.wav`;
		const engine = new MusicEngine({ sampleRate: 100, channels: 1 });

		try {
			await engine.writeWav(path, track([{ staffs: [staff(0, 1)] }]));

			const file = await Bun.file(path).arrayBuffer();
			const view = new DataView(file);
			const text = (offset: number, length: number) =>
				new TextDecoder().decode(new Uint8Array(file, offset, length));

			expect(text(0, 4)).toBe("RIFF");
			expect(text(8, 4)).toBe("WAVE");
			expect(view.getUint16(20, true)).toBe(3);
			expect(view.getUint16(22, true)).toBe(1);
			expect(view.getUint32(24, true)).toBe(100);
			expect(view.getUint16(34, true)).toBe(32);
			expect(view.getUint32(40, true)).toBe(410 * Float32Array.BYTES_PER_ELEMENT);
		} finally {
			engine.close();
			await unlink(path);
		}
	});
});
