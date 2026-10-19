import { describe, expect, test } from "bun:test";
import { renderMusic } from "../src/renderer.ts";
import type { RenderOptions, Track } from "../src/types.ts";

const options: RenderOptions = { sampleRate: 100, channels: 1 };

function track(sequence: Track["sequence"], bpm = 60): Track {
	return { bpm, loop: false, sequence };
}

function staff(noteIndex: number, duration = 1, effect?: { velocity?: number; pan?: number }) {
	return {
		instrument: {
			waveform: "sine" as const,
			amplitude: 1,
			attack: 0,
			decay: 0,
			sustain: 1,
			release: 0.1,
		},
		octaveStart: -1,
		events: [{ start: 0, duration, noteIndex, effect }],
	};
}

describe("renderMusic", () => {
	test("uses BPM and note duration for sample timing", () => {
		const samples = renderMusic(track([{ staffs: [staff(0, 1)] }]), options);

		expect(samples.length).toBe(110);
		expect(samples[0]).toBe(0);
		expect(Math.abs(samples[1] ?? 0)).toBeGreaterThan(0);
	});

	test("repeats a stack without changing the iteration duration", () => {
		const samples = renderMusic(
			track([{ itterations: 2, staffs: [staff(0, 1)] }]),
			options,
		);

		expect(samples.length).toBe(210);
		expect(Math.abs(samples[100] ?? 0)).toBeGreaterThan(0);
		expect(Math.abs(samples[101] ?? 0)).toBeGreaterThan(0);
	});

	test("starts the next stack after the previous stack repetitions", () => {
		const samples = renderMusic(
			track([
				{ itterations: 2, staffs: [staff(0, 1)] },
				{ staffs: [staff(1, 1)] },
			]),
			options,
		);

		expect(samples.length).toBe(310);
		expect(Math.abs(samples[201] ?? 0)).toBeGreaterThan(0);
	});

	test("maps noteIndex through the selected scale", () => {
		const major = renderMusic(track([{ staffs: [staff(2)] }]), options);
		const minor = renderMusic(track([{ staffs: [{ ...staff(2), scale: "minor" }] }]), options);

		expect(major[1]).not.toBe(minor[1]);
	});

	test("applies event velocity and pan effects", () => {
		const samples = renderMusic(
			track([{ staffs: [staff(0, 1, { velocity: 0.5, pan: 1 })] }]),
			{ sampleRate: 100, channels: 2 },
		);

		expect(samples[1]).toBeCloseTo(0, 6);
		expect(Math.abs(samples[2] ?? 0)).toBeGreaterThan(0);
	});

	test("rejects invalid timing values", () => {
		expect(() => renderMusic(track([{ staffs: [staff(0, 0)] }]), options)).toThrow();
		expect(() => renderMusic(track([{ itterations: 1.5, staffs: [staff(0)] }]), options)).toThrow();
		expect(() => renderMusic({ ...track([]), bpm: 0 }, options)).toThrow();
	});
});
