import { describe, expect, test } from "bun:test";
import { renderMusic } from "../src/renderer.ts";
import { options, staff, track } from "./mocks.ts";

describe("renderMusic", () => {
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
