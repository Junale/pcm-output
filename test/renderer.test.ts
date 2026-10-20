import { describe, expect, test } from "bun:test";
import { renderMusic } from "../src/renderer.ts";
import type { Instrument } from "../src/types.ts";
import { options, staff, track } from "./mocks.ts";

const synthesisOptions = { sampleRate: 10_000, channels: 1 };

function synthesisStaff(instrument: Instrument, duration = 1, velocity = 1) {
	return {
		instrument,
		octaveStart: -1,
		events: [{ start: 0, duration, noteIndex: 0, effect: { velocity } }],
	};
}

function instrument(
	partials: Instrument["partials"],
	response: Instrument["velocityResponse"] = { volume: 1, brightness: 0 },
): Instrument {
	return {
		amplitude: 1,
		partials,
		envelope: { attack: 0, decay: 1000, release: 0, curve: "exponential" },
		velocityResponse: response,
	};
}

function projection(samples: Float32Array, frequency: number): number {
	let sum = 0;
	for (let index = 100; index < samples.length; index++) {
		sum += (samples[index] ?? 0) * Math.sin((2 * Math.PI * frequency * index) / 10_000);
	}
	return Math.abs(sum);
}

function rms(samples: Float32Array, start: number, end: number): number {
	let sum = 0;
	for (let index = start; index < end; index++) {
		const sample = samples[index] ?? 0;
		sum += sample * sample;
	}
	return Math.sqrt(sum / (end - start));
}

describe("renderMusic", () => {
	test("renders all partials instead of only the fundamental", () => {
		const fundamental = renderMusic(
			track([{ staffs: [synthesisStaff(instrument([{ ratio: 1, level: 1, waveform: "sine" }]))] }]),
			synthesisOptions,
		);
		const harmonics = renderMusic(
			track([
				{
					staffs: [
						synthesisStaff(instrument([
							{ ratio: 1, level: 1, waveform: "sine" },
							{ ratio: 2, level: 1, waveform: "sine" },
						]))],
				},
			]),
			synthesisOptions,
		);

		expect(harmonics[10]).not.toBeCloseTo(fundamental[10] ?? 0, 5);
	});

	test("uses partial ratios and detuning to set oscillator pitch", () => {
		const fundamental = renderMusic(
			track([{ staffs: [synthesisStaff(instrument([{ ratio: 1, level: 1, waveform: "sine" }]))] }]),
			synthesisOptions,
		);
		const octave = renderMusic(
			track([{ staffs: [synthesisStaff(instrument([{ ratio: 2, level: 1, waveform: "sine" }]))] }]),
			synthesisOptions,
		);
		const detuned = renderMusic(
			track([
				{
					staffs: [
						synthesisStaff(instrument([{ ratio: 1, level: 1, waveform: "sine", detuneCents: 1200 }]))],
				},
			]),
			synthesisOptions,
		);

		expect(octave[10]).toBeCloseTo(fundamental[20] ?? 0, 2);
		expect(detuned[10]).toBeCloseTo(octave[10] ?? 0, 2);
	});

	test("maps velocity to loudness and harmonic brightness", () => {
		const response = { volume: 1, brightness: 1 };
		const soft = renderMusic(
			track([{ staffs: [synthesisStaff(instrument([
				{ ratio: 1, level: 1, waveform: "sine" },
				{ ratio: 2, level: 1, waveform: "sine" },
			], response), 0.5, 0.2)] }]),
			synthesisOptions,
		);
		const hard = renderMusic(
			track([{ staffs: [synthesisStaff(instrument([
				{ ratio: 1, level: 1, waveform: "sine" },
				{ ratio: 2, level: 1, waveform: "sine" },
			], response), 0.5, 1)] }]),
			synthesisOptions,
		);

		expect(Math.max(...hard.map(Math.abs))).toBeGreaterThan(Math.max(...soft.map(Math.abs)));
		expect(projection(hard, 261.624)).toBeGreaterThan(projection(soft, 261.624));
	});

	test("keeps exponential decay falling during a held note", () => {
		const samples = renderMusic(
			track([{ staffs: [synthesisStaff({
				...instrument([{ ratio: 1, level: 1, waveform: "sine" }]),
				envelope: { attack: 0, decay: 1, release: 0, curve: "exponential" },
			}, 1)] }]),
			synthesisOptions,
		);

		expect(rms(samples, 100, 1_000)).toBeGreaterThan(rms(samples, 5_000, 6_000));
	});

	test("starts release at the current envelope level", () => {
		const samples = renderMusic(
			track([{ staffs: [synthesisStaff({
				...instrument([{ ratio: 1, level: 1, waveform: "sine" }]),
				envelope: { attack: 0, decay: 2, release: 1, curve: "exponential" },
			}, 0.5)] }]),
			synthesisOptions,
		);

		expect(rms(samples, 4_800, 5_000)).toBeGreaterThan(0);
		expect(rms(samples, 5_000, 6_000)).toBeGreaterThan(rms(samples, 14_000, 15_000));
	});

	test("uses BPM and note duration for sample timing", () => {
		const samples = renderMusic(track([{ staffs: [staff(0, 1)] }]), options);

		expect(samples.length).toBe(410);
		expect(samples[0]).toBe(0);
		expect(Math.abs(samples[1] ?? 0)).toBeGreaterThan(0);
	});

	test("repeats a stack without changing the iteration duration", () => {
		const samples = renderMusic(
			track([{ iterations: 2, staffs: [staff(0, 1)] }]),
			options,
		);

		expect(samples.length).toBe(810);
		expect(Math.abs(samples[401] ?? 0)).toBeGreaterThan(0);
	});

	test("starts the next stack after the previous stack repetitions", () => {
		const samples = renderMusic(
			track([
				{ iterations: 2, staffs: [staff(0, 1)] },
				{ staffs: [staff(1, 1)] },
			]),
			options,
		);

		expect(samples.length).toBe(1210);
		expect(Math.abs(samples[801] ?? 0)).toBeGreaterThan(0);
	});

	test("maps noteIndex through the selected scale", () => {
		const major = renderMusic(track([{ staffs: [staff(2)] }]), options);
		const minor = renderMusic(
			track([{ staffs: [{ ...staff(2), scale: "minor" }] }]),
			options,
		);

		expect(major[1]).not.toBe(minor[1]);
	});

	test("supports negative noteIndex values by descending the scale", () => {
		const belowRoot = renderMusic(
			track([{ staffs: [staff(-1)] }]),
			options,
		);
		const equivalentLowerOctave = renderMusic(
			track([
				{
					staffs: [
						{
							...staff(6),
							octaveStart: -2,
						},
					],
				},
			]),
			options,
		);

		expect(belowRoot[1]).toBeCloseTo(equivalentLowerOctave[1] ?? 0, 6);
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
		expect(() =>
			renderMusic(track([{ staffs: [staff(0, 0)] }]), options),
		).toThrow();
		expect(() =>
			renderMusic(track([{ iterations: 1.5, staffs: [staff(0)] }]), options),
		).toThrow();
		expect(() => renderMusic({ ...track([]), bpm: 0 }, options)).toThrow();
	});

	test("allows event timing beyond one four-beat block", () => {
		expect(() =>
			renderMusic(track([{ staffs: [staff(0, 4.01)] }]), options),
		).not.toThrow();
	});

	test("expands a stack into four-beat staff blocks", () => {
		const samples = renderMusic(
			track([
				{
					staffs: [
						{
							...staff(0, 1),
							events: [0, 1, 2, 3, 4, 5].map((start) => ({
								start,
								duration: 1,
								noteIndex: 0,
							})),
						},
					],
				},
			]),
			options,
		);

		expect(samples.length).toBe(810);
		expect(Math.abs(samples[401] ?? 0)).toBeGreaterThan(0);
		expect(Math.abs(samples[501] ?? 0)).toBeGreaterThan(0);
	});

	test("allows events to cross four-beat staff boundaries", () => {
		const samples = renderMusic(
			track([
				{
					staffs: [
						{
							...staff(0),
							events: [{ start: 3.5, duration: 1, noteIndex: 0 }],
						},
					],
				},
			]),
			options,
		);

		expect(samples.length).toBe(810);
	});

	test("repeats shorter staffs to fill the longest staff", () => {
		const samples = renderMusic(
			track([
				{
					staffs: [
						{
							...staff(0),
							events: [
								{ start: 0, duration: 1, noteIndex: 0 },
								{ start: 4, duration: 1, noteIndex: 1 },
							],
						},
						staff(1),
					],
				},
			]),
			options,
		);

		expect(samples.length).toBe(810);
		expect(Math.abs(samples[1] ?? 0)).toBeGreaterThan(0);
		expect(Math.abs(samples[401] ?? 0)).toBeGreaterThan(0);
	});

	test("keeps the next stack aligned to the four-beat staff boundary", () => {
		const samples = renderMusic(
			track([
				{
					staffs: [
						{
							...staff(0, 0.5),
							events: [{ start: 3, duration: 0.5, noteIndex: 0 }],
						},
					],
				},
				{ staffs: [staff(1, 1)] },
			]),
			options,
		);

		expect(samples.length).toBe(810);
	});

	test("does not include release padding in a looping track", () => {
		const samples = renderMusic(
			{ ...track([{ staffs: [staff(0, 1)] }]), loop: true },
			options,
		);

		expect(samples.length).toBe(400);
	});
});
