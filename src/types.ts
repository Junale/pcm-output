export type Waveform = "sine" | "square" | "saw" | "triangle" | "noise";

export type Instrument = {
	waveform: Waveform;
	amplitude?: number;
	attack?: number;
	decay?: number;
	sustain?: number;
	release?: number;
};

export type NoteEvent = {
	start: number;
	duration: number;
	note: string;
	velocity?: number;
	pan?: number;
};

export type Track = {
	instrument: Instrument;
	events: NoteEvent[];
};

export type Music = {
	bpm: number;
	loop: boolean;
	tracks: Track[];
};

export type MusicEngineOptions = {
	sampleRate?: number;
	channels?: number;
};

export type AudioOutputOptions = {
	sampleRate?: number;
	channels?: number;
};

export type RenderOptions = {
	sampleRate: number;
	channels: number;
};

export type Voice = {
	startSample: number;
	endSample: number;
	frequency: number;
	velocity: number;
	pan: number;
	instrument: Required<Instrument>;
	phase: number;
};
